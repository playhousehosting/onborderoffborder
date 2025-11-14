# 🚨 Quick Fix for SSO Login Errors

## The Error You're Seeing

```
[CONVEX A(auth:signIn)] [Request ID: xxxxx] Server Error
SSO login error: Error: [CONVEX A(auth:signIn)] Server Error
```

## Why It's Happening

Your Convex deployment is missing three required environment variables for Microsoft 365 SSO authentication.

## Quick Fix (5 Minutes)

### Step 1: Get Your Azure AD Credentials

You need these three values from Azure Portal:

1. **Application (Client) ID** 
   - Azure Portal → Azure Active Directory → App registrations → Your app → Overview
   - Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

2. **Client Secret**
   - Azure Portal → Azure Active Directory → App registrations → Your app → Certificates & secrets
   - If you don't have one, create a new client secret and copy the **Value** immediately
   - Example: `Abc123~DefGhi456.JklMno789_PqrStu`

3. **Directory (Tenant) ID**
   - Azure Portal → Azure Active Directory → App registrations → Your app → Overview
   - Example: `12345678-90ab-cdef-1234-567890abcdef`

### Step 2: Configure Convex Environment Variables

1. Open [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project: **neighborly-manatee-845** (or your project name)
3. Click **Settings** in the left sidebar
4. Click **Environment Variables** tab
5. Click **Add Environment Variable** button
6. Add these three variables **exactly as shown**:

#### Variable 1:
```
Name:  AUTH_AZURE_AD_ID
Value: [Your Application (Client) ID from Step 1]
```

#### Variable 2:
```
Name:  AUTH_AZURE_AD_SECRET
Value: [Your Client Secret Value from Step 1]
```

#### Variable 3:
```
Name:  AUTH_AZURE_AD_ISSUER
Value: https://login.microsoftonline.com/[Your Tenant ID from Step 1]/v2.0
```

**Important**: For Variable 3, replace `[Your Tenant ID from Step 1]` with your actual tenant ID. The final value should look like:
```
https://login.microsoftonline.com/12345678-90ab-cdef-1234-567890abcdef/v2.0
```

7. Click **Save** after adding each variable

### Step 3: Deploy Updated Functions

Open a terminal and run:

```bash
npx convex deploy
```

Wait for the message: **"Deployment complete"**

### Step 4: Update Azure AD Redirect URI (If Not Already Done)

1. Go to Azure Portal → Azure Active Directory → App registrations → Your app
2. Click **Authentication** in the left sidebar
3. Under **Platform configurations**, add a **Web** platform if not already added
4. Add this redirect URI:
   ```
   https://neighborly-manatee-845.convex.site/api/auth/callback/azure-ad
   ```
   **Note**: Replace `neighborly-manatee-845` with your actual Convex subdomain
5. Enable **ID tokens** checkbox
6. Click **Save**

### Step 5: Test SSO Login

1. Navigate to your application login page
2. Click **"Sign in with Microsoft 365"**
3. You should be redirected to Microsoft login
4. After successful authentication, you should be redirected back to your app

## Verification Checklist

After completing the steps above, verify:

- [ ] Three environment variables are set in Convex Dashboard (no typos)
- [ ] `AUTH_AZURE_AD_ISSUER` includes your tenant ID and ends with `/v2.0`
- [ ] Convex functions deployed successfully (`npx convex deploy`)
- [ ] Redirect URI in Azure AD ends with `/api/auth/callback/azure-ad`
- [ ] Redirect URI matches your Convex subdomain exactly
- [ ] Waited at least 1 minute after deploying

## Still Not Working?

### Check Convex Logs

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Click **Logs** in the left sidebar
4. Look for errors when you attempt SSO login
5. Look for messages about missing environment variables

### Common Issues

**"Redirect URI mismatch"**
- Your redirect URI in Azure AD doesn't match exactly
- Make sure it ends with `/azure-ad` not `/microsoft`
- Make sure subdomain matches your Convex deployment

**"Invalid client secret"**
- Client secret might be expired
- Create a new client secret in Azure Portal
- Update `AUTH_AZURE_AD_SECRET` in Convex Dashboard
- Run `npx convex deploy` again

**"Missing permissions"**
- Go to Azure Portal → Your app → API permissions
- Add delegated permissions: `openid`, `profile`, `email`, `User.Read`
- Click **Grant admin consent**

### Get More Help

- **Complete Setup Guide**: [CONVEX_SSO_CONFIGURATION.md](./CONVEX_SSO_CONFIGURATION.md)
- **Detailed Troubleshooting**: [SSO_TROUBLESHOOTING.md](./SSO_TROUBLESHOOTING.md)
- **Quick Start**: [M365_SSO_SETUP.md](./M365_SSO_SETUP.md)

## Visual Reference

### Convex Dashboard - Environment Variables Location

```
Convex Dashboard
├── Your Project (neighborly-manatee-845)
│   ├── Data
│   ├── Functions
│   ├── Logs
│   └── Settings ← Click here
│       ├── General
│       ├── Environment Variables ← Click here
│       │   └── Add Environment Variable ← Click here
│       ├── Deployment Keys
│       └── Danger Zone
```

### Azure Portal - Where to Find Values

```
Azure Portal
├── Azure Active Directory
│   └── App registrations
│       └── Your App
│           ├── Overview ← Client ID and Tenant ID here
│           ├── Authentication ← Add redirect URI here
│           ├── Certificates & secrets ← Client Secret here
│           └── API permissions ← Add delegated permissions here
```

## Summary

The fix requires:
1. Three environment variables in Convex Dashboard
2. Deploy Convex functions
3. Redirect URI in Azure AD
4. Delegated permissions in Azure AD

Total time: **5 minutes** (plus deployment time)

After this fix, SSO login should work immediately!
