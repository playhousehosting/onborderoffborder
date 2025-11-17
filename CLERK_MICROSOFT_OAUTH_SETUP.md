# Clerk Microsoft OAuth Setup for Multi-Tenant Graph API Access

## Overview

This guide shows you how to configure Clerk to enable **multi-tenant Microsoft sign-in** and pass the Microsoft Graph OAuth token to your backend, allowing users to access Graph API with their own credentials.

---

## 🎯 Why This Matters

When users sign in with Microsoft through Clerk:
- ✅ **Multi-tenant support** - Works with any organization's Microsoft 365
- ✅ **Delegated permissions** - Users access Graph API with their own permissions
- ✅ **No app-only credentials needed** - Each user authenticates with their own account
- ✅ **Secure** - OAuth token is validated by Clerk and passed securely to backend

---

## 📋 Step 1: Configure Microsoft OAuth Provider in Clerk

### 1.1 Go to Clerk Dashboard

1. Visit [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your application: **Employee Offboarding Portal**
3. In the left sidebar, click **SSO Connections** (or **Authentication** → **Social connections**)

### 1.2 Enable Microsoft

1. Find **Microsoft** in the list of providers
2. Click **Enable** or **Configure**
3. You'll need to provide:
   - **Client ID** (Application ID from Azure)
   - **Client Secret** (from Azure app registration)

---

## 📋 Step 2: Configure Azure App Registration for Clerk

### 2.1 Create/Update Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Create a new registration or select your existing one
4. Configure the following:

**Name:** `Employee Lifecycle Portal - Clerk OAuth`

**Supported account types:** 
- ✅ **Accounts in any organizational directory (Any Azure AD directory - Multitenant)**
- This enables multi-tenant support!

**Redirect URI:**
- Platform: **Web**
- URI: `https://clerk.yourapp.com/v1/oauth_callback` 
  - Replace with your actual Clerk frontend API URL
  - Find this in Clerk Dashboard → **API Keys** → Look for "Frontend API"
  - Example: `https://active-tiger-63.clerk.accounts.dev/v1/oauth_callback`

### 2.2 Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph** → **Delegated permissions**
4. Add these permissions:

**Required Permissions:**
- ✅ `User.Read` - Read user profile
- ✅ `User.ReadBasic.All` - Read basic user info
- ✅ `User.ReadWrite.All` - Read and write all users (for admin features)
- ✅ `Directory.Read.All` - Read directory data
- ✅ `Directory.ReadWrite.All` - Read and write directory data
- ✅ `Group.Read.All` - Read all groups
- ✅ `DeviceManagementManagedDevices.ReadWrite.All` - Intune device management
- ✅ `offline_access` - Maintain access to data (refresh token)
- ✅ `openid` - Sign in and read user profile
- ✅ `profile` - View user's basic profile
- ✅ `email` - View user's email address

5. Click **Add permissions**

> **Note:** Some permissions may require admin consent. Users signing in will see a consent screen if their organization requires it.

### 2.3 Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Description: `Clerk OAuth Secret`
4. Expires: Choose appropriate duration (24 months recommended)
5. Click **Add**
6. **COPY THE SECRET VALUE IMMEDIATELY** - You won't be able to see it again!

### 2.4 Copy Application (Client) ID

1. Go to **Overview** page of your app registration
2. Copy the **Application (client) ID**
3. You'll need this for Clerk configuration

---

## 📋 Step 3: Configure Clerk with Azure Credentials

### 3.1 Add Microsoft OAuth Provider

1. Back in Clerk Dashboard → **SSO Connections** → **Microsoft**
2. Enter your Azure credentials:
   - **Client ID**: Paste the Application (client) ID from Azure
   - **Client Secret**: Paste the client secret you created
3. Click **Save**

### 3.2 Configure OAuth Scopes

In the Microsoft OAuth settings, ensure these scopes are requested:

```
openid profile email offline_access
User.Read User.ReadBasic.All User.ReadWrite.All
Directory.Read.All Directory.ReadWrite.All
Group.Read.All
DeviceManagementManagedDevices.ReadWrite.All
```

> Clerk may have a field for "Additional scopes" or "Custom scopes" where you can add these.

---

## 📋 Step 4: Update Clerk JWT Template to Include OAuth Token

### 4.1 Navigate to JWT Template Settings

1. In Clerk Dashboard, go to **Sessions**
2. Find **Customize session token**
3. Click **Edit**

### 4.2 Add OAuth Token to JWT

Update your JWT template to include the Microsoft OAuth access token:

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
  "role": "{{user.public_metadata.role}}",
  "oauth_token": "{{user.oauth_access_token_microsoft}}"
}
```

### 4.3 Save the Template

Click **Save** to apply the changes.

> **Important:** The exact variable name for the OAuth token may vary. Check Clerk's documentation or test with different formats:
> - `{{user.oauth_access_token_microsoft}}`
> - `{{user.external_accounts.microsoft.oauth_access_token}}`
> - `{{oauth.microsoft.access_token}}`

---

## 📋 Step 5: Test Multi-Tenant Microsoft Sign-In

### 5.1 Sign Out of Your App

Make sure you're completely signed out.

### 5.2 Sign In with Microsoft

1. Click **Sign in with Microsoft** on your login page
2. You'll be redirected to Microsoft's login
3. Sign in with your Microsoft 365 account (any organization)
4. Grant consent to the requested permissions
5. You'll be redirected back to your app

### 5.3 Verify OAuth Token in JWT

Open browser DevTools and run:

```javascript
// Get session token
const token = await Clerk.session.getToken();
console.log('Token:', token);

