# 🚀 Deployment Verification Checklist

## Pre-Deployment Checks ✅

### Frontend Build
- [x] `npm run build` completes successfully
- [x] `build/manifest.json` exists and contains valid JSON
- [x] `build/static/js/main.*.js` created
- [x] `build/static/css/main.*.css` created
- [x] No critical errors in build output (warnings are acceptable)

### Configuration Files
- [x] `vercel.json` has manifest.json headers configured
- [x] `vercel.json` has CORS rewrite rules configured
- [x] `.env.example` has all required variables documented
- [x] `.gitignore` has .env files ignored
- [x] `.npmrc` has security settings configured
- [x] `.nvmrc` specifies Node 18.17.0

### Frontend Code
- [x] `public/index.html` has manifest link: `<link rel="manifest" href="%PUBLIC_URL%/manifest.json" />`
- [x] `src/index.js` has graceful manifest error handling
- [x] Security meta tags added to index.html
- [x] CSP headers configured

### Backend Code
- [x] `backend/server.js` has enhanced CORS configuration
- [x] CORS allows credentials
- [x] CORS methods include GET, POST, PUT, DELETE, PATCH, OPTIONS
- [x] CORS preflight cache set to 24 hours
- [x] `backend/.env.example` has all required production variables

## Post-Deployment Checks 🔍

### After deploying to Vercel (Frontend)

**Test manifest.json:**
```bash
# Should return 200 OK with correct headers
curl -I https://your-frontend.vercel.app/manifest.json

# Should have:
# - HTTP/2 200
# - content-type: application/manifest+json
# - cache-control: public, max-age=3600
```

**Test app loads:**
1. Open https://your-frontend.vercel.app
2. Open DevTools → Network tab
3. Clear cache: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
4. Refresh page
5. Look for manifest.json - should be 200, not 401

### After deploying to Vercel (Backend)

**Test health endpoint:**
```bash
curl https://your-backend.vercel.app/health

# Should return JSON with status: "healthy"
```

**Test CORS:**
```bash
curl -H "Origin: https://your-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS https://your-backend.vercel.app/api/auth/configure \
  -v

# Should have Access-Control-Allow-Origin header
```

**Test authentication endpoint:**
```bash
curl -X POST https://your-backend.vercel.app/api/auth/configure \
  -H "Content-Type: application/json" \
  -d '{"clientId":"test","tenantId":"test","clientSecret":"test"}' \
  -v

# Should return 200 or 400 (for invalid creds), not 401
```

## Environment Variables Setup 🔐

### Frontend (Vercel Dashboard)

```
REACT_APP_API_URL = https://your-backend.vercel.app
```

### Backend (Vercel Dashboard)

```
NODE_ENV = production
SESSION_SECRET = [64-char hex string]
ENCRYPTION_KEY = [64-char hex string]
FRONTEND_URL = https://your-frontend.vercel.app
ALLOWED_ORIGINS = https://your-frontend.vercel.app
DATABASE_URL = postgresql://user:pass@host/db
SECURE_COOKIES = true
TRUST_PROXY = true
```

## Monitoring After Deployment 📊

### First 24 Hours
- [ ] Check error logs regularly
- [ ] Monitor for 401/403 errors
- [ ] Watch for CORS errors in console
- [ ] Verify user login flow works end-to-end
- [ ] Check backend health endpoint every 15 minutes

### Weekly
- [ ] Review error logs
- [ ] Check response times
- [ ] Verify session management working
- [ ] Test with different browsers
- [ ] Test on mobile devices

### Monthly
- [ ] Review security headers
- [ ] Update dependencies
- [ ] Check for new vulnerabilities
- [ ] Performance optimization review
- [ ] Backup configuration documentation

## Rollback Plan 🔄

If deployment fails:

1. **Frontend rollback:**
   ```bash
   cd frontend
   git revert [commit-hash]
   git push origin main
   # Vercel auto-deploys
   ```

2. **Backend rollback:**
   ```bash
   cd backend
   vercel rollback
   ```

3. **Database rollback (if needed):**
   - Use Neon's branch/backup feature
   - Restore from snapshot

## Quick Fix Checklist 🛠️

### If manifest.json still returns 401:
- [ ] Clear browser cache completely
- [ ] Wait 60 seconds for Vercel CDN update
- [ ] Check `vercel.json` was deployed (view source in dashboard)
- [ ] Verify header rule matches exactly: `/manifest.json`
- [ ] Run: `curl -I https://your-url/manifest.json`

### If CORS errors occur:
- [ ] Verify `ALLOWED_ORIGINS` matches frontend domain exactly
- [ ] Check `SECURE_COOKIES=true` for HTTPS
- [ ] Verify `TRUST_PROXY=true` for Vercel
- [ ] Test preflight: `curl -X OPTIONS` with Origin header

### If session not persisting:
- [ ] Check frontend sends `credentials: 'include'`
- [ ] Verify `FRONTEND_URL` matches exact domain
- [ ] Check `DATABASE_URL` connection working
- [ ] View Vercel logs for authentication errors

## Success Indicators ✨

You'll know it's working when:

✅ manifest.json loads without 401 errors
✅ App renders without console errors
✅ Login form accepts credentials
✅ Dashboard loads with user data from Graph API
✅ Session persists across page reloads
✅ Logout clears session and redirects to login
✅ No CORS errors in DevTools console
✅ Response times < 500ms
✅ No 500 errors in backend logs
✅ All network requests return appropriate status codes

---

**Date Created**: October 17, 2025
**Last Updated**: October 17, 2025
**Status**: Ready for Production Deployment
