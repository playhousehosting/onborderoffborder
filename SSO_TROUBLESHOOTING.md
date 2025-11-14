# SSO Authentication Troubleshooting

## Current Error
`[ERROR] 'server responded with an error in the response body'` when Azure AD callback tries to exchange authorization code for tokens.

## Azure AD Configuration Checklist

### 1. App Registration Overview
- App ID: `3f4637ee-e352-4273-96a6-3996a4a7f8c0`
- Tenant ID: `0851dcd0-904e-4381-b82d-c14fe29159e3`
- ✅ Supported account types: Multiple organizations

### 2. Authentication Settings
Go to: App registrations → Your app → Authentication

#### Web Platform Configuration
- ✅ Redirect URI added: `https://neighborly-manatee-845.convex.site/api/auth/callback/azure-ad`

#### Implicit grant and hybrid flows
Check these boxes:
- ☐ **Access tokens** (used for implicit flows)
- ☐ **ID tokens** (used for implicit and hybrid flows)

**⚠️ CRITICAL: Both checkboxes must be checked!**

### 3. API Permissions
Go to: App registrations → Your app → API permissions

#### Delegated Permissions (Microsoft Graph)
Required for SSO:
- ☐ `openid` - Sign users in
- ☐ `profile` - View users' basic profile
- ☐ `email` - View users' email address
- ☐ `User.Read` - Sign in and read user profile
- ☐ `offline_access` - Maintain access to data

**⚠️ After adding permissions, click "Grant admin consent for [Your Organization]"**

Status should show green checkmarks in the "Status" column.

### 4. Certificates & secrets
Go to: App registrations → Your app → Certificates & secrets

- ✅ Client secret: `iUn8Q~PZYvYamlGroHINt-jxFAMl6h~1hCnbF8`
- Make sure this secret is not expired

### 5. Token Configuration (Optional but Recommended)
Go to: App registrations → Your app → Token configuration

Add optional claims if needed:
- Email
- Family name
- Given name
- Preferred username

## Testing Steps

1. **Clear browser cache** completely (Ctrl+Shift+Delete)
2. **Open incognito/private window**
3. Navigate to: https://www.employeelifecyclepotral.com/login
4. Click "Sign in with Microsoft 365"
5. You should see Microsoft login page
6. After entering credentials, you should be redirected back to the dashboard

## Common Issues

### "server responded with an error"
**Causes:**
- ID tokens not enabled in Authentication settings
- API permissions not granted admin consent
- Client secret expired or incorrect
- Redirect URI mismatch

### "AADSTS50011: The redirect URI specified in the request does not match..."
**Solution:** Verify redirect URI is exactly: `https://neighborly-manatee-845.convex.site/api/auth/callback/azure-ad`

### "AADSTS65001: The user or administrator has not consented..."
**Solution:** Grant admin consent for API permissions

### "AADSTS700016: Application not found in the directory"
**Solution:** Check that the app is registered in the correct tenant

## Current Convex Configuration

Environment variables set:
```
AUTH_AZURE_AD_ID=3f4637ee-e352-4273-96a6-3996a4a7f8c0
AUTH_AZURE_AD_SECRET=iUn8Q~PZYvYamlGroHINt-jxFAMl6h~1hCnbF8
AUTH_AZURE_AD_TENANT_ID=0851dcd0-904e-4381-b82d-c14fe29159e3
AUTH_REDIRECT_PROXY_URL=https://neighborly-manatee-845.convex.site
```

Code configuration (convex/authInit.ts):
```typescript
tenantId: "0851dcd0-904e-4381-b82d-c14fe29159e3"
scope: "openid profile email User.Read"
```

## Next Steps

1. **Check Authentication settings** - Verify ID tokens and Access tokens are enabled
2. **Check API permissions** - Verify all delegated permissions are added and admin consent granted
3. **Test again** - Clear cache and try SSO login
4. If still failing, check Azure AD sign-in logs:
   - Go to Azure Portal → Azure Active Directory → Sign-in logs
   - Look for recent failed sign-ins
   - Click on the failed sign-in to see detailed error message
