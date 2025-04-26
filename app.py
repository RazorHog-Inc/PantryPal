from flask import Flask, render_template, request, redirect, url_for, jsonify, session, flash
from functools import wraps
import os
import json
from datetime import datetime, timedelta
import pyrebase
from apscheduler.schedulers.background import BackgroundScheduler
from utils.email_sender import send_expiry_notification
from utils.db import initialize_db, get_db_reference
from config import config

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Initialize Firebase
firebase = pyrebase.initialize_app(config)
auth = firebase.auth()
db = firebase.database()

# Initialize scheduler for expiration check
scheduler = BackgroundScheduler()
scheduler.start()

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Routes
@app.route('/')
def index():
    if 'user' in session:
        return redirect(url_for('pantry'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        try:
            user = auth.sign_in_with_email_and_password(email, password)
            session['user'] = user
            return redirect(url_for('pantry'))
        except Exception as e:
            error_message = json.loads(e.args[1])['error']['message']
            if error_message == 'EMAIL_NOT_FOUND':
                flash('Email not found. Please register.')
            elif error_message == 'INVALID_PASSWORD':
                flash('Invalid password. Please try again.')
            else:
                flash('Login failed. Please try again.')
            return render_template('login.html')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        try:
            user = auth.create_user_with_email_and_password(email, password)
            session['user'] = user
            
            # Initialize user data in the database
            user_id = user['localId']
            
            try:
                # Separate database operations into different try blocks
                # to handle different types of errors
                db.child("users").child(user_id).child("profile").set({
                    "email": email,
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })
                
                db.child("users").child(user_id).child("pantry").set({})
                db.child("users").child(user_id).child("grocery").set({})
                
                return redirect(url_for('pantry'))
            
            except Exception as db_error:
                # Handle database errors
                print(f"Database error: {db_error}")
                flash('Account created but failed to initialize user data. Please contact support.')
                return redirect(url_for('pantry'))
                
        except Exception as e:
            # Handle auth errors
            error_json = None
            try:
                if hasattr(e, 'args') and len(e.args) > 1:
                    error_json = json.loads(e.args[1])
                    if 'error' in error_json and 'message' in error_json['error']:
                        error_message = error_json['error']['message']
                    else:
                        error_message = "Registration failed. Please try again."
                else:
                    error_message = "Registration failed. Please try again."
            except:
                error_message = "Registration failed. Please try again."
                
            if error_message == 'EMAIL_EXISTS':
                flash('Email already exists. Please login.')
            else:
                flash(f'Registration failed: {error_message}')
            return render_template('login.html')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('index'))

@app.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    user_id = session['user']['localId']
    user_token = session['user']['idToken']
    if request.method == 'POST':
        email_notification = request.form.get('email_notification') == 'on'
        notification_days = int(request.form.get('notification_days', 3))
        
        # Update user settings in the database
        db.child("users").child(user_id).child("settings").update({
            "email_notification": email_notification,
            "notification_days": notification_days
        }, token=user_token)
        flash('Settings updated successfully')
        
    # Get user settings from the database
    settings = db.child("users").child(user_id).child("settings").get(token=user_token).val()
    if not settings:
        settings = {
            "email_notification": True,
            "notification_days": 3
        }
        db.child("users").child(user_id).child("settings").set(settings, token=user_token)
    
    return render_template('settings.html', settings=settings)

@app.route('/pantry')
@login_required
def pantry():
    return render_template('pantry.html')

@app.route('/grocery')
@login_required
def grocery():
    return render_template('grocery.html')

# API Routes
@app.route('/api/pantry', methods=['GET'])
@login_required
def get_pantry_items():
    user_id = session['user']['localId']
    user_token = session['user']['idToken']  # Get the user token from session
    
    try:
        # Pass the token with your database request
        pantry_items = db.child("users").child(user_id).child("pantry").get(token=user_token).val()
        if not pantry_items:
            return jsonify([])
        
        items_list = []
        for item_id, item_data in pantry_items.items():
            item_data['id'] = item_id
            items_list.append(item_data)
        
        return jsonify(items_list)
    except Exception as e:
        print(f"Error fetching pantry items: {e}")
        return jsonify({"error": "Failed to fetch pantry items"}), 500

@app.route('/api/pantry', methods=['POST'])
@login_required
def add_pantry_item():
    user_id = session['user']['localId']
    user_token = session['user']['idToken']
    data = request.json
    
    new_item = {
        "name": data.get('name'),
        "quantity": data.get('quantity', 1),
        "unit": data.get('unit', ''),
        "category": data.get('category', 'Other'),
        "expiry_date": data.get('expiry_date', ''),
        "added_date": datetime.now().strftime("%Y-%m-%d")
    }
    
    item_id = db.child("users").child(user_id).child("pantry").push(new_item, token=user_token)
    new_item['id'] = item_id['name']
    
    # Schedule expiry check if expiry date is set
    if new_item['expiry_date']:
        schedule_expiry_check(user_id)
    
    return jsonify(new_item)

@app.route('/api/pantry/<item_id>', methods=['PUT'])
@login_required
def update_pantry_item(item_id):
    user_id = session['user']['localId']
    user_token = session['user']['idToken']
    data = request.json
    
    update_data = {
        "name": data.get('name'),
        "quantity": data.get('quantity', 1),
        "unit": data.get('unit', ''),
        "category": data.get('category', 'Other'),
        "expiry_date": data.get('expiry_date', ''),
    }
    
    db.child("users").child(user_id).child("pantry").child(item_id).update(update_data, token=user_token)
    update_data['id'] = item_id
    
    # Reschedule expiry check as expiry date might have changed
    schedule_expiry_check(user_id)
    
    return jsonify(update_data)

@app.route('/api/pantry/<item_id>', methods=['DELETE'])
@login_required
def delete_pantry_item(item_id):
    user_id = session['user']['localId']
    user_token = session['user']['idToken']
    db.child("users").child(user_id).child("pantry").child(item_id).remove(token=user_token)
    return jsonify({"success": True})

@app.route('/api/grocery', methods=['GET'])
@login_required
def get_grocery_items():
    user_id = session['user']['localId']
    user_token = session['user']['idToken']
    grocery_items = db.child("users").child(user_id).child("grocery").get(token=user_token).val()
    if not grocery_items:
        return jsonify([])
    
    items_list = []
    for item_id, item_data in grocery_items.items():
        item_data['id'] = item_id
        items_list.append(item_data)
    
    return jsonify(items_list)

@app.route('/api/grocery', methods=['POST'])
@login_required
def add_grocery_item():
    user_id = session['user']['localId']
    user_token = session['user']['idToken']
    data = request.json
    
    new_item = {
        "name": data.get('name'),
        "quantity": data.get('quantity', 1),
        "unit": data.get('unit', ''),
        "category": data.get('category', 'Other'),
        "completed": False,
        "added_date": datetime.now().strftime("%Y-%m-%d")
    }
    
    item_id = db.child("users").child(user_id).child("grocery").push(new_item, token=user_token)
    new_item['id'] = item_id['name']
    
    return jsonify(new_item)

@app.route('/api/grocery/<item_id>', methods=['PUT'])
@login_required
def update_grocery_item(item_id):
    user_id = session['user']['localId']
    user_token = session['user']['idToken']
    data = request.json
    
    update_data = {
        "name": data.get('name'),
        "quantity": data.get('quantity', 1),
        "unit": data.get('unit', ''),
        "category": data.get('category', 'Other'),
        "completed": data.get('completed', False)
    }
    
    db.child("users").child(user_id).child("grocery").child(item_id).update(update_data, token=user_token)
    update_data['id'] = item_id
    
    # If an item is marked as completed and has an expiry date, add it to the pantry
    if data.get('completed') and data.get('add_to_pantry', False) and data.get('expiry_date'):
        pantry_item = {
            "name": data.get('name'),
            "quantity": data.get('quantity', 1),
            "unit": data.get('unit', ''),
            "category": data.get('category', 'Other'),
            "expiry_date": data.get('expiry_date', ''),
            "added_date": datetime.now().strftime("%Y-%m-%d")
        }
        
        db.child("users").child(user_id).child("pantry").push(pantry_item, token=user_token)
        
        # Schedule expiry check for the new pantry item
        schedule_expiry_check(user_id)
    
    return jsonify(update_data)

@app.route('/api/grocery/<item_id>', methods=['DELETE'])
@login_required
def delete_grocery_item(item_id):
    user_id = session['user']['localId']
    user_token = session['user']['idToken']
    db.child("users").child(user_id).child("grocery").child(item_id).remove(token=user_token)
    return jsonify({"success": True})

@app.route('/firebase-config')
def firebase_config():
    # Only send necessary configuration for the client
    client_config = {
        "apiKey": config["apiKey"],
        "authDomain": config["authDomain"],
        "databaseURL": config["databaseURL"],
        "projectId": config["projectId"],
        "storageBucket": config["storageBucket"],
        "messagingSenderId": config["messagingSenderId"],
        "appId": config["appId"]
    }
    return jsonify(client_config)

# Function to schedule expiry check
def schedule_expiry_check(user_id):
    # Clear any existing job for this user
    for job in scheduler.get_jobs():
        if job.id == f"expiry_check_{user_id}":
            scheduler.remove_job(job.id)
    
    # Schedule a new job to run daily
    scheduler.add_job(
        check_expiry_dates,
        'interval',
        days=1,
        id=f"expiry_check_{user_id}",
        args=[user_id],
        next_run_time=datetime.now()
    )

def check_environment_variables():
    """Verify all required environment variables are set"""
    missing_vars = []
    
    # Check Firebase variables
    firebase_vars = [
        "FIREBASE_API_KEY", "FIREBASE_AUTH_DOMAIN", "FIREBASE_DATABASE_URL",
        "FIREBASE_PROJECT_ID", "FIREBASE_STORAGE_BUCKET",
        "FIREBASE_MESSAGING_SENDER_ID", "FIREBASE_APP_ID"
    ]
    
    # Check Email variables
    email_vars = [
        "EMAIL_SMTP_SERVER", "EMAIL_SMTP_PORT", "EMAIL_USERNAME", "EMAIL_PASSWORD"
    ]
    
    # Check all variables
    for var in firebase_vars + email_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("WARNING: The following environment variables are missing:")
        for var in missing_vars:
            print(f"  - {var}")
        print("Please check your .env file and ensure all variables are set.")
        
        # For critical variables, you might want to exit
        if any(var in missing_vars for var in ["FIREBASE_API_KEY", "FIREBASE_DATABASE_URL"]):
            print("ERROR: Critical environment variables are missing. Application cannot start.")
            exit(1)

# Function to check expiry dates and send notifications
def check_expiry_dates(user_id):
    user_token = session['user']['idToken']
    try:
        # Get user settings
        settings = db.child("users").child(user_id).child("settings").get(token=user_token).val()
        if not settings or not settings.get('email_notification', True):
            return
        
        notification_days = settings.get('notification_days', 3)
        
        # Get user email
        user_email = db.child("users").child(user_id).child("profile").child("email").get(token=user_token).val()
        if not user_email:
            return
        
        # Get pantry items
        pantry_items = db.child("users").child(user_id).child("pantry").get(token=user_token).val()
        if not pantry_items:
            return
        
        # Today and notification threshold date
        today = datetime.now().date()
        threshold_date = today + timedelta(days=notification_days)
        
        # Items about to expire
        expiring_items = []
        expired_items = []
        
        for item_id, item_data in pantry_items.items():
            if not item_data.get('expiry_date'):
                continue
            
            try:
                expiry_date = datetime.strptime(item_data['expiry_date'], '%Y-%m-%d').date()
                
                if expiry_date <= today:
                    expired_items.append({
                        'name': item_data['name'],
                        'expiry_date': item_data['expiry_date']
                    })
                elif expiry_date <= threshold_date:
                    expiring_items.append({
                        'name': item_data['name'],
                        'expiry_date': item_data['expiry_date'],
                        'days_left': (expiry_date - today).days
                    })
            except ValueError:
                # Skip items with invalid date format
                continue
        
        # Send notification if there are expiring or expired items
        if expiring_items or expired_items:
            send_expiry_notification(user_email, expiring_items, expired_items)
    
    except Exception as e:
        print(f"Error checking expiry dates: {e}")

if __name__ == '__main__':
    System.out.println("Starting program now");
    check_environment_variables()
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode, host='0.0.0.0', port=8080)