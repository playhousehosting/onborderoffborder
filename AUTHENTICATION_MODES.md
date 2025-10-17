# Authentication Modes Guide

The Employee Life Cycle Portal now supports **three distinct authentication modes**, each designed for different use cases and security requirements.

---

## 🔵 Mode 1: OAuth2 Interactive Sign-In (Delegated Permissions)

### What It Is
Standard Microsoft OAuth2 authentication where users sign in with their personal Microsoft account. All actions are performed **as the signed-in user** with their permissions.

### How It Works
1. User clicks "Sign in with Microsoft"
2. Redirected to Microsoft login page (or popup)
3. User enters credentials and consents to permissions
4. Access token issued with **delegated permissions**
5. All Graph API calls use the user's identity

### When to Use
- ✅ Regular employees with admin privileges
- ✅ When you need to track who performed each action
- ✅ When user-specific permissions are required
- ✅ Most common authentication method

### Requirements
- **Azure AD Configuration:**
  - Client ID (Application ID)
  - Tenant ID (Directory ID)
  - Platform: Single-page application (SPA)
  - Redirect URI: `http://localhost:3000` (and production URL)
- **API Permissions (Delegated):**
  - `User.Read` - Basic profile
  - `User.ReadWrite.All` - User management (requires admin consent)
  - `Group.ReadWrite.All` - Group management (requires admin consent)
  - `DeviceManagementManagedDevices.ReadWrite.All` - Device management (requires admin consent)
  - `Mail.Send` - Send emails
  - `Sites.ReadWrite.All` - SharePoint/OneDrive access (requires admin consent)
  - `Team.ReadWrite.All` - Teams management (requires admin consent)

### Setup Steps
1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Create new registration or select existing app
3. Under **Authentication** → Add platform → Single-page application
4. Add redirect URIs: `http://localhost:3000`, `https://yourapp.com`
5. Under **API permissions** → Add permissions → Microsoft Graph → Delegated permissions
6. Select all required permissions listed above
7. Click **Grant admin consent** (requires Global Admin or Privileged Role Admin)
8. Copy **Client ID** and **Tenant ID**
9. In the app, paste these into the configuration form (leave Client Secret blank)
10. Click "Save Configuration" → Automatically signs you in → Dashboard

### Security Notes
- ✅ **Secure**: No secrets exposed to browser
- ✅ **Auditable**: All actions tracked to the signed-in user
- ✅ **Recommended**: Best practice for SPA applications
- ⚠️ **Limitation**: User must have sufficient Azure AD permissions

---

## 🟣 Mode 2: App-Only Authentication (Application Permissions)

### What It Is
Client Credentials flow using a client secret. The application authenticates **as itself** (not as a user) with **application permissions**. Actions are performed by the "app" identity.

### How It Works
1. User clicks "Authenticate with Client Credentials"
2. App uses Client ID + Client Secret + Tenant ID
3. Requests access token directly from Azure AD (no user interaction)
4. Access token issued with **application permissions**
5. All Graph API calls use the app's identity (not a user)

### When to Use
- ✅ Automated background tasks (scheduled offboarding, bulk operations)
- ✅ Service accounts / daemon applications
- ✅ When no user context is needed
- ✅ Batch processing, nightly jobs
- ⚠️ **Production**: Should only run on a secure backend server

### Requirements
- **Azure AD Configuration:**
  - Client ID (Application ID)
  - Tenant ID (Directory ID)
  - **Client Secret** (from Certificates & secrets)
  - Platform: Web application (not SPA)
- **API Permissions (Application):**
  - `User.ReadWrite.All` - User management
  - `Group.ReadWrite.All` - Group management
  - `DeviceManagementManagedDevices.ReadWrite.All` - Device management
  - `Mail.Send` - Send emails as any user or shared mailbox
  - `Sites.ReadWrite.All` - SharePoint/OneDrive access
  - All require **admin consent**

### Setup Steps
1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Create new registration (or use existing)
3. Under **Certificates & secrets** → New client secret → Copy the **Value** (not Secret ID)
4. Under **API permissions** → Add permissions → Microsoft Graph → **Application permissions**
5. Select required application permissions
6. Click **Grant admin consent** (required for app-only)
7. Copy **Client ID**, **Tenant ID**, and **Client Secret**
8. In the app configuration form, enter all three values
9. Click "Save Configuration" → Auto-login with App-Only mode → Dashboard

### Security Notes
- ⚠️ **Client Secret in Browser**: **INSECURE** for production
- ⚠️ **Production Requirement**: Move to backend server with environment variables
- ⚠️ **Risk**: Anyone with client secret can act as the app (full permissions)
- ✅ **Development**: OK for local testing only
- 🔒 **Best Practice**: Use certificate-based authentication on server, or Managed Identity in Azure

### Production Architecture (Recommended)
```
Browser (SPA)
    ↓ HTTPS
Backend Server (Node.js/Express)
    ↓ Client Credentials Flow (with secret)
Microsoft Graph API
```

**Backend should:**
- Store client secret in environment variables (never in code)
- Use certificate authentication (more secure than secrets)
- Implement rate limiting and logging
- Validate user permissions before executing admin actions
- Use Managed Identity if hosted on Azure

---

## 🟡 Mode 3: Demo Mode

### What It Is
Simulated authentication with **mock data**. No real Azure AD connection, no API calls, no credentials required.

### How It Works
1. User clicks "Try Demo Mode"
2. App creates a mock user in localStorage
3. All Graph API calls return fake data (4 mock users, 2 mock devices)
4. Full UI functionality with safe, sandboxed data

