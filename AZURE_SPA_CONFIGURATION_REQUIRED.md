# Azure App Registration - SPA Configuration Required

## The Issue
Your Azure App Registration is currently configured as **"Web"** type, but MSAL requires **"Single-Page Application (SPA)"** type for CORS token redemption.

**Error:** `AADSTS9002326: Cross-origin token redemption is permitted only for the 'Single-Page Application' client-type`

## Solution: Reconfigure Azure App as SPA

### Step 1: Go to Azure Portal
1. Navigate to: https://portal.azure.com
2. Go to **Azure Active Directory** → **App registrations**
3. Find your app: **Employee Offboarding Portal**
   - Client ID: `3f4637ee-e352-4273-96a6-3996a4a7f8c0`

### Step 2: Make App Multi-Tenant (if not already)
1. Click **Authentication** in the left menu
2. Under **Supported account types**, ensure it's set to:
   - **Accounts in any organizational directory (Any Azure AD directory - Multitenant)**
   - OR **Accounts in any organizational directory and personal Microsoft accounts**
3. This allows users from ANY tenant to sign in

### Step 3: Add SPA Platform
1. Still in **Authentication** section
2. Under **Platform configurations**, click **+ Add a platform**
3. Select **Single-page application** (NOT "Web")
4. Add your redirect URIs:
   ```
   http://localhost:3000
   https://www.employeelifecyclepotral.com
   ```
5. Under **Implicit grant and hybrid flows**, check:
   - ✅ **Access tokens (used for implicit flows)**
   - ✅ **ID tokens (used for implicit and hybrid flows)**
6. Click **Configure**

### Step 3: Remove Web Platform (Optional but Recommended)
1. Under **Platform configurations**, find the **Web** platform
2. Click **Remove** to avoid confusion
3. Confirm removal

### Step 4: Verify Configuration
After adding SPA platform, you should see:
- **Platform:** Single-page application
- **Redirect URIs:** 
  - http://localhost:3000
  - https://www.employeelifecyclepotral.com
- **Front-channel logout URL:** (optional)
- **Implicit grant and hybrid flows:**
  - ✅ Access tokens
  - ✅ ID tokens

### Step 5: Save and Test
1. Click **Save** at the top
2. Wait 1-2 minutes for Azure to propagate changes
3. Clear browser cache or use incognito mode
4. Try logging in again at: https://www.employeelifecyclepotral.com/login

## What This Fixes
- ✅ Enables CORS token redemption for browser-based apps
- ✅ Allows MSAL popup authentication to work
- ✅ Allows MSAL redirect authentication to work
- ✅ Fixes AADSTS9002326 error

## Alternative: Use Redirect Flow (After SPA Config)
Once configured as SPA, you can optionally switch back to redirect-based auth (cleaner UX):

In `src/contexts/MSALAuthContext.js`, change:
```javascript
// FROM popup:
const response = await instance.loginPopup(loginRequest);

// TO redirect:
await instance.loginRedirect(loginRequest);
```

Redirect flow is more seamless (no popup windows), but requires SPA platform configuration.

## Why SPA Type is Required
- **Web apps** use server-side token exchange (backend receives auth code)
- **SPAs** use browser-based token exchange (frontend receives auth code)
- MSAL is a client-side library that runs in the browser
- Microsoft enforces strict CORS policies for security
- Only SPA-type apps can redeem tokens from browser origin

## Troubleshooting
If you still see the error after configuration:
1. **Clear browser cache** completely
2. **Wait 2-5 minutes** for Azure AD to propagate changes
3. **Use incognito/private window** to test
4. **Verify redirect URIs match exactly** (no trailing slashes, correct protocol)
5. **Check Azure AD logs** for detailed error messages

## Need Help?
If you don't have access to modify Azure App Registrations, contact your Azure AD administrator and share this document.
