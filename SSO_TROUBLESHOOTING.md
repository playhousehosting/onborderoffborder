# SSO Troubleshooting Guide

## Common Error: Server Error During SSO Login

### Error Message
```
[CONVEX A(auth:signIn)] [Request ID: xxxxx] Server Error
SSO login error: Error: [CONVEX A(auth:signIn)] Server Error
```

### Root Cause
This error occurs when Convex Auth environment variables are not configured in your Convex deployment.

### Solution
Configure these three environment variables in your Convex Dashboard:

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project (e.g., "neighborly-manatee-845")
3. Navigate to **Settings** → **Environment Variables**
4. Add these variables:

| Variable | Value | Where to Find |
|----------|-------|---------------|
| `AUTH_AZURE_AD_ID` | Your Azure AD Application (Client) ID | Azure Portal → App registrations → Your app → Overview |
| `AUTH_AZURE_AD_SECRET` | Your Azure AD Client Secret | Azure Portal → App registrations → Your app → Certificates & secrets |
| `AUTH_AZURE_AD_ISSUER` | `https://login.microsoftonline.com/{TENANT_ID}/v2.0` | Use your Directory (tenant) ID from Azure Portal |

5. Click **Save** after adding each variable
6. Deploy your Convex functions:
   ```bash
   npx convex deploy
   ```

### Verification
After configuration:
1. Wait 30-60 seconds for deployment to complete
2. Clear browser cache and cookies
3. Try SSO login again
4. Check Convex Dashboard → Logs for any new errors

## Other Common Issues

### Issue: Redirect URI Mismatch

**Error Message**: `redirect_uri_mismatch` or similar OAuth error

**Solution**:
1. Go to Azure Portal → App registrations → Your app → Authentication
2. Add this exact redirect URI:
   ```
   https://neighborly-manatee-845.convex.site/api/auth/callback/azure-ad
   ```
3. Replace `neighborly-manatee-845` with your actual Convex subdomain
4. Note: Path ends with `/azure-ad` (not `/microsoft`)

### Issue: Invalid Client Secret

**Error Message**: `invalid_client` or authentication fails silently

**Solution**:
1. Client secret may have expired
2. Go to Azure Portal → App registrations → Your app → Certificates & secrets
3. Create a new client secret
4. Copy the **Value** immediately (you won't see it again)
5. Update `AUTH_AZURE_AD_SECRET` in Convex Dashboard
6. Run `npx convex deploy`

### Issue: Missing Permissions

**Error Message**: `insufficient_claims` or `consent_required`

**Solution**:
1. Go to Azure Portal → App registrations → Your app → API permissions
2. Ensure these delegated permissions are added:
   - `openid`
   - `profile`
   - `email`
   - `User.Read`
3. Click **Grant admin consent for [Your Organization]**
4. Wait 5 minutes for changes to propagate
5. Try SSO login again

### Issue: SSO Button Does Nothing

**Possible Causes**:
1. Convex Auth package not installed
2. Environment variables not set
3. Browser blocking redirects

**Solutions**:
1. Verify package installed: `npm list @convex-dev/auth`
2. Check browser console for errors (F12)
3. Check Convex Dashboard logs
4. Try in an incognito/private window
5. Disable browser extensions that might block redirects

### Issue: Authentication Success But No Session Created

**Symptoms**: User is redirected back but not logged in

**Solution**:
1. Check that `createSSOSession` mutation exists in `convex/ssoAuth.ts`
2. Verify schema includes `convexAuthUserId` field in sessions table
3. Check Convex logs for mutation errors
4. Ensure `by_convex_auth_user` index exists on sessions table

## Quick Diagnosis Checklist

Run through this checklist to identify the issue:

- [ ] Three environment variables set in Convex Dashboard
  - [ ] `AUTH_AZURE_AD_ID`
  - [ ] `AUTH_AZURE_AD_SECRET`
  - [ ] `AUTH_AZURE_AD_ISSUER`
- [ ] Convex functions deployed after setting environment variables
- [ ] Redirect URI added to Azure AD app registration
- [ ] Redirect URI exactly matches: `https://[subdomain].convex.site/api/auth/callback/azure-ad`
- [ ] Delegated permissions added and admin consent granted
- [ ] Client secret is valid and not expired
- [ ] Browser console shows no CORS or network errors
- [ ] Convex Dashboard logs show no errors

## Getting Help

If you've tried all the above and SSO still doesn't work:

1. **Check Convex Logs**:
   - Go to Convex Dashboard → Logs
   - Filter by "auth" or "signIn"
   - Look for error messages with details

2. **Check Browser Console**:
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for errors when clicking SSO button

3. **Verify Configuration**:
   - Review [CONVEX_SSO_CONFIGURATION.md](./CONVEX_SSO_CONFIGURATION.md)
   - Ensure every step was completed
   - Double-check environment variable values (no typos)

4. **Test with Different User**:
   - Try logging in with a different Microsoft account
   - This helps identify if the issue is user-specific

5. **Check Azure AD Status**:
   - Go to Azure Portal → Azure Active Directory → App registrations → Your app
   - Check Sign-ins log to see if authentication attempts are being recorded
   - Look for any error codes or failure reasons

## Environment Variable Examples

Here are examples of correctly formatted environment variables:

### AUTH_AZURE_AD_ID
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890
```
- 36 characters with hyphens
- Alphanumeric only
- Found in Azure Portal → Overview

### AUTH_AZURE_AD_SECRET
```
Abc123~DefGhi456.JklMno789_PqrStu
```
- Can contain: letters, numbers, ~, ., _, -
- Created in Certificates & secrets section
- Copy the **Value** column, not the Secret ID

### AUTH_AZURE_AD_ISSUER
```
https://login.microsoftonline.com/12345678-90ab-cdef-1234-567890abcdef/v2.0
```
- Must start with `https://login.microsoftonline.com/`
- Replace `{TENANT_ID}` with your actual tenant ID (36 characters)
- Must end with `/v2.0`

**For multi-tenant apps**, use:
```
https://login.microsoftonline.com/common/v2.0
```

## Testing Your Configuration

After fixing the configuration, test with these steps:

1. **Clear Everything**:
   ```bash
   # Clear browser cache and cookies
   # Or use incognito/private window
   ```

2. **Check Convex Deployment**:
   ```bash
   npx convex deploy
   # Wait for "Deployment complete" message
   ```

3. **Test SSO Login**:
   - Navigate to your login page
   - Click "Sign in with Microsoft 365"
   - You should be redirected to Microsoft login page
   - After login, you should be redirected back to your app
   - You should see your profile information

4. **Verify Session**:
   - Check browser localStorage for `sessionId`
   - Open Convex Dashboard → Data → sessions table
   - You should see a new session record with your user info

## Support Resources

- [Convex Auth Documentation](https://labs.convex.dev/auth)
- [Microsoft Identity Platform Docs](https://docs.microsoft.com/azure/active-directory/develop/)
- [Complete Setup Guide](./CONVEX_SSO_CONFIGURATION.md)
- [Quick Setup](./M365_SSO_SETUP.md)
