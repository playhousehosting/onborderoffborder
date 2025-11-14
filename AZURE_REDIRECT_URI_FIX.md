# Fix Azure AD Redirect URI for Clerk

## Error
```
AADSTS50011: The redirect URI 'https://active-tiger-63.clerk.accounts.dev/v1/oauth_callback' 
specified in the request does not match the redirect URIs configured for the application.
```

## Quick Fix (5 minutes)

### Step 1: Go to Azure Portal
1. Navigate to: https://portal.azure.com
2. Go to **Azure Active Directory** → **App registrations**
3. Find your app: **3f4637ee-e352-4273-96a6-3996a4a7f8c0**

### Step 2: Add Clerk Redirect URI
1. Click on your app registration
2. In the left menu, click **Authentication**
3. Under **Platform configurations** → **Web**, click **Add URI**
4. Add this exact URI:
   ```
   https://active-tiger-63.clerk.accounts.dev/v1/oauth_callback
   ```
5. Click **Save** at the bottom

### Step 3: Verify Settings
While you're there, confirm:
- ✅ **Platform**: Web (not SPA)
- ✅ **Supported account types**: Accounts in any organizational directory (Any Azure AD directory - Multitenant)
- ✅ **Access tokens** and **ID tokens** are checked (under Implicit grant and hybrid flows)

### Step 4: Test Again
1. Go back to your app: http://localhost:3000/login
2. Click sign in
3. Try the Microsoft authentication again

## Your App Details
- **Application (Client) ID**: `3f4637ee-e352-4273-96a6-3996a4a7f8c0`
- **Clerk Redirect URI**: `https://active-tiger-63.clerk.accounts.dev/v1/oauth_callback`
- **Clerk Domain**: `active-tiger-63.clerk.accounts.dev`

## Alternative: Configure in Clerk First

If you haven't already configured Microsoft in Clerk:

1. **Clerk Dashboard**: https://dashboard.clerk.com
2. Go to **User & Authentication** → **Social Connections**
3. Enable **Microsoft**
4. Click **Configure**
5. You'll see the redirect URI to add to Azure
6. Enter your Azure AD credentials:
   - Client ID: `3f4637ee-e352-4273-96a6-3996a4a7f8c0`
   - Client Secret: (get from Azure → Certificates & secrets)
   - Tenant ID: (get from Azure → Overview)
7. Save

## Verification
After adding the redirect URI, you should be able to:
- Click "Continue with Microsoft" in Clerk
- Get redirected to Microsoft login
- Sign in with your work account
- Get redirected back to your app successfully

---

**Status**: Waiting for Azure redirect URI configuration
**Next**: Add redirect URI in Azure Portal → Authentication
