# PantryPal - Smart Pantry Management System

PantryPal is a Python Flask web application that helps you manage your pantry inventory and grocery list. It features expiration date tracking and notifications, making it easy to keep track of what's in your pantry and reduce food waste.

## Features

- **Pantry Inventory Management**:
  - Add, edit, and delete food items in your pantry
  - Track quantities, categories, and expiration dates
  - Filter and search functionality
  - Sort by name, expiration date, or date added

- **Expiration Notifications**:
  - Email alerts for items that are about to expire
  - Customizable notification threshold (1-14 days)
  - Detailed email formatting with expired and expiring items

- **Grocery List Management**:
  - Add, edit, and delete items on your grocery list
  - Mark items as purchased
  - Option to automatically add purchased items to your pantry
  - Set expiration dates when adding to pantry

- **User Authentication**:
  - Firebase Authentication for secure login
  - User registration and profile management
  - Personalized data for each user

- **Responsive Design**:
  - Mobile-friendly interface
  - Intuitive and aesthetically pleasing UI
  - Category-based organization

## Project Structure

```
pantrypal/
├── app.py                  # Main Flask application
├── config.py               # Configuration settings
├── requirements.txt        # Python dependencies
├── static/
│   ├── css/
│   │   └── style.css       # CSS styles
│   ├── js/
│   │   ├── auth.js         # Authentication logic
│   │   ├── pantry.js       # Pantry page functionality
│   │   └── grocery.js      # Grocery list functionality
│   └── img/
│       └── pantry-illustration.svg  # SVG illustrations
├── templates/
│   ├── base.html           # Base template
│   ├── index.html          # Landing page
│   ├── login.html          # Login/Register page
│   ├── pantry.html         # Pantry management page
│   ├── grocery.html        # Grocery list page
│   └── settings.html       # User settings page
└── utils/
    ├── __init__.py
    ├── auth.py             # Authentication utilities
    ├── db.py               # Database utilities
    └── email_sender.py     # Email notification system
```

## Setup Instructions

### 1. Clone the Repository (or create the files as shown above)

```bash
git clone <repository-url>
cd pantrypal
```

### 2. Create a Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Application

```bash
python app.py
```

The application will be available at `http://localhost:5000`

## Usage

1. **Registration/Login**:
   - Create a new account or login with your email and password

2. **Pantry Management**:
   - Add items to your pantry with name, quantity, category, and expiration date
   - Edit or delete items as needed
   - Filter items by category or expiration status
   - Search for items by name or category

3. **Grocery List**:
   - Add items to your grocery list
   - Mark items as purchased when you buy them
   - Optionally add purchased items directly to your pantry with expiration dates

4. **Settings**:
   - Configure email notification preferences
   - Set how many days before expiration you want to be notified

## Customization

- **Categories**: Modify the category options in `pantry.html` and `grocery.html`
- **Styling**: Update the CSS in `static/css/style.css`
- **Email Template**: Customize the email notification template in `utils/email_sender.py`

## Deployment Considerations

For production deployment:

1. Set `debug=False` in `app.py`

## License

[MIT License](LICENSE)

## Acknowledgements

- [Flask](https://flask.palletsprojects.com/)
- [Firebase](https://firebase.google.com/)
- [Font Awesome](https://fontawesome.com/) for icons
- [Google Fonts](https://fonts.google.com/) for typography
