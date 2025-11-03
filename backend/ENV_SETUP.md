# Environment Variables Setup

Create a `.env` file in the `backend` directory with the following variables:

## Required for Local Development

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/pos-system

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-too
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# CORS Configuration
CLIENT_URL=http://localhost:5173

# Email Configuration (Optional - for production)
# For Gmail, use App Password instead of regular password
# Generate App Password: https://myaccount.google.com/apppasswords
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Required for Render Deployment

In the Render dashboard, add these environment variables:

### Required Variables

| Key | Value | Description |
|-----|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `10000` | Server port |
| `MONGODB_URI` | Your Atlas connection string | MongoDB connection from MongoDB Atlas |
| `JWT_SECRET` | Generate random hex string | JWT signing secret |
| `JWT_REFRESH_SECRET` | Generate different random hex string | JWT refresh secret |
| `CLIENT_URL` | Your frontend URL | CORS origin (e.g., `https://your-frontend.vercel.app`) |

### Optional Variables

| Key | Value | Description |
|-----|-------|-------------|
| `JWT_EXPIRE` | `7d` | Token expiration |
| `JWT_REFRESH_EXPIRE` | `30d` | Refresh token expiration |
| `EMAIL_USER` | Your Gmail | Email for sending OTP |
| `EMAIL_PASS` | Gmail app password | Email password for Gmail |

## Generate Secure Secrets

For `JWT_SECRET` and `JWT_REFRESH_SECRET`, generate secure random strings:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Using OpenSSL
openssl rand -hex 64
```

Run this twice to generate two different values.

## MongoDB Atlas Connection String

Format: `mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`

Example: `mongodb+srv://admin:MyPassword123@cluster0.abc123.mongodb.net/pos-system?retryWrites=true&w=majority`

