import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from config import email_config

def send_expiry_notification(recipient_email, expiring_items, expired_items):
    # Create message container
    msg = MIMEMultipart('alternative')
    msg['Subject'] = "PantryPal - Food Expiration Alert"
    msg['From'] = email_config['email']
    msg['To'] = recipient_email
    
    # Create the HTML email content
    html = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 5px;
            }}
            h1 {{
                color: #4CAF50;
                border-bottom: 2px solid #4CAF50;
                padding-bottom: 10px;
            }}
            h2 {{
                color: #555;
            }}
            .item {{
                margin: 10px 0;
                padding: 10px;
                background-color: #f9f9f9;
                border-left: 4px solid #4CAF50;
            }}
            .expired {{
                border-left: 4px solid #f44336;
            }}
            .footer {{
                margin-top: 30px;
                font-size: 12px;
                color: #777;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>PantryPal - Food Expiration Alert</h1>
            <p>Hello,</p>
            <p>This is an automatic notification from PantryPal about items in your pantry that need your attention.</p>
    """
    
    if expired_items:
        html += f"""
            <h2>🚨 Expired Items ({len(expired_items)})</h2>
        """
        for item in expired_items:
            html += f"""
            <div class="item expired">
                <strong>{item['name']}</strong> - Expired on {item['expiry_date']}
            </div>
            """
    
    if expiring_items:
        html += f"""
            <h2>⚠️ Items Expiring Soon ({len(expiring_items)})</h2>
        """
        for item in expiring_items:
            html += f"""
            <div class="item">
                <strong>{item['name']}</strong> - Expires in {item['days_left']} day{'s' if item['days_left'] != 1 else ''} ({item['expiry_date']})
            </div>
            """
    
    html += f"""
            <p>Please check your PantryPal app for more details and to update your inventory.</p>
            <div class="footer">
                <p>This is an automated message from PantryPal. Please do not reply to this email.</p>
                <p>Sent on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Attach HTML content
    msg.attach(MIMEText(html, 'html'))
    
    try:
        # Send the email
        server = smtplib.SMTP(email_config['smtp_server'], email_config['smtp_port'])
        server.starttls()
        server.login(email_config['email'], email_config['password'])
        server.send_message(msg)
        server.quit()
        print(f"Expiry notification sent to {recipient_email}")
        return True
    except Exception as e:
        print(f"Failed to send expiry notification: {e}")
        return False