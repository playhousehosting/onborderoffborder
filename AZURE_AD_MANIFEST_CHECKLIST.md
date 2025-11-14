# Azure AD Application Manifest Configuration Checklist

## Before Deploying Security Enhancements

Complete these steps in the Azure Portal to support the new admin consent feature:

### ✅ Step 1: Add Admin Consent Redirect URI

1. Navigate to: [Azure Portal](https://portal.azure.com) → **App Registrations**
2. Find your app: `Dynamic Endpoints` (Client ID: `3f4637ee-e352-4273-96a6-3996a4a7f8c0`)
3. Click **Authentication** in the left menu
4. Under **Platform configurations** → **Web**, add redirect URI:
   ```
   https://neighborly-manatee-845.convex.site/admin-consent-callback
   ```
5. Click **Save**

### ✅ Step 2: Verify Existing Redirect URIs

Your Web redirect URIs should now include:
- ✅ `https://neighborly-manatee-845.convex.site/api/auth/callback/microsoft-entra-id`
- ✅ `https://neighborly-manatee-845.convex.site/admin-consent-callback`

### ✅ Step 3: Verify API Permissions

Under **API Permissions**, confirm these are present:
- ✅ `openid` (Microsoft Graph, Delegated)
- ✅ `profile` (Microsoft Graph, Delegated)
- ✅ `email` (Microsoft Graph, Delegated)
- ✅ `User.Read` (Microsoft Graph, Delegated)
- ✅ `offline_access` (Microsoft Graph, Delegated)

### ✅ Step 4: Verify Multi-Tenant Settings

Under **Authentication**:
- **Supported account types**: `Accounts in any organizational directory (Any Azure AD directory - Multitenant)`
- **Allow public client flows**: `No` (we use PKCE for security)

Under **Overview**:
- **Tenant ID**: Should show as "common" for multi-tenant support

### ✅ Step 5: Verify Client Secret

Under **Certificates & secrets**:
- Confirm you have an active client secret
- The secret value should be set in Convex environment variables as `AUTH_AZURE_AD_CLIENT_SECRET`

## After Configuration

Once all checklist items are complete:

1. **Deploy the security enhancements:**
   ```powershell
   npx convex deploy --typecheck=disable -y
   ```

2. **Test SSO login:**
   - Navigate to your app
   - Click "Sign in with Microsoft"
   - Verify successful login

3. **Test admin consent flow:**
   - Navigate to: `https://neighborly-manatee-845.convex.site/admin-consent`
   - Sign in as a tenant administrator
   - Grant permissions for your organization
   - Verify redirect to callback URL

## Troubleshooting

### Error: "The reply URL specified in the request does not match the reply URLs configured"
- **Solution**: Double-check both redirect URIs are added to the Web platform configuration

### Error: "AADSTS50011: The redirect URI does not match"
- **Solution**: Ensure URLs are exact matches (no trailing slashes, correct https://)

### Error: "Admin consent not granted"
- **Solution**: User must be a Global Administrator or Application Administrator to grant consent

## Additional Resources

- [Microsoft Documentation: Redirect URI Configuration](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url)
- [Microsoft Documentation: Admin Consent](https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent)
- [Multi-Tenant Security Implementation](./MULTI_TENANT_SECURITY.md)
