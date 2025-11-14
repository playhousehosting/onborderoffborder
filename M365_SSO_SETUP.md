# Microsoft 365 SSO Setup Guide

## ⚠️ IMPORTANT: Configuration Required

If you're seeing SSO login errors like `[CONVEX A(auth:signIn)] Server Error`, this means the Convex Auth environment variables are **not yet configured**.

### 🚀 Quick Fix (5 Minutes)
**👉 [QUICK_FIX_SSO_ERRORS.md](./QUICK_FIX_SSO_ERRORS.md)** - Fast, step-by-step fix for the error

### 📖 Complete Guides
- **[CONVEX_SSO_CONFIGURATION.md](./CONVEX_SSO_CONFIGURATION.md)** - Comprehensive setup with explanations
- **[SSO_TROUBLESHOOTING.md](./SSO_TROUBLESHOOTING.md)** - Troubleshooting common issues
- **[SSO_CONFIGURATION_CHECKLIST.md](./.github/SSO_CONFIGURATION_CHECKLIST.md)** - Printable checklist

## Quick Start

### Prerequisites
- Azure AD app registration with client ID, client secret, and tenant ID
- Access to [Convex Dashboard](https://dashboard.convex.dev) for your project

### Critical Configuration Steps

1. **Set Environment Variables in Convex Dashboard** (Settings → Environment Variables):
   - `AUTH_AZURE_AD_ID` = Your Azure AD Application (Client) ID
   - `AUTH_AZURE_AD_SECRET` = Your Azure AD Client Secret  
   - `AUTH_AZURE_AD_ISSUER` = `https://login.microsoftonline.com/{TENANT_ID}/v2.0`

2. **Configure Redirect URI in Azure AD**:
   ```
   https://neighborly-manatee-845.convex.site/api/auth/callback/azure-ad
   ```

3. **Deploy Convex Functions**:
   ```bash
   npx convex deploy
   ```

## Overview

This application now supports **Microsoft 365 Single Sign-On (SSO)** via Convex Auth, allowing users to sign in with their work accounts using OAuth 2.0.

## Detailed Setup Instructions

For complete step-by-step instructions including:
- Getting Azure AD credentials
- Creating client secrets
- Configuring redirect URIs
- Setting Convex environment variables
- Troubleshooting common errors

**See: [CONVEX_SSO_CONFIGURATION.md](./CONVEX_SSO_CONFIGURATION.md)**

## Quick Reference: Azure AD App Configuration

### 1. Redirect URIs (Authentication section)
```
http://localhost:3000/api/auth/callback/azure-ad
https://your-production-domain.com/api/auth/callback/azure-ad  
https://neighborly-manatee-845.convex.site/api/auth/callback/azure-ad
```

**Note**: The path ends with `/azure-ad` (not `/microsoft`)

### 2. Delegated API Permissions

- `openid` - Required for SSO
- `profile` - User profile information
- `email` - User email address
- `User.Read` - Read signed-in user profile
- `offline_access` - Refresh tokens (optional)

Click **Grant admin consent** after adding permissions.

### 3. Client Secret

Create a client secret in Azure AD (Certificates & secrets section) and save the **Value** immediately - you won't be able to see it again!

## Testing SSO Login

After configuration:

1. Navigate to login page
2. Click **"Sign in with Microsoft 365"** button
3. You'll be redirected to Microsoft login
4. After authentication, you'll be redirected back to the dashboard
5. Your session is automatically created and linked to your Microsoft account

## Authentication Modes Comparison

| Feature | App-Only Mode | OAuth2 Mode | **SSO Mode (NEW)** |
|---------|---------------|-------------|---------------------|
| **Authentication** | Client credentials | Interactive MSAL | Convex Auth OAuth |
| **User Context** | Service account | Delegated user | Delegated user |
| **Token Storage** | Encrypted in Convex | MSAL cache | Convex Auth managed |
| **Setup Complexity** | Manual credentials | Manual credentials | One-click login |
| **Best For** | Scheduled tasks | Admin operations | End users |
| **Audit Trail** | Application-level | User-specific | User-specific |
| **Token Refresh** | Manual | MSAL automatic | Convex Auth automatic |

## Benefits of SSO

✅ **Seamless Experience**: Users click one button to sign in  
✅ **Enhanced Security**: No credential storage in browser  
✅ **User-Specific Audit**: Each action tied to individual user  
✅ **Automatic Refresh**: Convex Auth handles token lifecycle  
✅ **Azure AD Integration**: Leverages existing identity infrastructure  
✅ **Multi-Factor Auth**: Supports Azure AD MFA and Conditional Access  

## Hybrid Mode (Recommended)

You can use **both SSO and app-only modes** in the same deployment:

- **SSO**: For end users performing manual operations
- **App-Only**: For scheduled tasks, background jobs, and service accounts

The application automatically detects the authentication mode and adjusts behavior accordingly.

## Troubleshooting

### "Redirect URI mismatch" error

**Fix**: Add the exact redirect URI to Azure AD app registration:
```
https://your-convex-deployment.convex.site/api/auth/callback/microsoft
```

### SSO button not working

**Check**:
1. Convex Auth package installed: `npm list @convex-dev/auth`
2. Schema deployed: `npx convex deploy`
3. Environment variables set in Convex dashboard
4. Browser console for errors

### User sees "Unauthorized" after SSO login

**Fix**: Ensure `createSSOSession` mutation is called after successful OAuth callback. Check Convex dashboard logs.

### SSO vs OAuth2 mode confusion

- **OAuth2 mode** = Old MSAL-based interactive login (kept for compatibility)
- **SSO mode** = New Convex Auth Microsoft OAuth (recommended for new users)

Both work, but SSO mode is simpler and better integrated with Convex.

## Next Steps

After implementing SSO, consider:

1. **Role-Based Access Control**: Map Azure AD groups to application roles
2. **Conditional Access**: Enforce MFA, device compliance, etc.
3. **Just-In-Time Provisioning**: Auto-create sessions based on Azure AD groups
4. **Audit Logging**: Track which user performed which actions
5. **License Management**: Only grant access to users with specific licenses

## Documentation

- [Convex Auth Docs](https://docs.convex.dev/auth)
- [Microsoft Identity Platform](https://docs.microsoft.com/azure/active-directory/develop/)
- [OAuth 2.0 Authorization Code Flow](https://docs.microsoft.com/azure/active-directory/develop/v2-oauth2-auth-code-flow)
