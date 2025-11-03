# POS System Setup Guide

This guide will help you set up the complete POS system with the frontend and backend.

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (local installation or MongoDB Atlas account)
- **npm** or **yarn**

## 🗄️ MongoDB Setup

### Option 1: Local MongoDB Installation

1. Install MongoDB Community Edition from [mongodb.com](https://www.mongodb.com/try/download/community)

2. Start MongoDB service:
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
# MongoDB should start automatically as a service
```

### Option 2: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

2. Create a new cluster (choose free tier)

3. Create a database user

4. Whitelist your IP address (0.0.0.0/0 for development)

5. Get your connection string

## 🚀 Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. The `.env` file is already created with the following configuration:
```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/pos-system
JWT_SECRET=pos-system-jwt-secret-key-2024-production-safe
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=pos-system-refresh-secret-key-2024-production-safe
JWT_REFRESH_EXPIRE=30d
CLIENT_URL=http://localhost:3000
```

**Note**: If using MongoDB Atlas, update `MONGODB_URI` with your connection string.

4. Seed the database with the initial admin user:
```bash
npm run seed
```

This will create:
- **Email**: admin@pos.com
- **Username**: admin
- **Password**: password123
- **Role**: Admin with all permissions

5. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5001`

Verify it's working by visiting:
- API Health: `http://localhost:5001/health`

## 🎨 Frontend Setup

1. Navigate to the frontend directory (in a new terminal):
```bash
cd frontend
```

2. Install dependencies (if not already installed):
```bash
npm install
```

3. The frontend is already configured to proxy API requests to the backend on port 5000.

4. Start the frontend development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## 🔐 Login Credentials

Use these credentials to log in to the system:

- **Email**: admin@pos.com
- **Username**: admin (alternative login)
- **Password**: password123

## 🧪 Testing the Authentication

1. Open `http://localhost:3000/login`

2. Enter credentials:
   - Email: `admin@pos.com`
   - Password: `password123`

3. You should be redirected to the dashboard after successful login.

4. Check the browser's localStorage to see the stored JWT token.

## 📁 Project Structure

```
pos-production-main/
├── backend/
│   ├── src/
│   │   ├── config/         # MongoDB configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth & error middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utilities & helpers
│   │   └── server.ts       # Express app entry
│   ├── .env               # Environment variables
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/           # App configuration & store
│   │   ├── features/      # Feature modules
│   │   ├── pages/         # Page components
│   │   ├── shared/        # Shared components
│   │   └── lib/           # API client
│   ├── package.json
│   └── vite.config.ts
│
└── SETUP_GUIDE.md         # This file
```

## 🔧 Troubleshooting

### MongoDB Connection Issues

- **Error**: "MongoServerError: connection refused"
  - **Solution**: Make sure MongoDB is running locally or check your Atlas connection string

### Backend Won't Start

- **Error**: "Port 5000 already in use"
  - **Solution**: Change the PORT in `backend/.env` or kill the process using port 5000

### Frontend Can't Connect to Backend

- **Error**: "Network error" or "CORS error"
  - **Solution**: Make sure the backend is running on port 5000 and frontend proxy is configured correctly

### Login Fails

- **Error**: "Invalid email or password"
  - **Solution**: Run `npm run seed` again in the backend directory

### Token Issues

- Clear localStorage and try logging in again
- Check that the token is being stored in localStorage

## 🚀 Production Deployment

### Backend

1. Build the TypeScript code:
```bash
cd backend
npm run build
```

2. Set production environment variables:
```env
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-strong-production-secret
JWT_REFRESH_SECRET=your-strong-production-refresh-secret
CLIENT_URL=your-production-frontend-url
```

3. Start the server:
```bash
npm start
```

### Frontend

1. Build for production:
```bash
cd frontend
npm run build
```

2. The built files will be in `frontend/dist/`

3. Deploy to your hosting service (Vercel, Netlify, etc.)

## 🔒 Security Notes

- **Never commit** `.env` files to version control
- Use strong, unique JWT secrets in production
- Implement rate limiting for production
- Use HTTPS in production
- Regularly update dependencies
- Consider implementing refresh token rotation

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

## 🤝 Need Help?

If you encounter any issues:
1. Check the error messages carefully
2. Verify all services are running
3. Check environment variables
4. Review the logs in both frontend and backend terminals

