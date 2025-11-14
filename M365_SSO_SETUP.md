# Microsoft 365 SSO Setup Guide

## Overview

This application now supports **Microsoft 365 Single Sign-On (SSO)** via Convex Auth, allowing users to sign in with their work accounts using OAuth 2.0.

## Setup Instructions

### 1. Azure AD App Registration

Update your existing Azure AD app registration to support OAuth redirects:

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Select your application
3. Go to **Authentication** → **Add a platform** → **Web**
4. Add redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/microsoft
   https://your-production-domain.com/api/auth/callback/microsoft
   https://neighborly-manatee-845.convex.site/api/auth/callback/microsoft
   ```
5. Enable **ID tokens** checkbox
6. Click **Save**

### 2. Update API Permissions

Ensure these **delegated permissions** are added (in addition to existing application permissions):

- `openid` - Required for SSO
- `profile` - User profile information
- `email` - User email address
- `User.Read` - Read signed-in user profile
- `offline_access` - Refresh tokens

Click **Grant admin consent** after adding.

### 3. Configure Environment Variables

The same Azure AD credentials work for both app-only and SSO modes. No additional environment variables needed!

**Convex Backend** (already configured):
```bash
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id
```

**Frontend** (already configured):
```bash
REACT_APP_CONVEX_URL=https://neighborly-manatee-845.convex.cloud
```

### 4. Deploy Convex Schema Changes

```bash
npx convex deploy
```

This will deploy:
- Updated schema with `authTables` (Convex Auth)
- New `auth.config.ts` with Microsoft provider
- New `ssoAuth.ts` mutations and queries
- HTTP routes for OAuth callback

### 5. Test SSO Login

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
