# Testing Clerk JWT Integration - Quick Guide

## ✅ What Was Updated

### 1. **Convex Backend (`convex/clerkProxy.ts`)**
- ✅ Now properly decodes and validates Clerk JWT tokens
- ✅ Supports custom claims from your JWT template
- ✅ Added CORS headers for cross-origin requests
- ✅ Enhanced logging for debugging
- ✅ Validates token expiration automatically

### 2. **JWT Template Documentation (`CLERK_JWT_SETUP.md`)**
- ✅ Removed reserved claims (`azp`, `sub`) from custom template
- ✅ Clarified which claims are automatic vs. custom
- ✅ Added TypeScript definitions
- ✅ Included troubleshooting guide

### 3. **Deployed to Production**
- ✅ Convex functions deployed to: `https://neighborly-manatee-845.convex.cloud`
- ✅ Code pushed to GitHub (commit `d607f3d`)

---

## 🧪 Testing Steps

### Step 1: Configure JWT Template in Clerk

1. Go to: https://dashboard.clerk.com
2. Navigate to: **Sessions** → **Customize session token**
3. Paste this JSON in the **Claims editor**:

```json
{
  "email": "{{user.primary_email_address}}",
  "email_verified": "{{user.primary_email_address_verified}}",
  "family_name": "{{user.last_name}}",
  "given_name": "{{user.first_name}}",
  "name": "{{user.full_name}}",
  "preferred_username": "{{user.username}}",
  "user_id": "{{user.id}}",
  "username": "{{user.username}}",
  "fullName": "{{user.full_name}}",
  "primaryEmail": "{{user.primary_email_address}}",
  "imageUrl": "{{user.image_url}}",
  "organizationId": "{{org.id}}",
  "organizationSlug": "{{org.slug}}",
  "organizationName": "{{org.name}}",
  "permissions": "{{user.public_metadata.permissions}}",
  "role": "{{user.public_metadata.role}}"
}
```

4. Click **Save**
5. **Important**: Sign out and sign back in to get a new token with the updated claims

### Step 2: Update Environment Variables

Make sure your `.env.local` has:
```bash
REACT_APP_CONVEX_URL=https://neighborly-manatee-845.convex.cloud
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_XXXXXX
```

And your Convex environment has (via `npx convex env`):
```bash
CLERK_SECRET_KEY=sk_test_XXXXXX
AZURE_CLIENT_ID=3f4637ee-e352-4273-96a6-3996a4a7f8c0
AZURE_CLIENT_SECRET=YOUR_SECRET
AZURE_TENANT_ID=YOUR_TENANT_ID
```

### Step 3: Test Authentication Flow

1. **Start your development server:**
   ```bash
   npm start
   ```

2. **Sign in with Clerk** (use Microsoft SSO if configured)

3. **Open Browser DevTools** (F12)
   - Go to **Console** tab
   - You should see:
     ```
     ✅ Clerk user authenticated: user_xxxxx email@domain.com
     ```

4. **Check JWT Token:**
   - In Console, run:
     ```javascript
     await Clerk.session.getToken()
     ```
   - Copy the token
   - Go to https://jwt.io
   - Paste token
   - Verify you see your custom claims: `email`, `fullName`, `organizationId`, etc.

### Step 4: Test Graph API Calls

1. **Navigate to Dashboard** in your app

2. **Watch Network Tab** in DevTools:
   - Look for requests to: `https://neighborly-manatee-845.convex.cloud/clerk-proxy/graph/users`
   - Should return **200 OK** with user data
   - Should NOT return **401 Unauthorized** or **404 Not Found**

3. **Check Console Logs**:
   - Look for: `📡 Clerk Graph request: ...`
   - Should see: `✅ Clerk user authenticated: ...`
   - Should see: `✅ Graph API response: 200`

### Step 5: Test Offboarding Wizard

1. Go to **Offboarding** section
2. Select a user
3. Configure offboarding options
4. **Important**: Watch for these specific errors (these indicate Azure permissions needed):
   - ❌ `403 Forbidden` on `/authentication/methods` → Need `UserAuthenticationMethod.ReadWrite.All`
   - ❌ `403 Forbidden` on `/lifecycleWorkflows` → Need `LifecycleWorkflows.ReadWrite.All`
   - ❌ `403 Forbidden` on `/deviceManagement` → Need `DeviceManagementManagedDevices.ReadWrite.All`
   - ❌ `403 Forbidden` on `/auditLogs` → Need `AuditLog.Read.All`

---

## 🔍 What to Look For

### ✅ Success Indicators

