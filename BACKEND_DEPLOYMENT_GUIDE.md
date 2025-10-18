# 🚀 Backend Deployment Guide - Complete Instructions

**Status**: Ready to Deploy  
**Date**: October 17, 2025  
**Current Issue**: Backend not running (connection refused)

---

## Quick Start Options

### Option 1: Start Backend Locally (5 minutes)

Perfect for **testing right now** without deploying:

```powershell
# Open a NEW PowerShell terminal
cd C:\Users\kmccain\Documents\employee-offboarding-portal\backend

# Install dependencies (first time only)
npm install

# Start the backend
npm start
```

**Expected output**:
```
Server running on port 5000
Environment: development
CORS allowed origins: http://localhost:3000
```

Now refresh your frontend browser and it should work!

---

### Option 2: Deploy to Vercel (Production - 10 minutes)

This is the **permanent solution** for production:

#### Step 1: Install Vercel CLI (if not already installed)

```powershell
npm install -g vercel
```

#### Step 2: Deploy Backend

```powershell
cd C:\Users\kmccain\Documents\employee-offboarding-portal\backend
vercel --prod
```

You'll be prompted for:
1. **Set up and deploy?** → Yes
2. **Which scope?** → Select your account
3. **Link to existing project?** → No (first time)
4. **Project name?** → `employee-offboarding-backend` (or any name)
5. **Directory is correct?** → Yes
6. **Override settings?** → No

**Deployment will take 2-3 minutes...**

#### Step 3: Copy Backend URL

After deployment completes, you'll see:
```
✅ Production: https://employee-offboarding-backend-xyz.vercel.app [copied to clipboard]
```

**Copy this URL!** You'll need it for environment variables.

#### Step 4: Set Backend Environment Variables

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Backend Project → Settings → Environment Variables

Add these variables:

```bash
# Required - Frontend URL
FRONTEND_URL=https://onboardingoffboarding.dynamicendpoints.com
ALLOWED_ORIGINS=https://onboardingoffboarding.dynamicendpoints.com

# Required - Security Keys (generate new ones)
SESSION_SECRET=<paste-64-char-hex>
ENCRYPTION_KEY=<paste-64-char-hex>

# Required - Production Mode
NODE_ENV=production
SECURE_COOKIES=true
TRUST_PROXY=true

# Optional - Database (for session persistence)
DATABASE_URL=postgresql://user:pass@host/db
```

**Generate SESSION_SECRET and ENCRYPTION_KEY**:
```powershell
# Run this twice to get two different keys:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Step 5: Redeploy Backend (to pick up environment variables)

```powershell
cd backend
vercel --prod
```

#### Step 6: Update Frontend Environment Variable

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your **Frontend** Project → Settings → Environment Variables

Update or add:
```bash
REACT_APP_API_URL=https://employee-offboarding-backend-xyz.vercel.app
```

**Important**: Use the EXACT URL from Step 3 (without trailing slash)

#### Step 7: Redeploy Frontend

```powershell
cd C:\Users\kmccain\Documents\employee-offboarding-portal
git commit --allow-empty -m "Trigger frontend redeploy"
git push origin main
```

Or click "Redeploy" in Vercel dashboard.

---

## Expected Results

### After Local Backend Start (Option 1)

Console should show:
```
✅ ProtectedRoute: Access granted
🔑 Acquiring app-only access token via backend...
✅ App-only access token acquired from backend
[Dashboard loads with data]
```

### After Vercel Deployment (Option 2)

Same as above, but works on your production URL:
- Frontend: `https://onboardingoffboarding.dynamicendpoints.com`
- Backend: `https://employee-offboarding-backend-xyz.vercel.app`

---

## Environment Variables Reference

### Backend Environment Variables (Required)

```bash
# Frontend Configuration
FRONTEND_URL=https://onboardingoffboarding.dynamicendpoints.com
ALLOWED_ORIGINS=https://onboardingoffboarding.dynamicendpoints.com

# Session & Encryption
SESSION_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
ENCRYPTION_KEY=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Production Settings
NODE_ENV=production
SECURE_COOKIES=true
TRUST_PROXY=true

# Database (Optional - for session persistence)
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Frontend Environment Variables (Required)

```bash
# Backend API URL
REACT_APP_API_URL=https://your-backend.vercel.app

