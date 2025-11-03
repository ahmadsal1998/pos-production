import nodemailer from 'nodemailer';

// Email transporter configuration
const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.warn(
      '⚠️  EMAIL_USER or EMAIL_PASS not set in .env. Email functionality will be limited.'
    );
    // For development, return null to indicate email won't be sent
    // OTP will be logged to console instead
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail', // You can change this to other services
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
};

/**
 * Send OTP code via email
 * @param {string} email - Recipient email address
 * @param {string} code - OTP code to send
 * @returns {Promise<void>}
 */
export const sendOTPEmail = async (
  email: string,
  code: string
): Promise<void> => {
  try {
    const transporter = createTransporter();

    // If email is not configured, log OTP to console for development
    if (!transporter) {
      console.log('\n📧 EMAIL NOT CONFIGURED - OTP for development:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📨 To: ${email}`);
      console.log(`🔐 OTP Code: ${code}`);
      console.log(`⏰ Expires in: 10 minutes`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      // Don't throw error - allow development to continue
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@possystem.com',
      to: email,
      subject: 'Password Reset OTP Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #4f46e5;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background-color: #f9fafb;
                padding: 30px;
                border-radius: 0 0 8px 8px;
              }
              .otp-code {
                background-color: #ffffff;
                border: 2px dashed #4f46e5;
                padding: 20px;
                text-align: center;
                font-size: 32px;
                font-weight: bold;
                color: #4f46e5;
                letter-spacing: 8px;
                margin: 20px 0;
                border-radius: 8px;
              }
              .footer {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #6b7280;
                text-align: center;
              }
              .warning {
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 12px;
                margin: 20px 0;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>You have requested to reset your password. Please use the following OTP code to proceed:</p>
                
                <div class="otp-code">
                  ${code}
                </div>
                
                <div class="warning">
                  <strong>⚠️ Important:</strong> This code will expire in 10 minutes. Do not share this code with anyone.
                </div>
                
                <p>If you did not request this password reset, please ignore this email or contact support if you have concerns.</p>
                
                <div class="footer">
                  <p>This is an automated message. Please do not reply to this email.</p>
                  <p>&copy; ${new Date().getFullYear()} POS System. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        Password Reset Request
        
        You have requested to reset your password. Please use the following OTP code:
        
        ${code}
        
        This code will expire in 10 minutes. Do not share this code with anyone.
        
        If you did not request this password reset, please ignore this email.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}:`, info.messageId);
  } catch (error: any) {
    console.error('❌ Error sending OTP email:', error);
    throw new Error('Failed to send OTP email. Please try again later.');
  }
};