**In Browser Console:**
```
🔄 Auth state: { authMode: 'clerk', isAuthenticated: true, ... }
📡 Clerk Graph request: https://neighborly-manatee-845.convex.cloud/clerk-proxy/graph/users
✅ Clerk user authenticated: user_xxxxx email@example.com
✅ Graph API response: 200
```

**In Convex Logs** (Dashboard → Logs):
```
✅ JWT decoded: { sub: 'user_xxxxx', email: 'email@example.com', exp: ... }
✅ Clerk user authenticated: user_xxxxx email@example.com
🌐 Calling Graph API: https://graph.microsoft.com/v1.0/users
✅ Graph API response: 200
```

**In Network Tab:**
- Status: `200 OK`
- Response has user data
- No CORS errors

### ❌ Common Issues

#### Issue 1: "Invalid or expired token"
**Cause:** Old token cached, need to sign out and back in  
**Solution:** 
1. Sign out of Clerk
2. Clear browser cookies
3. Sign back in
4. Should get new token with custom claims

#### Issue 2: Token missing custom claims
**Cause:** JWT template not saved or user didn't get new token  
**Solution:**
1. Verify JWT template is saved in Clerk Dashboard
2. Sign out and back in
3. Check token at jwt.io

#### Issue 3: 403 Forbidden errors
**Cause:** Azure app missing required permissions  
**Solution:** Follow `AZURE_PERMISSIONS_REQUIRED.md`:
1. Go to Azure Portal → App registrations
2. Add missing permissions (Application type)
3. **Grant admin consent** ← Critical step!
4. Wait 5-10 minutes for propagation

#### Issue 4: CORS errors
**Cause:** Convex deployment not updated  
**Solution:**
```bash
npx convex deploy --yes --typecheck=disable
```

---

## 📋 Pre-Flight Checklist

Before testing, ensure:

- [ ] JWT template configured in Clerk Dashboard
- [ ] Clicked "Save" on JWT template
- [ ] Signed out and back in to Clerk
- [ ] `REACT_APP_CONVEX_URL` set to production URL
- [ ] `REACT_APP_CLERK_PUBLISHABLE_KEY` set
- [ ] Convex env vars set (`CLERK_SECRET_KEY`, Azure credentials)
- [ ] Convex functions deployed (`npx convex deploy`)
- [ ] Development server running (`npm start`)
- [ ] Browser DevTools open (F12)

---

## 🎯 Expected User Flow

1. **User visits app** → Redirected to Clerk sign-in
2. **User signs in** → Clerk creates JWT with custom claims
3. **Frontend receives JWT** → Stores in cookie
4. **User navigates to Dashboard** → Frontend makes API call
5. **Frontend → Convex Proxy** → Sends JWT in `Authorization: Bearer` header
6. **Convex decodes JWT** → Validates expiration, extracts user info
7. **Convex → Azure AD** → Gets app-only token
8. **Convex → Graph API** → Makes request with app-only token
9. **Graph API → Convex** → Returns data
10. **Convex → Frontend** → Proxies response back
11. **Frontend displays data** → User sees dashboard

---

## 🚀 Next Steps After Testing

Once authentication works:

1. **Add Azure Permissions** (see `AZURE_PERMISSIONS_REQUIRED.md`)
   - UserAuthenticationMethod.ReadWrite.All
   - LifecycleWorkflows.ReadWrite.All
   - DeviceManagementManagedDevices.ReadWrite.All
   - AuditLog.Read.All
   - Grant admin consent

2. **Test Offboarding Operations**
   - Password reset
   - License revocation
   - Group removal
   - Device wipe

3. **Deploy to Production**
   - Vercel deployment
   - Update production environment variables
   - Test with production Convex URL

---

## 📞 Debugging Commands

### Check Convex Logs
```bash
npx convex logs
```

### Check Convex Environment
```bash
npx convex env list
```

### Verify Deployment
```bash
npx convex deploy --yes --typecheck=disable
```

### Check JWT in Browser Console
```javascript
// Get token
const token = await Clerk.session.getToken();
console.log(token);

// Decode payload (not secure, just for debugging)
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log('JWT Claims:', payload);
```

---

## ✨ Summary

Your application is now configured to:
- ✅ Use Clerk JWT tokens with custom claims
- ✅ Validate tokens on the backend
- ✅ Proxy requests to Microsoft Graph API
- ✅ Support both Clerk SSO and app-only authentication
- ✅ Log detailed debugging information

**The main thing you need to do now:**
1. Configure the JWT template in Clerk Dashboard (copy the JSON above)
2. Test the authentication flow
3. Add Azure app permissions if you see 403 errors
