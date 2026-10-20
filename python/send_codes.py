import smtplib
import time
import pandas as pd
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# 1. Configuration
GMAIL_USER = "johnDoe@gmail.com"
GMAIL_APP_PASSWORD = "gnbs izua zdcc nosq"  # 👈 Put your Google App Password here
EXCEL_FILE_PATH = "excel-file.xlsx"

EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
     <h2 style="color: #0078d4;">Your Azure Access Code</h2>
     <p>Hello,</p>
   
     <p><strong>Azure for Students code instructions:</strong></p>
     <ol style="padding-left: 20px; margin-bottom: 20px;">
         <li style="margin-bottom: 8px;">Open a private browser window and go to <a href="https://azure.microsoft.com/free/students" style="color: #0078d4; text-decoration: underline;">https://azure.microsoft.com/free/students</a></li>
         <li style="margin-bottom: 8px;">Click <strong>Start Free</strong> and sign in with a <strong>PERSONAL</strong> Microsoft account.</li>
         <li style="margin-bottom: 8px;">Complete the verification form:
             <ul style="padding-left: 20px; list-style-type: circle; margin-top: 5px;">
                 <li style="margin-bottom: 4px;">Leave the <em>School Name</em> field blank.</li>
                 <li style="margin-bottom: 4px;">Enter your <strong>PERSONAL</strong> Microsoft account in the <em>School Email Address</em> field.</li>
                 <li style="margin-bottom: 4px;">Enter your code into the <em>Voucher Code</em> field.</li>
             </ul>
         </li>
         <li style="margin-bottom: 8px;">After verifying your academic status, complete the Azure for Students account opening workflow.</li>
     </ol>
     <p>Here is your unique Azure code to access your resource:</p>
     <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; font-size: 20px; font-weight: bold; letter-spacing: 1px; display: inline-block; color: #0078d4; font-family: monospace; border: 1px solid #ddd; margin: 10px 0;">
         {Code}
     </div>
   
     <p style="font-size: 14px; color: #666; margin-top: 15px;"><em>Please do not share this code with anyone else.</em></p>
   
     <br>
     <p>Best regards,<br><strong>IT Operations Team</strong></p>
 </body>
</html>
"""

# Read Excel
df = pd.read_excel(EXCEL_FILE_PATH)
df.columns = df.columns.str.strip()

# Connect to Gmail SMTP Server
try:
    server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
    server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
    print("Successfully connected to Gmail server.")
    
    for index, row in df.iterrows():
        recipient = str(row['Email']).strip()
        code = str(row['Code']).strip()
        
        if not recipient or pd.isna(row['Email']):
            continue
            
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Your Unique Azure Access Code"
        msg['From'] = GMAIL_USER
        msg['To'] = recipient
        
        # Inject code into template
        html_content = EMAIL_TEMPLATE.format(Code=code)
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send
        server.sendmail(GMAIL_USER, recipient, msg.as_string())
        print(f"[{index+1}] Sent successfully to {recipient}")
        
        time.sleep(1.5)  # Safe delay for Gmail daily limits
        
    server.quit()
    print("All emails sent successfully!")

except Exception as e:
    print(f"An error occurred: {e}")
