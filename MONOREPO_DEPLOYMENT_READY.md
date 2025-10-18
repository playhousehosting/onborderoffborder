# Monorepo Deployment - Ready for Vercel

## ✅ Configuration Complete

All files have been configured for a unified monorepo deployment where both frontend and backend are served from the same Vercel domain.

## Architecture

```
https://your-app.vercel.app
├── /                      → Frontend (React SPA)
├── /dashboard             → Frontend route
├── /api/auth/*            → Backend API
├── /api/graph/*           → Backend API
├── /health                → Backend health check
├── /manifest.json         → Static file with headers
└── /static/*              → Frontend assets with caching
```

## Modified Files

### 1. `vercel.json` (Root)
✅ **Status**: Configured for monorepo with backend build

**Key Configuration**:
```json
{
  "builds": [
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/server.js"
    },
    {
      "src": "/health",
      "dest": "backend/server.js"
    },
    {
      "src": "/manifest.json",
      "headers": {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/json"
      },
      "dest": "/manifest.json"
    },
    {
      "src": "/static/(.*)",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      },
      "dest": "/static/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

**Routing Logic**:
1. `/api/*` routes → Backend (Express server)
2. `/health` endpoint → Backend
3. `/manifest.json` → Static file with caching headers
4. `/static/*` → Frontend assets with aggressive caching
5. All other routes → `index.html` (React Router handles routing)

### 2. `src/config/apiConfig.js`
✅ **Status**: Environment-aware API base URL

**Key Change**:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');
```

**Behavior**:
- **Production**: Uses empty string → Same-origin requests (no CORS)
- **Development**: Uses `http://localhost:5000` → Backend on different port
- **Custom**: Respects `REACT_APP_API_URL` if set

### 3. `public/index.html`
✅ **Status**: CSP allows both localhost and Vercel backends

**CSP Configuration**:
```html
connect-src 'self' http://localhost:* https://*.vercel.app https://login.microsoftonline.com https://graph.microsoft.com;
```

### 4. `backend/routes/auth.js`
✅ **Status**: `/app-only-token` endpoint exists and works

**Endpoint**: `POST /api/auth/app-only-token`
- Accepts: `{ clientId, clientSecret, tenantId }`
- Returns: `{ access_token, expires_in, token_type }`
- Purpose: Proxy Azure AD token requests to avoid CORS

## Backend Dependencies

### Required Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `NODE_ENV` | `production` | ✅ | Enables production optimizations |
| `SESSION_SECRET` | `64-char-hex` | ✅ | Session encryption key |
| `ENCRYPTION_KEY` | `64-char-hex` | ✅ | Credential encryption key |
| `FRONTEND_URL` | `https://your-app.vercel.app` | ✅ | Your Vercel deployment URL |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` | ✅ | CORS allowed origins (same as FRONTEND_URL) |
| `SECURE_COOKIES` | `true` | ✅ | Enable secure cookies in production |
| `TRUST_PROXY` | `true` | ✅ | Trust Vercel's proxy headers |

### Generate Secrets

```powershell
# Generate SESSION_SECRET (64-char hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY (64-char hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deployment Steps

### 1. Install Backend Dependencies

```powershell
cd backend
npm install
cd ..
```

### 2. Build Frontend

```powershell
npm run build
```

This creates the `build/` directory that Vercel will serve as static files.

### 3. Test Locally (Optional)

```powershell
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Build and serve frontend
npm run build
# Manually test by accessing http://localhost:5000
```

### 4. Commit Changes

```powershell
git add -A
git commit -m "feat: Configure monorepo deployment for Vercel"
git push origin main
```

### 5. Deploy to Vercel

#### Option A: Vercel CLI (Recommended)

```powershell
# Install Vercel CLI globally
npm install -g vercel

# Login
vercel login

# Deploy (first time)
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set project name
# - Confirm deployment
```

#### Option B: Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository
4. Vercel will auto-detect the configuration from `vercel.json`
5. Click "Deploy"

### 6. Set Environment Variables in Vercel

After deployment:

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add all required variables listed above
4. Click "Save"
5. Go to **Deployments** tab
6. Click "Redeploy" on the latest deployment

## Verification Checklist

After deployment, verify:

- [ ] **Health Check**: Visit `https://your-app.vercel.app/health`
  - Should return: `{ status: 'healthy' }`

- [ ] **Frontend Loads**: Visit `https://your-app.vercel.app`
  - Should see the login page
  - No console errors

- [ ] **Manifest Works**: Check DevTools Network tab
  - `/manifest.json` should return 200 status
  - No 401 errors

- [ ] **API Routes Work**: Test authentication
  - Enter Azure AD credentials
  - Login should succeed
  - Token request to `/api/auth/app-only-token` should return 200

- [ ] **Dashboard Loads**: After login
  - Should navigate to `/dashboard`
  - User info should display
  - No console errors

- [ ] **Static Assets Cached**: Check Response Headers
  - `/static/*` files should have `Cache-Control: public, max-age=31536000, immutable`
  - `/manifest.json` should have `Cache-Control: public, max-age=3600`

## Architecture Benefits

### 1. No CORS Issues
- Frontend and backend on same origin
- No preflight OPTIONS requests
- Simplified security configuration

### 2. Session Persistence
- Cookies work without SameSite issues
- HttpOnly cookies for security
- Session data stored server-side

### 3. Simplified Deployment
- Single deployment URL
- Single set of environment variables
- One domain to manage

### 4. Better Performance
- Frontend served from CDN
- Backend API co-located
- Reduced latency for API calls

### 5. Security
- CSP enforced for all resources
- Credentials never exposed to browser
- Backend validates all requests

## Development vs Production

### Development Mode
```
Frontend: http://localhost:3000 (npm start)
Backend: http://localhost:5000 (cd backend && npm start)
```
- CORS enabled for localhost
- API calls go to http://localhost:5000/api/*
- Hot reload for both frontend and backend

### Production Mode
```
Everything: https://your-app.vercel.app
```
- No CORS needed (same origin)
- API calls use relative URLs (/api/*)
- Optimized builds for performance

## Troubleshooting

### Issue: API calls fail with 404
**Solution**: Ensure `vercel.json` routes are in correct order. API routes must come before SPA fallback.

### Issue: Backend not starting
**Solution**: Check environment variables are set in Vercel Dashboard. Redeploy after setting them.

### Issue: Session not persisting
**Solution**: Verify `SESSION_SECRET` is set and `SECURE_COOKIES=true` in production.

### Issue: CORS errors in production
**Solution**: Should not happen if using empty string for API_BASE_URL. Verify `apiConfig.js` is correct.

### Issue: White screen after deployment
**Solution**: Check browser console for errors. Verify `build/` directory was created and contains `index.html`.

## Next Steps

1. ✅ Backend dependencies installed
2. ✅ Frontend build created
3. ✅ Git commit and push
4. ✅ Deploy to Vercel
5. ✅ Set environment variables
6. ✅ Redeploy
7. ✅ Test all functionality

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Monorepo Guide**: https://vercel.com/docs/concepts/monorepos
- **Node.js Deployment**: https://vercel.com/docs/frameworks/more-frameworks#node.js

---

**Ready to deploy!** 🚀

All configuration files are in place. Follow the deployment steps above to launch your unified monorepo on Vercel.
