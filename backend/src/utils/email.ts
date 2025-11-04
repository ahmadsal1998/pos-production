import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send OTP code via email using Resend API
 * @param {string} email - Recipient email address
 * @param {string} code - OTP code to send
 * @returns {Promise<{ success: boolean; message?: string; error?: string }>}
 */
export const sendOTPEmail = async (
  email: string,
  code: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn(
        '⚠️  RESEND_API_KEY not set in .env. Email functionality will be limited.'
      );
      console.log('\n📧 EMAIL NOT CONFIGURED - OTP for development:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📨 To: ${email}`);
      console.log(`🔐 OTP Code: ${code}`);
      console.log(`⏰ Expires in: 10 minutes`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Return success to allow development to continue
      return {
        success: false,
        message: 'Email not configured. OTP logged to console.',
      };
    }

    // Get sender email from environment or use Resend's default test domain
    // For production, use a verified domain. For testing, use onboarding@resend.dev
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const fromName = process.env.RESEND_FROM_NAME || 'POS System';

    const emailHtml = `
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
    `;

    const emailText = `
      Password Reset Request
      
      You have requested to reset your password. Please use the following OTP code:
      
      ${code}
      
      This code will expire in 10 minutes. Do not share this code with anyone.
      
      If you did not request this password reset, please ignore this email.
    `;

    // Log email sending attempt
    console.log(`📧 Attempting to send OTP email to ${email} from ${fromEmail}`);

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: 'Password Reset OTP Code',
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      console.error('❌ Resend API Error:', JSON.stringify(error, null, 2));
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        statusCode: (error as any)?.statusCode,
        response: (error as any)?.response,
      });
      return {
        success: false,
        error: error.message || JSON.stringify(error) || 'Failed to send OTP email',
      };
    }

    console.log(`✅ OTP email sent successfully to ${email}`);
    console.log(`✅ Email ID: ${data?.id}`);
    return {
      success: true,
      message: `OTP email sent successfully to ${email}`,
    };
  } catch (error: any) {
    console.error('❌ Exception sending OTP email:', error);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return {
      success: false,
      error: error?.message || error?.toString() || 'Failed to send OTP email. Please try again later.',
    };
  }
};

