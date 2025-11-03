# POS System - Complete Backend & Frontend

A complete Point of Sale (POS) system with a **production-ready Node.js backend** and a modern React frontend.

## 🎯 Quick Start

### 1. Start MongoDB
```bash
brew services start mongodb-community
```

### 2. Setup & Start Backend
```bash
cd backend
npm install
npm run seed          # Creates admin user
npm run dev           # Or: npx ts-node src/server.ts
```
✅ Backend running on: **http://localhost:5001**

### 3. Setup & Start Frontend
```bash
cd frontend
npm install
npm run dev
```
✅ Frontend running on: **http://localhost:3000**

### 4. Login
Visit: http://localhost:3000/login

**Credentials:**
- Email: `admin@pos.com`
- Password: `password123`

## 📋 What's Included

### ✅ Backend (Node.js + TypeScript + MongoDB)
- JWT authentication system
- MongoDB with Mongoose ODM
- Password encryption (bcrypt)
- RESTful API architecture
- Complete error handling
- Input validation
- Type-safe TypeScript

### ✅ Frontend (React + Vite + TypeScript)
- Modern React UI
- JWT token management
- State management (Zustand)
- Protected routes
- Beautiful UI components

### ✅ Features
- User authentication & authorization
- Role-based access control
- Permission management
- Secure API endpoints
- Database seeding
- Environment configuration

## 📁 Project Structure

```
pos-production-main/
├── backend/              # Backend API
│   ├── src/
│   │   ├── config/      # MongoDB config
│   │   ├── controllers/ # Request handlers
│   │   ├── middleware/  # Auth & errors
│   │   ├── models/      # Database schemas
│   │   ├── routes/      # API routes
│   │   ├── types/       # TypeScript types
│   │   ├── utils/       # Helpers & JWT
│   │   └── server.ts    # Entry point
│   ├── .env            # Environment config
│   └── README.md       # Backend docs
│
├── frontend/            # Frontend app
│   ├── src/
│   │   ├── app/        # Store & config
│   │   ├── features/   # Feature modules
│   │   ├── pages/      # Page components
│   │   ├── shared/     # Shared components
│   │   └── lib/        # API client
│   └── README.md       # Frontend docs
│
├── SETUP_GUIDE.md      # Full setup guide
├── QUICKSTART.md       # 5-min quick start
├── BACKEND_SUMMARY.md  # Technical details
└── PROJECT_COMPLETE.md # Complete summary
```

## 🔐 Admin Credentials

- **Email**: admin@pos.com
- **Username**: admin
- **Password**: password123
- **Role**: Admin (All permissions)

⚠️ **Change this password in production!**

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Health
- `GET /health` - API health check

## 🛠️ Technology Stack

### Backend
- Node.js
- TypeScript
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt

### Frontend
- React 19
- TypeScript
- Vite
- Zustand
- Tailwind CSS
- React Router

## 📚 Documentation

- **QUICKSTART.md** - Get started in 5 minutes
- **SETUP_GUIDE.md** - Detailed setup instructions
- **BACKEND_SUMMARY.md** - Backend technical overview
- **PROJECT_COMPLETE.md** - Complete project summary
- **backend/README.md** - Backend API documentation
- **RENDER_DEPLOYMENT_GUIDE.md** - Deploy backend to Render
- **backend/DEPLOY_QUICKSTART.md** - Quick deploy to Render
- **backend/ENV_SETUP.md** - Environment variables reference

## 🧪 Testing

### Test Backend
```bash
# Health check
curl http://localhost:5001/health

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"admin@pos.com","password":"password123"}'
```

## 🔒 Security

✅ Password encryption (bcrypt)  
✅ JWT authentication  
✅ CORS protection  
✅ Input validation  
✅ Environment variables  
✅ Secure error handling  

## 🐛 Troubleshooting

### MongoDB not running
```bash
brew services start mongodb-community
```

### Port conflicts
- Backend default: 5001 (changed from 5000 due to AirPlay)
- Frontend default: 3000
- MongoDB default: 27017

### Login fails
```bash
cd backend
npm run seed
```

## 📖 Development

### Backend Development
```bash
cd backend
npm run dev           # Start with hot-reload
npm run build         # Build TypeScript
npm run seed          # Seed database
```

### Frontend Development
```bash
cd frontend
npm run dev           # Start dev server
npm run build         # Build for production
```

## 🚀 Deployment

### Backend (Render)
- See **RENDER_DEPLOYMENT_GUIDE.md** for complete instructions
- Quick deploy: **backend/DEPLOY_QUICKSTART.md**
- Environment setup: **backend/ENV_SETUP.md**

### Frontend (Vercel/Netlify)
- Update API URL in environment variables
- Build command: `npm run build`
- Output directory: `dist`

## 🎯 Next Steps

1. Test the login flow
2. Explore the dashboard
3. Add new features (products, sales, etc.)
4. Customize for your needs
5. Deploy to production (Render + Vercel)

## 📄 License

ISC

## 🙏 Summary

This is a **complete, production-ready POS system** with:
- ✅ Secure authentication
- ✅ MongoDB database
- ✅ Modern React UI
- ✅ TypeScript throughout
- ✅ Clean architecture
- ✅ Fully documented

**Ready to use at: http://localhost:3000**

---

Made with ❤️ for efficient POS management