// Decode JWT (copy token and paste at jwt.io)
```

Check that the `oauth_token` field is present in the decoded JWT.

---

## 🔍 How It Works

### Authentication Flow

```
User → Clicks "Sign in with Microsoft"
     → Redirected to Microsoft OAuth (login.microsoftonline.com)
     → User authenticates with their Microsoft 365 account
     → Microsoft issues OAuth token with delegated permissions
     → User redirected back to Clerk
     → Clerk validates OAuth token
     → Clerk creates session with OAuth token embedded in JWT
     → User accesses your app
     → Frontend sends JWT to backend (clerkProxy.ts)
     → Backend extracts OAuth token from JWT
     → Backend uses OAuth token to call Microsoft Graph API
     → Graph API returns data for that specific user's organization
```

### Multi-Tenant Benefits

1. **Works with any organization** - No tenant ID hardcoded
2. **Delegated permissions** - Users access data they have permission for
3. **Secure** - Each user's token is scoped to their organization
4. **No admin consent needed** - Users consent for their own access

---

## 🧪 Testing & Verification

### Test with Multiple Organizations

1. Sign in with user from **Organization A**
   - Should see users/devices from Organization A only
2. Sign out
3. Sign in with user from **Organization B**
   - Should see users/devices from Organization B only

### Verify Backend Logs

In your Convex logs (https://dashboard.convex.dev), you should see:

```
✅ JWT decoded: { sub: 'user_xxx', hasGraphToken: true }
✅ Clerk user authenticated: user_xxx user@example.com
🎫 Using user's delegated OAuth token (Microsoft sign-in via Clerk)
🌐 Calling Graph API: https://graph.microsoft.com/v1.0/users
✅ Graph API response: 200
```

---

## 🆘 Troubleshooting

### "oauth_token is undefined" in JWT

**Cause:** OAuth token not being included in JWT template

**Solutions:**
1. Try different variable names in JWT template:
   ```json
   "oauth_token": "{{user.oauth_access_token_microsoft}}"
   "oauth_token": "{{user.external_accounts.microsoft.oauth_access_token}}"
   ```
2. Check Clerk's documentation for the correct variable name
3. Contact Clerk support to confirm OAuth token variable syntax

### "Graph API returns 401 Unauthorized"

**Cause:** OAuth token expired or missing required scopes

**Solutions:**
1. Sign out and sign back in to get fresh token
2. Verify all required scopes are configured in Azure app registration
3. Check that users granted consent to all permissions

### "Admin consent required"

**Cause:** Some permissions require admin consent for the organization

**Solutions:**
1. Organization admin needs to grant consent in Azure Portal:
   - Go to **Azure AD** → **Enterprise applications**
   - Find your app
   - Click **Permissions** → **Grant admin consent**
2. Or add this to your Azure app redirect URI to trigger admin consent:
   ```
   https://login.microsoftonline.com/organizations/adminconsent
   ?client_id=YOUR_CLIENT_ID
   &redirect_uri=YOUR_REDIRECT_URI
   ```

### "Clerk Microsoft OAuth not showing up"

**Cause:** Microsoft provider not enabled in Clerk

**Solutions:**
1. Check that Microsoft is enabled in Clerk Dashboard → SSO Connections
2. Verify client ID and secret are correctly entered
3. Try re-saving the configuration

---

## 📚 Additional Resources

- [Clerk OAuth Documentation](https://clerk.com/docs/authentication/social-connections/oauth)
- [Microsoft Identity Platform - Multi-tenant apps](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-convert-app-to-be-multi-tenant)
- [Microsoft Graph Delegated Permissions](https://docs.microsoft.com/en-us/graph/permissions-reference)
- [Clerk JWT Template Guide](https://clerk.com/docs/backend-requests/making/custom-session-token)

---

## ✅ Checklist

After completing setup:

- [ ] Azure app registration configured for multi-tenant (Any organizational directory)
- [ ] Redirect URI added in Azure: `https://your-clerk-frontend.clerk.accounts.dev/v1/oauth_callback`
- [ ] All required Microsoft Graph delegated permissions added
- [ ] Client secret created and copied
- [ ] Microsoft OAuth provider enabled in Clerk
- [ ] Client ID and secret configured in Clerk
- [ ] OAuth scopes configured in Clerk Microsoft settings
- [ ] JWT template updated to include `oauth_token`
- [ ] Tested sign-in with Microsoft account
- [ ] Verified OAuth token present in JWT
- [ ] Tested Graph API calls through backend proxy
- [ ] Verified multi-tenant support with different organizations

---

## 🎉 You're Ready!

Your application now supports:
- ✅ Multi-tenant Microsoft sign-in through Clerk
- ✅ Delegated Graph API access with user's OAuth token
- ✅ Secure backend proxy that validates Clerk JWT
- ✅ Support for users from any organization
- ✅ Fallback to app-only credentials for non-Microsoft users

Users can now sign in with their Microsoft 365 accounts from any organization and access Graph API data with their own permissions!
