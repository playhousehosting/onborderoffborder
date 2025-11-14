# SSO Configuration Checklist

Use this checklist to ensure SSO is properly configured. Check off each item as you complete it.

## Prerequisites

- [ ] Azure AD app registration exists
- [ ] Access to Azure Portal as Global Administrator
- [ ] Access to Convex Dashboard for project
- [ ] Convex CLI installed (`npm install -g convex`)

## Part 1: Azure AD App Configuration

### Get Credentials

- [ ] Copy Application (Client) ID from Azure Portal → App registrations → Your app → Overview
- [ ] Copy Directory (Tenant) ID from Azure Portal → App registrations → Your app → Overview
- [ ] Create or have existing Client Secret from Certificates & secrets section

### Configure Authentication

- [ ] Go to Authentication section in your Azure AD app
- [ ] Add Web platform if not already added
- [ ] Add redirect URI: `https://[your-convex-subdomain].convex.site/api/auth/callback/azure-ad`
- [ ] Enable **ID tokens** checkbox
- [ ] Click Save

### Configure Permissions

- [ ] Go to API permissions section
- [ ] Add delegated permission: `openid`
- [ ] Add delegated permission: `profile`
- [ ] Add delegated permission: `email`
- [ ] Add delegated permission: `User.Read`
- [ ] Click **Grant admin consent for [Your Organization]**
- [ ] Verify all permissions show green checkmarks

## Part 2: Convex Dashboard Configuration

### Set Environment Variables

- [ ] Log in to [Convex Dashboard](https://dashboard.convex.dev)
- [ ] Select your project
- [ ] Navigate to Settings → Environment Variables
- [ ] Add variable: `AUTH_AZURE_AD_ID` = [Your Client ID]
- [ ] Add variable: `AUTH_AZURE_AD_SECRET` = [Your Client Secret]
- [ ] Add variable: `AUTH_AZURE_AD_ISSUER` = `https://login.microsoftonline.com/[Tenant-ID]/v2.0`
- [ ] Verify all three variables are saved

### Deploy Functions

- [ ] Open terminal in project directory
- [ ] Run: `npx convex deploy`
- [ ] Wait for "Deployment complete" message
- [ ] Check Convex Dashboard logs for any errors

## Part 3: Verification

### Test SSO Login

- [ ] Navigate to application login page
- [ ] Click "Sign in with Microsoft 365" button
- [ ] Verify redirect to Microsoft login page
- [ ] Complete authentication
- [ ] Verify redirect back to application
- [ ] Verify user is logged in

### Check for Errors

- [ ] Check browser console for errors (F12)
- [ ] Check Convex Dashboard → Logs for errors
- [ ] Verify session created in Convex Dashboard → Data → sessions table

## Part 4: Troubleshooting (If Issues)

### If SSO Button Does Nothing

- [ ] Check browser console for errors
- [ ] Verify `@convex-dev/auth` package installed: `npm list @convex-dev/auth`
- [ ] Clear browser cache and try again
- [ ] Try in incognito/private window

### If "Server Error" Appears

- [ ] Verify all three environment variables are set in Convex Dashboard
- [ ] Check for typos in environment variable names (must be exact)
- [ ] Verify `AUTH_AZURE_AD_ISSUER` format: `https://login.microsoftonline.com/{TENANT}/v2.0`
- [ ] Re-run `npx convex deploy`
- [ ] Check Convex Dashboard logs for specific error messages

### If "Redirect URI Mismatch" Error

- [ ] Verify redirect URI in Azure AD exactly matches Convex deployment URL
- [ ] Check that path ends with `/azure-ad` (not `/microsoft`)
- [ ] Verify Convex subdomain is correct
- [ ] Wait 5 minutes for Azure AD changes to propagate

### If Authentication Succeeds But No Session

- [ ] Check Convex Dashboard → Data → sessions table for new entries
- [ ] Check browser localStorage for `sessionId`
- [ ] Verify `createSSOSession` mutation exists in `convex/ssoAuth.ts`
- [ ] Check Convex logs for mutation errors

## Part 5: Security Review

### Production Checklist

- [ ] Client secret has appropriate expiration (not "Never")
- [ ] Admin consent granted for all permissions
- [ ] Separate client secrets for dev and production environments
- [ ] Environment variables not committed to git
- [ ] Redirect URIs only include trusted domains
- [ ] Regular review of authentication logs

### Best Practices

- [ ] Set up calendar reminder for client secret expiration
- [ ] Document client secret rotation procedure
- [ ] Test SSO login after any Azure AD changes
- [ ] Monitor Convex logs for authentication failures
- [ ] Review Azure AD sign-in logs periodically

## Completion

When all items are checked:

- [ ] SSO login works successfully
- [ ] No errors in browser console
- [ ] No errors in Convex logs
- [ ] Session created in Convex database
- [ ] User can access protected routes
- [ ] User can log out successfully

## Reference Documents

- Quick Fix: [QUICK_FIX_SSO_ERRORS.md](../QUICK_FIX_SSO_ERRORS.md)
- Complete Setup: [CONVEX_SSO_CONFIGURATION.md](../CONVEX_SSO_CONFIGURATION.md)
- Troubleshooting: [SSO_TROUBLESHOOTING.md](../SSO_TROUBLESHOOTING.md)
- Quick Start: [M365_SSO_SETUP.md](../M365_SSO_SETUP.md)

## Notes

Date Completed: _______________

Completed By: _______________

Issues Encountered:

_______________________________________________________________________________

_______________________________________________________________________________

_______________________________________________________________________________

Resolution:

_______________________________________________________________________________

_______________________________________________________________________________

_______________________________________________________________________________