### When to Use
- ✅ Exploring features without Azure AD setup
- ✅ Demonstrations, screenshots, videos
- ✅ Testing UI changes without API calls
- ✅ Training new users
- ✅ Prototyping before production setup

### Requirements
- **None!** Works out of the box

### Setup Steps
1. Click "Try Demo Mode" on login page
2. Instantly logged in as "Demo User"
3. Browse dashboard, users, devices, etc. with mock data

### Security Notes
- ✅ **Safe**: No real data, no API calls
- ✅ **Privacy**: No credentials needed
- ⚠️ **Limitation**: Changes don't persist, data is fake
- ℹ️ **Indicator**: Yellow "Demo Mode Active" banner shown throughout app

---

## 🎯 Quick Comparison

| Feature | OAuth2 Interactive | App-Only | Demo Mode |
|---------|-------------------|----------|-----------|
| **User Login** | Yes, Microsoft account | No (app authenticates) | No (mock user) |
| **Requires Credentials** | Yes (Client ID, Tenant ID) | Yes (+ Client Secret) | No |
| **Permission Type** | Delegated (as user) | Application (as app) | N/A (mock) |
| **User Context** | Signed-in user | No user (app identity) | Mock user |
| **Audit Trail** | User's actions | App's actions | None (fake data) |
| **Production Ready** | ✅ Yes (SPA-safe) | ⚠️ No (needs backend) | ❌ No (demo only) |
| **Best For** | Regular users, admins | Automation, batch jobs | Demos, testing |
| **Security Risk** | Low (no secrets) | High (secret in browser) | None (no real data) |

---

## 🔄 New Auto-Login Feature

After configuring Azure AD credentials, the app now **automatically signs you in** and redirects to the dashboard!

### How It Works
1. Enter Client ID, Tenant ID (and optionally Client Secret)
2. Click "Save Configuration"
3. Page reloads with new config
4. **Automatically determines auth mode:**
   - If **Client Secret** provided → App-Only auth
   - If **no Client Secret** → OAuth2 interactive sign-in
5. Redirected to `/dashboard`

### Why?
- **Faster workflow**: No need to click "Sign in" after configuring
- **Better UX**: One-step setup and authentication
- **Smart detection**: Automatically picks the right auth mode

---

## 🛠️ Switching Between Modes

You can easily switch authentication modes on the login page:

1. **Tab Selector**: Click OAuth2, App-Only, or Demo at the top
2. Each mode shows:
   - Clear description
   - When to use it
   - Requirements
   - Dedicated button with appropriate color
3. Configuration is shared (Client ID, Tenant ID apply to both OAuth2 and App-Only)

---

## 🚨 Important Security Warnings

### Never Do This in Production:
- ❌ Store client secrets in localStorage
- ❌ Expose client secrets in browser code or network traffic
- ❌ Use App-Only authentication from a browser-based SPA
- ❌ Commit secrets to Git repositories

### Always Do This in Production:
- ✅ Use OAuth2 for browser-based apps
- ✅ Store secrets in environment variables on server
- ✅ Use certificate authentication for app-only flows
- ✅ Implement proper logging and audit trails
- ✅ Use Managed Identity when hosting on Azure
- ✅ Rotate secrets regularly
- ✅ Monitor for suspicious activity

---

## 📝 Configuration Examples

### OAuth2 Only (Recommended for Browser)
```json
{
  "clientId": "3f4637ee-e352-4273-96a6-3996a4a7f8c0",
  "tenantId": "0851dcc0-890e-4381-b82d-c14fe2915be3"
}
```
**Result**: OAuth2 interactive sign-in only

### OAuth2 + App-Only (Development Testing)
```json
{
  "clientId": "3f4637ee-e352-4273-96a6-3996a4a7f8c0",
  "tenantId": "0851dcc0-890e-4381-b82d-c14fe2915be3",
  "clientSecret": "your-secret-value"
}
```
**Result**: Both OAuth2 and App-Only available (auto-picks App-Only on save)

---

## 🐛 Troubleshooting

### OAuth2 Login Fails
- Check redirect URIs in Azure AD match exactly
- Ensure app is registered as Single-page application (SPA)
- Verify API permissions are granted (admin consent required)
- Clear browser cache and sessionStorage

### App-Only Login Fails
- Verify client secret is correct (secrets expire!)
- Check Application permissions (not Delegated) are granted
- Ensure admin consent was clicked
- Check secret hasn't expired (Azure AD → Certificates & secrets)

### After Config Save, No Auto-Login
- Check browser console for errors
- Verify `sessionStorage` has `autoLogin: true` flag
- Check MSAL initialization succeeded
- Clear localStorage and try again

---

## 📚 Additional Resources

- [Microsoft Identity Platform Documentation](https://learn.microsoft.com/en-us/azure/active-directory/develop/)
- [MSAL.js Documentation](https://learn.microsoft.com/en-us/azure/active-directory/develop/msal-overview)
- [Microsoft Graph API Permissions Reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Client Credentials Flow (App-Only)](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow)
- [OAuth 2.0 Authorization Code Flow (Interactive)](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)

---

## 🎉 Summary

Your Employee Life Cycle Portal now offers **three flexible authentication options**:

1. **OAuth2** - Secure, user-based sign-in (recommended for production)
2. **App-Only** - Powerful app-based auth (use backend server in production)
3. **Demo Mode** - No setup required, instant exploration

Choose the mode that fits your needs, configure once, and get **automatically signed in** to start managing your employee lifecycle!
