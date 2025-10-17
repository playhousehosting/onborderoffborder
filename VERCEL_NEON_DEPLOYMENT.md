# 🚀 Deploy to Vercel + Neon (Complete Guide)

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌───────────────┐
│   Browser   │────────▶│   Vercel     │────────▶│  Neon Postgres│
│             │         │  (Frontend)  │         │  (Sessions)   │
└─────────────┘         └──────────────┘         └───────────────┘
                               │
                               ▼
                        ┌──────────────┐         ┌───────────────┐
                        │   Vercel     │────────▶│ Microsoft     │
                        │  (Backend)   │         │ Graph API     │
                        └──────────────┘         └───────────────┘
```

**Why This Setup is Perfect:**
- ✅ **Vercel** - Free hosting for both frontend and backend (serverless functions)
- ✅ **Neon** - Free serverless Postgres for session storage
- ✅ **No Redis needed** - Postgres handles sessions efficiently
- ✅ **Auto-scaling** - Both services scale automatically
- ✅ **Cost-effective** - Free tiers handle hundreds of users

---

## Step 1: Setup Neon Database (5 minutes)

### 1.1 Create Neon Account

1. Go to **https://neon.tech**
2. Sign up with GitHub (recommended)
3. Click **"Create Project"**

### 1.2 Configure Project

```
Project Name: employee-portal-sessions
Region: Select closest to your users (e.g., US East)
Postgres Version: 15 or latest
```

### 1.3 Get Connection String

After creation, you'll see:
```
DATABASE_URL: postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Copy this!** You'll need it for Vercel.

### 1.4 (Optional) Test Locally

```powershell
# Add to backend/.env
DATABASE_URL=postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Install dependencies
cd backend
npm install

# Start backend - will auto-create session table
npm run dev
```

You should see:
```
✅ Connected to Neon Postgres for sessions
✅ Using Neon Postgres for session storage
```

---

## Step 2: Deploy Backend to Vercel (5 minutes)

### 2.1 Create `vercel.json` in Backend Folder

```powershell
cd backend
```

Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 2.2 Deploy Backend

```powershell
# Make sure you're in the backend folder
cd backend

# Deploy to Vercel
vercel --prod
```

**Follow prompts:**
- Link to existing project? **No**
- Project name: `employee-portal-api`
- Directory: `.` (current directory)

### 2.3 Configure Environment Variables

