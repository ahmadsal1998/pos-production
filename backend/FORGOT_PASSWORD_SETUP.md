# Forgot Password Flow - Setup Guide

## ✅ Implementation Complete

The forgot password flow has been successfully implemented with the following components:

### 📁 New Files Created

1. **`src/models/OTP.ts`** - OTP model for storing password reset codes
2. **`src/utils/otp.ts`** - OTP generation utilities
3. **`src/utils/email.ts`** - Email service using Nodemailer

### 🔄 Modified Files

1. **`src/controllers/auth.controller.ts`** - Added three new controllers:
   - `forgotPassword` - Send OTP
   - `verifyOTP` - Verify OTP code
   - `resetPassword` - Reset password

2. **`src/routes/auth.routes.ts`** - Added three new routes:
   - `POST /api/auth/forgot-password`
   - `POST /api/auth/verify-otp`
   - `POST /api/auth/reset-password`

## 🚀 Quick Start

### 1. Environment Variables

Make sure your `.env` file includes:

```env
# Required for server
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pos-system
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Optional for email (if not set, OTP will be logged to console)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 2. For Development (No Email Setup Required)

If you don't configure `EMAIL_USER` and `EMAIL_PASS`:
- OTP codes will be **logged to the console** instead of being sent via email
- This is perfect for development and testing
- Look for output like:
  ```
  📧 EMAIL NOT CONFIGURED - OTP for development:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📨 To: user@example.com
  🔐 OTP Code: 123456
  ⏰ Expires in: 10 minutes
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ```

### 3. For Production (Email Setup)

#### Gmail Setup:
1. Enable 2-Step Verification on your Google account
2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Generate a new app password for "Mail"
   - Use this app password in `EMAIL_PASS` (not your regular password)

#### Other Email Providers:
Modify `src/utils/email.ts` to use the correct SMTP configuration for your provider.

## 📝 Testing the Flow

### Step 1: Request Password Reset
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

Response:
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### Step 2: Verify OTP (check console if email not configured)
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "code": "123456"}'
```

Response:
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

### Step 3: Reset Password
```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "newPassword": "newpassword123"}'
```

Response:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

## 🔒 Security Features

✅ OTP codes expire after 10 minutes  
✅ Passwords hashed with bcrypt (12 salt rounds)  
✅ OTP records deleted after use  
✅ Email existence not revealed in responses  
✅ OTP verification required before password reset  
✅ Automatic cleanup of expired OTPs via MongoDB TTL  

## 🐛 Troubleshooting

### Issue: "EMAIL_USER or EMAIL_PASS not set"
**Solution**: This is normal for development. OTP codes will be logged to console instead.

### Issue: OTP email not received
**Check**:
1. Gmail users: Make sure you're using an App Password, not your regular password
2. Check spam folder
3. Verify SMTP settings in `src/utils/email.ts`

### Issue: "OTP verification required"
**Solution**: You must call `/verify-otp` endpoint before calling `/reset-password`.

### Issue: OTP expired
**Solution**: Request a new OTP by calling `/forgot-password` again. OTPs expire after 10 minutes.

## 📚 API Documentation

See `README.md` for complete API endpoint documentation.

