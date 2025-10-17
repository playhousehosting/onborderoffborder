# 🚀 Quick Start Guide - Secure Employee Offboarding Portal

## Overview

This application now uses a **secure backend API** to handle Azure AD credentials safely. Credentials are encrypted and stored server-side only, making it suitable for public-facing deployment with hundreds of users.

## 🏗️ Architecture

```
User Browser → React Frontend → Backend API → Microsoft Graph
                     ↓
              Session Cookie (HttpOnly, Secure)
                     ↓
              Encrypted Credentials (Server-side only)
```

## ⚡ Quick Setup (5 Minutes)

### Option 1: Automated Setup (Recommended)

```powershell
# 1. Setup Backend
cd backend
.\setup-backend.ps1

# 2. Start Backend (new terminal)
npm run dev

# 3. Start Frontend (new terminal, from root)
cd ..
npm start
```

### Option 2: Manual Setup

```powershell
# 1. Backend Setup
cd backend
npm install
node setup.js  # Interactive configuration

# 2. Start Backend
npm run dev    # Runs on http://localhost:5000

# 3. Frontend Setup (new terminal)
cd ..
npm install

# 4. Configure Frontend API URL
# Create .env in root (if not exists)
echo "REACT_APP_API_URL=http://localhost:5000" > .env

# 5. Start Frontend
npm start      # Runs on http://localhost:3000
```

## 🔐 How to Use

### 1. Enter Credentials (Login Screen)

- **Tenant ID**: Your Azure AD directory ID
- **Client ID**: Your application (client) ID
- **Client Secret**: (Optional) Required for App-Only mode

### 2. Click "Save & Login"

**What Happens Behind the Scenes:**
1. ✅ Credentials sent to backend via HTTPS
2. ✅ Backend encrypts credentials with AES-256
3. ✅ Encrypted credentials stored in secure session
4. ✅ Session cookie sent to browser (HttpOnly, can't be accessed by JavaScript)
5. ✅ User authenticated and redirected to dashboard

### 3. Use the Application

- All Microsoft Graph API calls go through the backend
- Backend automatically adds authentication
- Your credentials stay encrypted on the server
- Session expires after 1 hour (configurable)

## 🔒 Security Features

| Feature | Description |
|---------|-------------|
| **Encrypted Storage** | Credentials encrypted with AES-256-GCM |
| **Server-Side Only** | Client secrets never sent to browser |
| **HttpOnly Cookies** | Session cookies inaccessible to JavaScript |
| **Rate Limiting** | Protection against brute force attacks |
| **CORS Protection** | Only configured origins can access API |
| **Security Headers** | Helmet.js for XSS, clickjacking protection |
| **Session Expiry** | Automatic logout after inactivity |

## 📊 Multi-User Support

The backend supports **hundreds of concurrent users**:
- Each user has their own encrypted session
- Sessions stored in memory (dev) or Redis (production)
- No credential conflicts between users
- Isolated authentication per user

## 🌍 Production Deployment

### Backend

**Deploy to Azure App Service:**
```bash
cd backend
az webapp create --resource-group myRG --plan myPlan --name my-api --runtime "NODE|18-lts"
az webapp config appsettings set --name my-api --settings @env-vars.json
```

**Deploy to Heroku:**
```bash
heroku create employee-portal-api
heroku addons:create heroku-redis:hobby-dev
git subtree push --prefix backend heroku main
```

**Environment Variables Required:**
- `NODE_ENV=production`
- `SESSION_SECRET` (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `ENCRYPTION_KEY` (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `FRONTEND_URL` (your frontend domain)
- `REDIS_URL` (for production session storage)
- `ALLOWED_ORIGINS` (your frontend domain)

### Frontend

**Deploy to Vercel:**
```bash
npm run build
vercel --prod
```

**Set Environment Variable:**
- `REACT_APP_API_URL` = your backend URL

## 🔧 Configuration

### Backend (.env)

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend.vercel.app
SESSION_SECRET=<64-char-hex-string>
ENCRYPTION_KEY=<64-char-hex-string>
REDIS_URL=redis://...
ALLOWED_ORIGINS=https://your-frontend.vercel.app
SECURE_COOKIES=true
TRUST_PROXY=true
```

### Frontend (.env)

```env
REACT_APP_API_URL=https://your-backend.azurewebsites.net
```

## 📋 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/configure` | Save encrypted credentials |
| POST | `/api/auth/validate` | Validate credentials |
| POST | `/api/auth/login-app-only` | Client credentials login |
| GET | `/api/auth/login-oauth2` | OAuth2 interactive login |
| GET | `/api/auth/callback` | OAuth2 callback |
| GET | `/api/auth/session` | Check session status |
| POST | `/api/auth/logout` | Destroy session |

### Microsoft Graph (Proxied)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graph/me` | Current user info |
| GET | `/api/graph/users` | List users |
| GET | `/api/graph/users/:id` | Get user |
| POST | `/api/graph/users` | Create user |
| PATCH | `/api/graph/users/:id` | Update user |
| DELETE | `/api/graph/users/:id` | Delete user |
| GET | `/api/graph/groups` | List groups |
| GET | `/api/graph/devices` | List devices |
| ALL | `/api/graph/proxy/*` | Generic Graph proxy |

## 🧪 Testing

```bash
# Test backend health
curl http://localhost:5000/health

# Test with session (save cookies)
curl -X POST http://localhost:5000/api/auth/configure \
  -H "Content-Type: application/json" \
  -d '{"clientId":"test","tenantId":"test","clientSecret":"test"}' \
  -c cookies.txt

# Test authenticated endpoint
curl http://localhost:5000/api/graph/me -b cookies.txt
```

## 📚 Documentation

- **Backend Setup**: [backend/README.md](backend/README.md)
- **Security Architecture**: [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md)
- **Frontend Integration**: [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md)

## ❓ Common Issues

### "ENCRYPTION_KEY not set"

Generate a key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### "CORS Error"

Make sure `ALLOWED_ORIGINS` in backend includes your frontend URL.

### "Session not persisting"

Make sure frontend includes `credentials: 'include'` in fetch requests.

### "Cannot connect to backend"

Check that backend is running on the correct port and `REACT_APP_API_URL` is set correctly.

## 🆘 Support

- Check logs in backend terminal
- Visit `/health` endpoint to verify backend is running
- Review `SECURITY_ARCHITECTURE.md` for architecture details
- Check `FRONTEND_INTEGRATION.md` for integration examples

## ✅ Production Checklist

- [ ] Backend deployed with HTTPS
- [ ] Strong SESSION_SECRET generated
- [ ] Strong ENCRYPTION_KEY generated
- [ ] Redis configured for session storage
- [ ] CORS configured for frontend domain
- [ ] Rate limiting enabled
- [ ] Security headers enabled
- [ ] Frontend API_URL points to backend
- [ ] Environment variables not in git
- [ ] Monitoring/logging configured

---

**🎉 You're all set! Your application is now secure and production-ready.**