# For local development, use:
# REACT_APP_API_URL=http://localhost:5000
```

---

## Troubleshooting

### "ERR_CONNECTION_REFUSED" (Current Issue)

**Cause**: Backend not running  
**Solution**: Start backend locally (Option 1) or deploy to Vercel (Option 2)

### "404 Not Found" on Backend Routes

**Check 1**: Backend deployed correctly?
```powershell
curl https://your-backend.vercel.app/health
```

**Check 2**: Routes configured in vercel.json?
```json
{
  "routes": [
    { "src": "/(.*)", "dest": "server.js" }
  ]
}
```

### "CORS Error" After Backend Deployment

**Check 1**: FRONTEND_URL set correctly?
```
Go to Vercel → Backend → Settings → Environment Variables
Verify: FRONTEND_URL=https://your-frontend-domain.com
```

**Check 2**: Redeploy after setting variables
```powershell
cd backend
vercel --prod
```

### "Unauthorized" or "401" Errors

**Check 1**: Azure AD credentials correct?
```
Tenant ID: Valid GUID
Client ID: Valid GUID
Client Secret: Not expired
```

**Check 2**: Check backend logs
```
Vercel Dashboard → Backend → Deployments → Latest → View Function Logs
Look for: "Invalid credentials" or "Token request failed"
```

### Frontend Still Using localhost:5000

**Check 1**: Environment variable set?
```javascript
// In browser console:
console.log(process.env.REACT_APP_API_URL);
// Should show your backend URL, not localhost
```

**Check 2**: Rebuild frontend after setting variable
```powershell
# Update .env or Vercel environment variable, then:
npm run build
# Or push to GitHub to trigger Vercel rebuild
```

---

## Quick Test After Deployment

### 1. Test Backend Health

```powershell
curl https://your-backend.vercel.app/health
```

Expected: `OK` or health status

### 2. Test Backend CORS

```powershell
curl -H "Origin: https://your-frontend.vercel.app" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: Content-Type" -X OPTIONS https://your-backend.vercel.app/api/auth/app-only-token
```

Expected: Response with `Access-Control-Allow-Origin` header

### 3. Test Frontend Connection

Open your frontend URL and check console:
```
✅ Should see: "Acquiring app-only access token via backend..."
✅ Should see: "App-only access token acquired from backend"
❌ Should NOT see: "ERR_CONNECTION_REFUSED"
```

---

## Backend Project Structure

```
backend/
├── server.js              ← Main Express server
├── package.json           ← Dependencies
├── vercel.json           ← Vercel config
├── .env.example          ← Environment template
├── config/
│   └── neon-session.js   ← Session store config
├── routes/
│   ├── auth.js           ← Auth endpoints (login, token, etc.)
│   └── graph.js          ← Graph API proxy
├── services/
│   ├── authService.js    ← Azure AD token management
│   └── graphService.js   ← Graph API client
└── utils/
    └── encryption.js     ← Credential encryption
```

---

## Backend API Endpoints

### Authentication
```
POST /api/auth/configure           - Save Azure AD config
POST /api/auth/login-app-only      - App-only authentication
POST /api/auth/login-oauth2        - OAuth2 authentication
POST /api/auth/app-only-token      - Get app-only access token (NEW)
GET  /api/auth/session             - Get current session
POST /api/auth/logout              - Logout
```

### Graph API Proxy
```
GET  /api/graph/me                 - Current user info
GET  /api/graph/users              - List users
GET  /api/graph/groups             - List groups
GET  /api/graph/devices            - List devices
POST /api/graph/proxy              - Generic Graph API proxy
```

---

## Deployment Checklist

Before deploying to production:

### Backend
- [ ] `cd backend`
- [ ] `npm install` (verify no errors)
- [ ] `npm start` (test locally first)
- [ ] `vercel --prod` (deploy to Vercel)
- [ ] Set all environment variables in Vercel
- [ ] Redeploy after setting variables
- [ ] Test health endpoint: `curl https://backend-url/health`
- [ ] Verify CORS configuration

### Frontend
- [ ] Update `REACT_APP_API_URL` in Vercel
- [ ] Redeploy or push to GitHub
- [ ] Test in browser
- [ ] Check console for connection errors
- [ ] Verify API calls succeed
- [ ] Test authentication flow
- [ ] Test dashboard data loading

### Integration
- [ ] Login with Azure AD credentials
- [ ] Verify token acquired from backend
- [ ] Check dashboard displays user data
- [ ] Test all pages (Users, Devices, etc.)
- [ ] Verify session persistence on refresh
- [ ] Test logout functionality

---

## Next Steps After Deployment

1. **Monitor Logs** (first 24 hours)
   - Vercel Dashboard → Deployments → View Function Logs
   - Look for errors, warnings, or unusual activity

2. **Test All Features**
   - User search and management
   - Device management
   - Onboarding/offboarding workflows
   - Transfer wizard
   - Settings

3. **Performance Optimization**
   - Monitor response times
   - Check token caching effectiveness
   - Optimize Graph API calls

4. **Security Audit**
   - Verify HTTPS only
   - Check CSP headers
   - Review CORS configuration
   - Confirm secure cookies enabled

---

## Support

If you encounter issues:

1. **Check Backend Logs**: Vercel Dashboard → Backend → Deployments → Logs
2. **Check Frontend Console**: F12 → Console tab
3. **Verify Environment Variables**: Both frontend and backend
4. **Test Locally First**: Start backend locally to isolate deployment issues
5. **Check Network Tab**: F12 → Network → Look for failed requests

---

## Summary

**Current Status**: Frontend deployed ✅, Backend needs deployment ⏳

**Quick Fix (Testing)**: 
```powershell
cd backend
npm install
npm start
```

**Production Fix (Permanent)**:
```powershell
cd backend
vercel --prod
# Then set environment variables in Vercel dashboard
# Then update REACT_APP_API_URL in frontend
```

---

**Date**: October 17, 2025  
**Status**: Ready for backend deployment  
**Estimated Time**: 10 minutes for full deployment
