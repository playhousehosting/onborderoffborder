# Convex SSO Configuration Guide

## Overview

This guide provides step-by-step instructions to configure Microsoft 365 SSO (Single Sign-On) with Convex Auth. The SSO login errors you're experiencing are due to missing environment variables in your Convex deployment.

## Error Messages You Might See

- `[CONVEX A(auth:signIn)] [Request ID: xxxxx] Server Error`
- `SSO login error: Error: [CONVEX A(auth:signIn)] Server Error`
- Authentication redirect fails silently

## Root Cause

The Convex Auth AzureAD provider requires three environment variables to be configured in your Convex deployment dashboard:

1. `AUTH_AZURE_AD_ID` - Your Azure AD Application (Client) ID
2. `AUTH_AZURE_AD_SECRET` - Your Azure AD Client Secret
3. `AUTH_AZURE_AD_ISSUER` - Your Azure AD Tenant ID as an issuer URL

## Step-by-Step Configuration

### 1. Get Your Azure AD Credentials

If you haven't already, you need to register an application in Azure AD:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration** or select your existing app
4. Note down:
   - **Application (client) ID** - This is your `AUTH_AZURE_AD_ID`
   - **Directory (tenant) ID** - You'll use this for `AUTH_AZURE_AD_ISSUER`

### 2. Create a Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description (e.g., "Convex SSO Production")
4. Choose an expiration period
5. Click **Add**
6. **IMPORTANT**: Copy the secret **Value** immediately - This is your `AUTH_AZURE_AD_SECRET`
   - You won't be able to see it again!

### 3. Configure Redirect URIs

In your Azure AD app registration **Authentication** section:

1. Click **Add a platform** → **Web**
2. Add these redirect URIs:
   ```
   https://neighborly-manatee-845.convex.site/api/auth/callback/azure-ad
   http://localhost:3000/api/auth/callback/azure-ad
   ```
   
   **Note**: Replace `neighborly-manatee-845` with your actual Convex deployment subdomain if different.

3. Enable **ID tokens** checkbox
4. Click **Save**

### 4. Configure API Permissions

Ensure your app has these **delegated permissions**:

- `openid` - Required for SSO
- `profile` - User profile information
- `email` - User email address  
- `User.Read` - Read signed-in user profile
- `offline_access` - Refresh tokens (optional)

Click **Grant admin consent for [Your Organization]** after adding permissions.

### 5. Set Environment Variables in Convex Dashboard

This is the **critical step** that fixes the SSO errors:

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project: **neighborly-manatee-845** (or your project name)
3. Go to **Settings** → **Environment Variables**
4. Click **Add Environment Variable** and add these three variables:

   | Variable Name | Value | Example |
   |---------------|-------|---------|
   | `AUTH_AZURE_AD_ID` | Your Application (Client) ID | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
   | `AUTH_AZURE_AD_SECRET` | Your Client Secret Value | `Abc123~DefGhi456.JklMno789_PqrStu` |
   | `AUTH_AZURE_AD_ISSUER` | `https://login.microsoftonline.com/{TENANT_ID}/v2.0` | `https://login.microsoftonline.com/12345678-90ab-cdef-1234-567890abcdef/v2.0` |

   **Important**: For `AUTH_AZURE_AD_ISSUER`, replace `{TENANT_ID}` with your actual Directory (tenant) ID.

5. Click **Save** for each variable

### 6. Deploy Your Convex Functions

After setting environment variables, you need to redeploy your Convex functions to pick up the configuration:

```bash
npx convex deploy
```

This ensures the auth configuration is refreshed with the new environment variables.

### 7. Verify Configuration

After deployment, test the SSO login:

1. Navigate to your application login page
2. Click **"Sign in with Microsoft 365"**
3. You should be redirected to Microsoft login
4. After authentication, you should be redirected back to your app
5. Check browser console for any errors

## Troubleshooting

### Still Getting "Server Error"?

**Check Convex Logs**:
1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Go to **Logs** tab
4. Look for errors around the time you attempted SSO login
5. Common issues:
   - `Missing AUTH_AZURE_AD_ID` - Environment variable not set
   - `Invalid client secret` - Wrong secret or expired
   - `Invalid issuer` - Check tenant ID in issuer URL

### "Redirect URI mismatch" Error

**Fix**: Ensure the redirect URI in Azure AD exactly matches:
```
https://your-convex-subdomain.convex.site/api/auth/callback/azure-ad
```

Note the provider name at the end is `azure-ad` (matching the provider in `auth.config.ts`).

### Environment Variables Not Taking Effect

**Solution**: 
1. Verify variables are saved in Convex Dashboard
2. Run `npx convex deploy` to redeploy functions
3. Wait 30-60 seconds for deployment to complete
4. Try SSO login again

### Client Secret Expired

If your client secret expires:
1. Go to Azure Portal → App registrations → Your app
2. Go to **Certificates & secrets**
3. Delete the old secret
4. Create a new client secret
5. Update `AUTH_AZURE_AD_SECRET` in Convex Dashboard
6. Run `npx convex deploy`

## Security Best Practices

✅ **Use separate secrets for development and production**
- Create different app registrations or secrets for each environment

✅ **Set secret expiration**
- Azure allows 3 months, 6 months, 12 months, or 24 months
- Set a calendar reminder to rotate secrets before expiration

✅ **Never commit secrets to git**
- Secrets should only exist in Convex Dashboard environment variables
- The `.env.example` file should only contain placeholders

✅ **Grant minimal permissions**
- Only request the delegated permissions your app actually needs
- Review permissions periodically

✅ **Monitor authentication logs**
- Check Convex Dashboard logs regularly
- Set up alerts for repeated authentication failures

## Testing SSO

After configuration, test the following scenarios:

1. **New User Login**
   - User should be redirected to Microsoft login
   - After authentication, redirected back to app
   - Session should be created in Convex

2. **Returning User Login**
   - If still authenticated with Microsoft, should auto-login
   - If session expired, should prompt for login

3. **Logout**
   - User should be able to log out
   - Session should be cleared from Convex

## Alternative: Multi-Tenant Support

If you need to support multiple Azure AD tenants, you can configure the issuer as:

```
AUTH_AZURE_AD_ISSUER=https://login.microsoftonline.com/common/v2.0
```

This allows users from any Azure AD tenant to sign in. Make sure your app registration is set to **Multitenant** in Azure Portal.

## Next Steps

After SSO is working:

1. **Add Role-Based Access Control**: Map Azure AD groups to application roles
2. **Implement Audit Logging**: Track which user performed which actions
3. **Add Conditional Access**: Enforce MFA, device compliance via Azure AD
4. **Just-In-Time Provisioning**: Auto-create user profiles on first login

## Support

If you continue to experience issues:

1. Check Convex Dashboard logs for specific error messages
2. Verify all three environment variables are set correctly
3. Ensure redirect URIs match exactly (including `/azure-ad` at the end)
4. Review Azure AD app permissions and grant admin consent
5. Try creating a new client secret if the current one might be expired

## References

- [Convex Auth Documentation](https://labs.convex.dev/auth)
- [Microsoft Identity Platform](https://docs.microsoft.com/azure/active-directory/develop/)
- [OAuth 2.0 Authorization Code Flow](https://docs.microsoft.com/azure/active-directory/develop/v2-oauth2-auth-code-flow)
