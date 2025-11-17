# Clerk Multi-Tenant Microsoft OAuth - Quick Start

## 🎯 What Was Fixed

The Clerk proxy now supports **multi-tenant Microsoft sign-in** by using the user's OAuth token from Microsoft instead of hardcoded app-only credentials.

### Changes Made:

1. **Backend (`clerkProxy.ts`):**
   - Now extracts OAuth token from Clerk JWT
   - Uses delegated token first (user's own credentials)
   - Falls back to app-only credentials if no OAuth token
   - Supports any Microsoft 365 organization (multi-tenant)

2. **JWT Template (`CLERK_JWT_SETUP.md`):**
   - Added `oauth_token` field to capture Microsoft OAuth access token
   - Token automatically included when user signs in with Microsoft

3. **Documentation:**
   - Created `CLERK_MICROSOFT_OAUTH_SETUP.md` with complete setup guide
   - Includes Azure app registration steps
   - Explains multi-tenant configuration

---

## 📋 Next Steps to Enable Multi-Tenant

### Step 1: Configure Azure App Registration (5 minutes)

1. Go to [Azure Portal](https://portal.azure.com) → **Azure AD** → **App registrations**
2. Create new app or update existing one:
   - **Name:** `Employee Lifecycle Portal - Clerk OAuth`
   - **Supported accounts:** **Any organizational directory (Multitenant)** ← Important!
   - **Redirect URI:** `https://active-tiger-63.clerk.accounts.dev/v1/oauth_callback`
     - Replace with your actual Clerk frontend API URL (find in Clerk Dashboard → API Keys)

3. Add **API Permissions** → **Microsoft Graph** → **Delegated**:
   - `User.Read`, `User.ReadBasic.All`, `User.ReadWrite.All`
   - `Directory.Read.All`, `Directory.ReadWrite.All`
   - `Group.Read.All`
   - `DeviceManagementManagedDevices.ReadWrite.All`
   - `offline_access`, `openid`, `profile`, `email`

4. Create **Client Secret**:
   - Go to **Certificates & secrets** → **New client secret**
   - Copy the secret value immediately!

5. Copy **Application (client) ID** from Overview page

### Step 2: Configure Clerk (3 minutes)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **SSO Connections** → **Microsoft**
3. Click **Enable** and enter:
   - **Client ID:** Paste from Azure
   - **Client Secret:** Paste from Azure
4. Add these to **Additional Scopes** (if available):
   ```
   User.Read User.ReadWrite.All Directory.Read.All Directory.ReadWrite.All
   Group.Read.All DeviceManagementManagedDevices.ReadWrite.All offline_access
   ```

### Step 3: Update Clerk JWT Template (2 minutes)

1. In Clerk Dashboard → **Sessions** → **Customize session token**
2. Add this line to your JWT template:
   ```json
   "oauth_token": "{{user.oauth_access_token_microsoft}}"
   ```
   
   Full template should look like:
   ```json
   {
     "email": "{{user.primary_email_address}}",
     "fullName": "{{user.full_name}}",
     "role": "{{user.public_metadata.role}}",
     "oauth_token": "{{user.oauth_access_token_microsoft}}"
   }
   ```

3. Click **Save**

### Step 4: Test (2 minutes)

1. Sign out of your app completely
2. Click **Sign in with Microsoft**
3. Authenticate with your Microsoft 365 account
4. Grant consent to requested permissions
5. You should be redirected back and see the dashboard with data!

---

## 🔍 How to Verify It's Working

### In Browser Console:

```javascript
// Get the session token
const token = await Clerk.session.getToken();

// Decode it at jwt.io - check for "oauth_token" field
console.log('Has OAuth token:', token.includes('eyJ')); // Should be true
```

### In Convex Logs:

Check your [Convex Dashboard](https://dashboard.convex.dev) logs for:

```
✅ JWT decoded: { hasGraphToken: true }
🎫 Using user's delegated OAuth token (Microsoft sign-in via Clerk)
🌐 Calling Graph API: https://graph.microsoft.com/v1.0/users
✅ Graph API response: 200
```

### Test Multi-Tenant:

1. Sign in with user from **Organization A**
   - Should work ✅
2. Sign out
3. Sign in with user from **Organization B** (different tenant)
   - Should also work ✅

---

## ⚠️ Common Issues

### "oauth_token is undefined"

The JWT template variable name might be different in your Clerk version. Try:
- `{{user.oauth_access_token_microsoft}}`
- `{{user.external_accounts.microsoft.oauth_access_token}}`
- Check Clerk docs or contact support for correct variable name

### "Graph API returns 401"

- Sign out and sign back in to get fresh token
- Verify all permissions are added in Azure
- Check that redirect URI matches exactly

### "Admin consent required"

Some permissions need organization admin approval:
1. Admin goes to Azure AD → Enterprise apps → Your app
2. Click **Permissions** → **Grant admin consent for [Organization]**

---

## 🎉 Benefits

With multi-tenant OAuth through Clerk:

- ✅ **Works with any organization** - No tenant ID hardcoding
- ✅ **Secure delegated access** - Users access their own organization's data
- ✅ **No backend secrets needed** - OAuth token comes from user's authentication
- ✅ **Proper audit trail** - Actions tied to actual user accounts
- ✅ **Automatic token refresh** - Clerk handles token renewal

---

## 📚 Full Documentation

For complete setup details, see:
- `CLERK_MICROSOFT_OAUTH_SETUP.md` - Complete Azure & Clerk setup guide
- `CLERK_JWT_SETUP.md` - JWT template configuration
- Clerk docs: https://clerk.com/docs/authentication/social-connections/oauth

---

## 🆘 Need Help?

1. Check the full setup guide in `CLERK_MICROSOFT_OAUTH_SETUP.md`
2. Verify Azure app is set to "Any organizational directory"
3. Confirm Clerk redirect URI matches Azure exactly
4. Test JWT token has `oauth_token` field at jwt.io
5. Check Convex logs for detailed error messages

The backend is already deployed and ready - just need to complete Clerk & Azure setup!