In Vercel Dashboard (https://vercel.com):

1. Go to your backend project → **Settings** → **Environment Variables**
2. Add these variables:

```bash
# Required
NODE_ENV=production
DATABASE_URL=postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Session Secret (generate new)
SESSION_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Encryption Key (generate new)
ENCRYPTION_KEY=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Frontend URL (we'll update this after deploying frontend)
FRONTEND_URL=https://your-frontend-url.vercel.app
ALLOWED_ORIGINS=https://your-frontend-url.vercel.app

# Security
SECURE_COOKIES=true
TRUST_PROXY=true
SESSION_MAX_AGE=3600000
```

**To generate secrets:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.4 Redeploy Backend

After setting environment variables:
```powershell
vercel --prod
```

Your backend URL will be: `https://employee-portal-api.vercel.app`

---

## Step 3: Deploy Frontend to Vercel (3 minutes)

### 3.1 Update Frontend Configuration

From project root:
```powershell
cd ..  # Back to root directory
```

Create/update `.env`:
```env
REACT_APP_API_URL=https://employee-portal-api.vercel.app
```

### 3.2 Deploy Frontend

```powershell
# Build the frontend
npm run build

# Deploy to Vercel
vercel --prod
```

**Follow prompts:**
- Project name: `employee-offboarding-portal`
- Build command: `npm run build`
- Output directory: `build`

### 3.3 Configure Environment Variables

In Vercel Dashboard:

1. Go to frontend project → **Settings** → **Environment Variables**
2. Add:

```bash
REACT_APP_API_URL=https://employee-portal-api.vercel.app
```

### 3.4 Redeploy Frontend

```powershell
vercel --prod
```

Your frontend URL will be: `https://employee-offboarding-portal.vercel.app`

---

## Step 4: Update Backend CORS (2 minutes)

Now that you have your frontend URL, update backend environment variables:

1. Go to backend project in Vercel Dashboard
2. Update **Environment Variables**:

```bash
FRONTEND_URL=https://employee-offboarding-portal.vercel.app
ALLOWED_ORIGINS=https://employee-offboarding-portal.vercel.app
```

3. Redeploy backend:
```powershell
cd backend
vercel --prod
```

---

## Step 5: Test Your Deployment 🎉

### 5.1 Visit Your App

Open: `https://employee-offboarding-portal.vercel.app`

### 5.2 Test Authentication

1. Enter Azure AD credentials:
   - Tenant ID
   - Client ID
   - Client Secret (for app-only mode)

2. Click "Save & Login"

3. Verify you're redirected to dashboard

### 5.3 Check Session Storage

In Neon Console:
1. Go to **SQL Editor**
2. Run:
```sql
SELECT * FROM user_sessions;
```

You should see encrypted session data! 🎉

---

## 📊 What You Just Deployed

| Component | Service | Purpose | Cost |
|-----------|---------|---------|------|
| **Frontend** | Vercel | React app, static hosting | Free (up to 100GB bandwidth) |
| **Backend** | Vercel | Express API, serverless functions | Free (up to 100GB bandwidth) |
| **Sessions** | Neon | Encrypted session storage | Free (up to 3GB storage, 1M rows) |

**Total Cost: $0/month** for most use cases! 🚀

---

## 🔐 Security Features in Production

✅ **HTTPS Everywhere** - Vercel provides SSL certificates  
✅ **Encrypted Sessions** - AES-256 encryption for credentials  
✅ **Secure Cookies** - HttpOnly, Secure, SameSite=strict  
✅ **Database SSL** - Neon enforces SSL connections  
✅ **Rate Limiting** - Protection against brute force  
✅ **CORS Protection** - Only your frontend can access API  

---

## 🎛️ Neon Dashboard Features

### View Session Data

```sql
-- List all active sessions
SELECT sid, expire, sess->>'userId' as user
FROM user_sessions
WHERE expire > NOW()
ORDER BY expire DESC;

-- Count active sessions
SELECT COUNT(*) as active_sessions
FROM user_sessions
WHERE expire > NOW();

-- Delete expired sessions (automatic, but you can manually trigger)
DELETE FROM user_sessions
WHERE expire < NOW();
```

### Monitor Database

- **Dashboard**: https://console.neon.tech
- **Metrics**: Real-time connections, queries, storage
- **Logs**: Query logs and connection attempts
- **Backups**: Automatic daily backups included

---

## 🔄 Continuous Deployment

### Automatic Deployments

Vercel automatically deploys when you push to GitHub:

```powershell
# Make changes to your code
git add .
git commit -m "Update feature"
git push origin main

# Vercel automatically:
# 1. Detects the push
# 2. Builds frontend and backend
# 3. Deploys to production
# 4. No downtime!
```

### Preview Deployments

Every pull request gets a preview URL:
- Test changes before merging
- Share with team for review
- Automatic HTTPS and environment

---

## 📈 Scaling Considerations

### Free Tier Limits

**Vercel Free:**
- 100GB bandwidth/month
- 100GB build execution/month
- 1000 serverless function invocations/day

**Neon Free:**
- 3GB storage
- 1M rows
- 1 database
- Unlimited queries

### When to Upgrade

**Upgrade Vercel ($20/month)** if:
- >100GB bandwidth/month
- Need custom domains
- Need more than 3 projects

**Upgrade Neon ($19/month)** if:
- >3GB session data
- Need >1 database
- Want point-in-time recovery

### Hundreds of Users?

The free tier handles **hundreds of concurrent users** easily:
- Each session ~1KB
- 1000 users = 1MB storage
- Neon handles 3GB = ~3 million users worth of sessions!

---

## 🧪 Testing Your Deployment

### Test Health Endpoint

```powershell
curl https://employee-portal-api.vercel.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "environment": "production"
}
```

### Test Session Creation

```powershell
# Save credentials
curl -X POST https://employee-portal-api.vercel.app/api/auth/configure `
  -H "Content-Type: application/json" `
  -d '{
    "clientId": "your-client-id",
    "tenantId": "your-tenant-id",
    "clientSecret": "your-secret"
  }' `
  -c cookies.txt

# Check session
curl https://employee-portal-api.vercel.app/api/auth/session -b cookies.txt
```

---

## ❓ Troubleshooting

### "Cannot connect to database"

Check Neon connection string:
```powershell
# In Vercel dashboard, verify DATABASE_URL is correct
# Should look like: postgresql://user:password@ep-xxxxx.aws.neon.tech/neondb?sslmode=require
```

### "CORS Error"

Update backend environment variables:
```bash
ALLOWED_ORIGINS=https://employee-offboarding-portal.vercel.app
FRONTEND_URL=https://employee-offboarding-portal.vercel.app
```

### "Session not persisting"

Check that frontend sends credentials:
```javascript
// In API calls, ensure:
fetch(url, {
  credentials: 'include',  // This is critical!
  // ...
})
```

### "Too many connections"

Neon free tier limits:
- Adjust connection pool in `backend/config/neon-session.js`:
```javascript
max: 10, // Reduce from 20
```

---

## 🎯 Next Steps

1. **Custom Domain** (Optional)
   - Add custom domain in Vercel: `Settings` → `Domains`
   - Update environment variables with new domain

2. **Monitoring** (Recommended)
   - Enable Vercel Analytics (free)
   - Set up Neon monitoring alerts

3. **Backups** (Production)
   - Neon automatically backs up daily
   - Download manual backup: SQL Editor → Export

4. **Documentation**
   - Share deployment URLs with your team
   - Document Azure AD app registration requirements

---

## ✅ Deployment Checklist

- [ ] Neon project created
- [ ] DATABASE_URL copied
- [ ] Backend deployed to Vercel
- [ ] Backend environment variables set
- [ ] Frontend deployed to Vercel
- [ ] Frontend environment variables set
- [ ] Backend CORS updated with frontend URL
- [ ] Test login flow works
- [ ] Verify sessions in Neon console
- [ ] Test Graph API calls work
- [ ] Set up automatic deployments from GitHub

---

## 💡 Pro Tips

**Cost Optimization:**
- Neon auto-pauses inactive databases (perfect for dev/staging)
- Use Vercel preview deployments for testing
- Session cleanup happens automatically

**Performance:**
- Neon uses edge computing (fast globally)
- Vercel CDN caches static assets
- Connection pooling optimizes database connections

**Security:**
- Rotate SESSION_SECRET and ENCRYPTION_KEY periodically
- Monitor Neon access logs
- Enable 2FA on Vercel and Neon accounts

---

## 🎉 Success!

You now have a **production-ready, secure, scalable** employee portal that:
- Handles hundreds of concurrent users
- Costs $0/month on free tiers
- Auto-scales as you grow
- Encrypts all sensitive data
- Deploys automatically from GitHub

**Questions?** Check the documentation or open an issue on GitHub.

---

**Deployed by:** Kameron McCain  
**Stack:** React + Express + Neon + Vercel  
**Security:** AES-256 encryption, SSL/TLS, HttpOnly cookies  
**Status:** Production-ready ✅
