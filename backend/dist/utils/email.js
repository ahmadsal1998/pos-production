"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var email_exports = {};
__export(email_exports, {
  sendOTPEmail: () => sendOTPEmail
});
module.exports = __toCommonJS(email_exports);
var import_resend = require("resend");
let resend = null;
const getResendClient = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new import_resend.Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};
const sendOTPEmail = async (email, code) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn(
        "\u26A0\uFE0F  RESEND_API_KEY not set in .env. Email functionality will be limited."
      );
      console.log("\n\u{1F4E7} EMAIL NOT CONFIGURED - OTP for development:");
      console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
      console.log(`\u{1F4E8} To: ${email}`);
      console.log(`\u{1F510} OTP Code: ${code}`);
      console.log(`\u23F0 Expires in: 10 minutes`);
      console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n");
      return {
        success: false,
        message: "Email not configured. OTP logged to console."
      };
    }
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const fromName = process.env.RESEND_FROM_NAME || "POS System";
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
                <strong>\u26A0\uFE0F Important:</strong> This code will expire in 10 minutes. Do not share this code with anyone.
              </div>
              
              <p>If you did not request this password reset, please ignore this email or contact support if you have concerns.</p>
              
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} POS System. All rights reserved.</p>
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
    console.log(`\u{1F4E7} Attempting to send OTP email to ${email} from ${fromEmail}`);
    const resendClient = getResendClient();
    if (!resendClient) {
      throw new Error("Resend client not initialized - API key missing");
    }
    const { data, error } = await resendClient.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: "Password Reset OTP Code",
      html: emailHtml,
      text: emailText
    });
    if (error) {
      console.error("\u274C Resend API Error:", JSON.stringify(error, null, 2));
      console.error("\u274C Error details:", {
        message: error.message,
        name: error.name,
        statusCode: error?.statusCode,
        response: error?.response
      });
      return {
        success: false,
        error: error.message || JSON.stringify(error) || "Failed to send OTP email"
      };
    }
    console.log(`\u2705 OTP email sent successfully to ${email}`);
    console.log(`\u2705 Email ID: ${data?.id}`);
    return {
      success: true,
      message: `OTP email sent successfully to ${email}`
    };
  } catch (error) {
    console.error("\u274C Exception sending OTP email:", error);
    console.error("\u274C Error stack:", error?.stack);
    console.error("\u274C Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return {
      success: false,
      error: error?.message || error?.toString() || "Failed to send OTP email. Please try again later."
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  sendOTPEmail
});
