# Quick Start Guide

Get your POS system up and running in 5 minutes!

## 🎯 Prerequisites

- Node.js installed
- MongoDB installed and running

## 🚀 Quick Setup (5 Steps)

### Step 1: Start MongoDB
```bash
brew services start mongodb-community
```

### Step 2: Setup Backend
```bash
cd backend
npm install
npm run seed
npm run dev
```
✅ Backend is now running on http://localhost:5001

### Step 3: Setup Frontend (New Terminal)
```bash
cd frontend
npm install
npm run dev
```
✅ Frontend is now running on http://localhost:3000

### Step 4: Login
Open http://localhost:3000/login

**Credentials:**
- Email: `admin@pos.com`
- Password: `password123`

### Step 5: Success! 🎉
You should now be logged in and see the dashboard!

## 🔍 Verify Everything Works

### Backend Health Check
```bash
curl http://localhost:5001/health
```
Should return: `{"success":true,"message":"POS System API is running"}`

### Test Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"admin@pos.com","password":"password123"}'
```

Should return user data and JWT tokens.

## ⚙️ Configuration

### Backend Configuration (`backend/.env`)
```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/pos-system
CLIENT_URL=http://localhost:3000
```

### Frontend Configuration
Frontend is pre-configured to proxy to backend on port 5001.

## 🐛 Troubleshooting

### MongoDB Not Running
```bash
brew services start mongodb-community
```

### Port 5001 Already in Use
Change PORT in `backend/.env` to another port (e.g., 5002)
Also update `frontend/vite.config.ts` proxy target

### Database Seed Failed
```bash
cd backend
npm run seed
```

### Can't Login
1. Verify backend is running on port 5001
2. Verify database was seeded
3. Check browser console for errors

## 📝 Important Notes

⚠️ **Admin Credentials**: The default admin user password is `password123`. Change this immediately in production!

⚠️ **Security**: The JWT secrets in `.env` are for development only. Use strong, random secrets in production.

## 🎉 You're All Set!

Your POS system is now running with a complete backend API connected to MongoDB. Start building features!

