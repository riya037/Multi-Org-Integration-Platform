# 🚀 Deployment Guide - Multi-Org Integration Platform

## Overview
This guide walks you through deploying the Multi-Org Integration Platform using **100% FREE** hosting services. No credit card required!

## 📋 Prerequisites

- GitHub account
- MongoDB Atlas account (free)
- Render.com account (free)  
- Vercel account (free)

## 🔧 Step 1: Database Setup (MongoDB Atlas - FREE)

### 1.1 Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://mongodb.com/atlas)
2. Click "Try Free" and create account
3. Choose "Build a Database" → "FREE" tier (M0 Sandbox)
4. Select provider: **AWS** (recommended)
5. Select region: **US East (N. Virginia)** (closest to Render servers)

### 1.2 Configure Database
1. **Database Name**: `multiorg-integration`
2. **Username**: Create a database user (save credentials!)
3. **Password**: Generate secure password (save it!)
4. **IP Whitelist**: Click "Allow access from anywhere" (0.0.0.0/0)

### 1.3 Get Connection String
1. Click "Connect" → "Connect your application"
2. Copy the connection string:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/multiorg-integration?retryWrites=true&w=majority
   ```
3. Replace `<password>` with your actual password

## 🎯 Step 2: Backend Deployment (Render.com - FREE)

### 2.1 Prepare Repository
1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit - Multi-Org Integration Platform"
   git push origin main
   ```

### 2.2 Deploy to Render
1. Go to [Render.com](https://render.com)
2. Sign up/login with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Select the repository: `Project3_Multi_Org_Integration_Platform`

### 2.3 Configure Service
```yaml
Name: multi-org-integration-backend
Environment: Node
Region: Oregon (US-West)
Branch: main
Root Directory: backend
Build Command: npm install
Start Command: npm start
Plan: Free
```

### 2.4 Environment Variables
Add these environment variables in Render dashboard:

```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/multiorg-integration?retryWrites=true&w=majority
FRONTEND_URL=https://multi-org-integration.vercel.app
DEMO_MODE=true
ENABLE_AI_FEATURES=true
ENABLE_REAL_TIME=true
LOG_LEVEL=info
```

**Important**: Replace the MongoDB URI with your actual connection string!

### 2.5 Deploy
1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Your backend will be available at: `https://multi-org-integration-backend.onrender.com`

## 🎨 Step 3: Frontend Deployment (Vercel - FREE)

### 3.1 Deploy to Vercel
1. Go to [Vercel.com](https://vercel.com)
2. Sign up/login with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Select: `Project3_Multi_Org_Integration_Platform`

### 3.2 Configure Project
```yaml
Framework Preset: Create React App
Root Directory: frontend
Build Command: npm run build
Output Directory: build
Install Command: npm install
```

### 3.3 Environment Variables
Add in Vercel dashboard:

```bash
REACT_APP_API_URL=https://multi-org-integration-backend.onrender.com/api
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=production
```

**Important**: Replace the API URL with your actual Render backend URL!

### 3.4 Deploy
1. Click "Deploy"
2. Wait for deployment (2-3 minutes)  
3. Your frontend will be available at: `https://multi-org-integration-xxxxx.vercel.app`

## ⚡ Step 4: Configure Custom Domain (Optional)

### 4.1 Vercel Custom Domain
1. In Vercel dashboard → Settings → Domains
2. Add domain: `multi-org-integration.vercel.app` (or your custom domain)
3. Update backend FRONTEND_URL environment variable

### 4.2 Update Backend URL
1. Go to Render dashboard
2. Update `FRONTEND_URL` environment variable with your Vercel URL
3. Service will auto-redeploy

## 🔍 Step 5: Verify Deployment

### 5.1 Check Backend Health
```bash
curl https://your-backend-url.onrender.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 123.45
}
```

### 5.2 Check Frontend
1. Visit your Vercel URL
2. Verify dashboard loads
3. Check real-time connection indicator
4. Test navigation between pages

## 🎛️ Step 6: Production Configuration

### 6.1 Enable Production Features
In Render environment variables:
```bash
NODE_ENV=production
DEMO_MODE=true
ENABLE_AI_FEATURES=true
ENABLE_REAL_TIME=true
ENABLE_ANALYTICS=true
```

### 6.2 Configure Monitoring
The platform includes built-in health checks:
- Backend: `/api/health`
- Database: `/api/health/database`
- Detailed: `/api/health/detailed`

## 🚨 Troubleshooting

### Common Issues

#### Backend Not Starting
1. Check Render logs: Dashboard → Logs
2. Verify MongoDB connection string
3. Ensure all environment variables are set

#### Frontend Can't Connect to Backend
1. Check CORS settings in backend
2. Verify API URL in frontend environment variables
3. Check backend health endpoint

#### Database Connection Failed
1. Check MongoDB Atlas IP whitelist (should be 0.0.0.0/0)
2. Verify connection string format
3. Test connection string in MongoDB Compass

#### Free Tier Limitations
- **Render**: Service sleeps after 15min inactivity (normal)
- **MongoDB**: 512MB storage limit
- **Vercel**: 100GB bandwidth/month

### Performance Tips

#### Render Optimization
```javascript
// Add to backend/server.js
app.get('/wake-up', (req, res) => {
  res.json({ status: 'awake', timestamp: new Date() });
});
```

#### Keep Service Awake (Optional)
Use a service like UptimeRobot to ping your backend every 5 minutes:
```
https://your-backend.onrender.com/wake-up
```

## 📊 Monitoring & Maintenance

### Health Monitoring
- **Uptime**: Monitor via built-in health checks
- **Performance**: View metrics in dashboard
- **Errors**: Check Render logs for issues

### Updates
```bash
# Update backend
git add backend/
git commit -m "Update backend"
git push origin main
# Render auto-deploys

# Update frontend  
git add frontend/
git commit -m "Update frontend"
git push origin main
# Vercel auto-deploys
```

## 🔐 Security Considerations

### Environment Variables
- Never commit `.env` files
- Use strong passwords for MongoDB
- Rotate credentials periodically

### CORS Configuration
Backend automatically configures CORS for your frontend URL.

### Rate Limiting
Built-in rate limiting protects against abuse:
- 100 requests per 15-minute window
- Configurable in environment variables

## 📈 Scaling (When Ready)

When you outgrow free tiers:

1. **MongoDB Atlas**: Upgrade to M10+ cluster
2. **Render**: Upgrade to paid plan for always-on service
3. **Vercel**: Pro plan for advanced features

## 🎉 Success!

Your Multi-Org Integration Platform is now live at:
- **Frontend**: https://your-app.vercel.app
- **Backend API**: https://your-backend.onrender.com
- **Health Check**: https://your-backend.onrender.com/api/health

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Render/Vercel documentation  
3. Check GitHub issues in the repository

---

**🎯 Total Cost: $0.00/month** - Professional portfolio project with enterprise features!

**⏱️ Deployment Time: ~20 minutes** - From code to live demo