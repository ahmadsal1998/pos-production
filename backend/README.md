# POS System Backend API

A clean, scalable, and production-ready backend for the POS system built with Node.js, TypeScript, Express, and MongoDB.

## 🚀 Features

- **Authentication**: JWT-based authentication with refresh tokens
- **Security**: Password hashing with bcrypt, CORS enabled, environment-based configuration
- **Type Safety**: Full TypeScript support with strict mode
- **Error Handling**: Centralized error handling middleware
- **Scalable Architecture**: Modular structure with clear separation of concerns
- **MongoDB**: MongoDB database with Mongoose ODM

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas cloud)
- npm or yarn

## 🛠️ Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/pos-system
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
CLIENT_URL=http://localhost:5173

# Optional: Email configuration for password reset OTP
# Get your API key from: https://resend.com/api-keys
RESEND_API_KEY=re_your_resend_api_key_here
# Optional: Customize sender (defaults to no-reply@possystem.com)
RESEND_FROM_EMAIL=no-reply@yourdomain.com
RESEND_FROM_NAME=POS System
```

## 🗄️ Database Setup

1. Make sure MongoDB is running on your system or use MongoDB Atlas

2. Seed the database with initial admin user:
```bash
npm run seed
```

This will create an admin user with:
- **Email**: admin@pos.com
- **Username**: admin
- **Password**: password123
- **Role**: Admin with all permissions

## ▶️ Running the Server

### Development Mode
```bash
npm run dev
```
The server will start on `http://localhost:5001` with hot-reload enabled.

**Note**: If using nodemon doesn't work, you can also run:
```bash
npx ts-node src/server.ts
```

### Production Build
```bash
# Build the TypeScript code
npm run build

# Start the production server
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
  - Body: `{ emailOrUsername: string, password: string }`
  
- `GET /api/auth/me` - Get current user (protected)
  - Headers: `Authorization: Bearer <token>`

- `POST /api/auth/logout` - User logout (protected)

### Password Reset Flow
- `POST /api/auth/forgot-password` - Send OTP to user's email
  - Body: `{ email: string }`
  - Response: `{ success: true, message: "OTP sent successfully" }`

- `POST /api/auth/verify-otp` - Verify OTP code
  - Body: `{ email: string, code: string }`
  - Response: `{ success: true, message: "OTP verified successfully" }`

- `POST /api/auth/reset-password` - Reset password after OTP verification
  - Body: `{ email: string, newPassword: string }`
  - Response: `{ success: true, message: "Password reset successfully" }`

### Health Check
- `GET /health` - API health status

## 🔐 Authentication Flow

1. User logs in with email/username and password
2. Server validates credentials and returns JWT token
3. Client stores token in localStorage
4. All subsequent requests include token in Authorization header
5. Server validates token for protected routes

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # MongoDB connection
│   ├── controllers/
│   │   └── auth.controller.ts   # Auth logic
│   ├── middleware/
│   │   ├── auth.middleware.ts   # JWT authentication
│   │   └── error.middleware.ts  # Error handling
│   ├── models/
│   │   ├── User.ts              # User schema
│   │   └── OTP.ts               # OTP schema for password reset
│   ├── routes/
│   │   └── auth.routes.ts       # Auth routes
│   ├── types/
│   │   └── auth.types.ts        # TypeScript types
│   ├── utils/
│   │   ├── jwt.ts               # JWT utilities
│   │   ├── otp.ts               # OTP generation utilities
│   │   ├── email.ts             # Email service (Resend)
│   │   └── seedDatabase.ts      # Database seeder
│   └── server.ts                # Express app entry
├── .env                         # Environment variables
├── .env.example                 # Example env file
├── package.json
└── tsconfig.json                # TypeScript config
```

## 🔒 Security Features

- **Password Hashing**: Bcrypt with 12 salt rounds
- **JWT Tokens**: Secure token-based authentication
- **CORS**: Configured for specific client origins
- **Environment Variables**: Sensitive data in .env
- **Input Validation**: Express-validator for request validation
- **Error Handling**: No sensitive error details in production

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development |
| MONGODB_URI | MongoDB connection string | - |
| JWT_SECRET | JWT signing secret | - |
| JWT_REFRESH_SECRET | JWT refresh token secret | - |
| JWT_EXPIRE | Token expiration | 7d |
| JWT_REFRESH_EXPIRE | Refresh token expiration | 30d |
| CLIENT_URL | Frontend URL for CORS | http://localhost:5173 |
| RESEND_API_KEY | Resend API key for sending emails (optional for dev) | - |
| RESEND_FROM_EMAIL | Sender email address (optional) | no-reply@possystem.com |
| RESEND_FROM_NAME | Sender name (optional) | POS System |

**Note**: For development, if `RESEND_API_KEY` is not set, OTP codes will be logged to the console instead of being sent via email.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Ensure TypeScript compiles without errors
4. Submit a pull request

## 🚀 Deployment

### Deploy to Render

See deployment guides for detailed instructions:

- **Quick Start**: [DEPLOY_QUICKSTART.md](./DEPLOY_QUICKSTART.md) - Get started in 15 minutes
- **Full Guide**: [RENDER_DEPLOYMENT_GUIDE.md](../RENDER_DEPLOYMENT_GUIDE.md) - Complete deployment guide
- **Environment Setup**: [ENV_SETUP.md](./ENV_SETUP.md) - Environment variables reference

### Quick Deploy Steps

1. Set up MongoDB Atlas (free tier)
2. Create Render account
3. Connect GitHub repository
4. Set root directory to `backend`
5. Add environment variables
6. Deploy!

## 📄 License

ISC

