# Interactive Authentication Using Backend Environment Variables

## Overview

Interactive OAuth2 authentication now uses multi-tenant app credentials stored in **Vercel backend environment variables** instead of the frontend configuration form. This centralizes credential management and improves security.

## Changes Made

### Backend Changes

1. **New Endpoint: `/api/auth/msal-config`** (`backend/routes/auth.js`)
   - Returns `clientId` and `tenantId` from backend environment variables
   - Provides these to frontend for MSAL initialization
   - Returns 404 if environment variables not set

2. **Updated Environment Variables** (`backend/.env.example`)
   - Added `AZURE_CLIENT_ID` - Multi-tenant app client ID
   - Added `AZURE_TENANT_ID` - Tenant ID for the organization

### Frontend Changes

1. **authConfig.js**
   - Added `fetchMsalConfigFromBackend()` function
   - Fetches MSAL configuration from backend API
   - Caches config to avoid repeated requests

2. **Login.js**
   - Updated `handleInteractiveLogin()` to fetch backend config
   - Stores config in localStorage
   - Reloads page to reinitialize MSAL with new config
   - Auto-triggers login after page reload

3. **apiConfig.js**
   - Added `msalConfig` endpoint
   - Exported `backendApi` alias

## How It Works

### Flow

1. User clicks **"OAuth2 Interactive"** button
2. Frontend calls `/api/auth/msal-config` to get credentials
3. Backend returns `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` from Vercel env vars
4. Frontend stores config in localStorage
5. Page reloads to reinitialize MSAL instance
6. MSAL popup opens automatically with backend credentials
7. User signs in with Microsoft account
8. Redirects to dashboard

### Configuration Required

#### Vercel Backend Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

```env
AZURE_CLIENT_ID=your-multi-tenant-app-client-id
AZURE_TENANT_ID=your-tenant-id
```

#### Azure AD App Registration

Your multi-tenant app must have:

1. **Redirect URIs** configured:
   - `http://localhost:3000` (development)
   - `https://your-vercel-frontend-url.vercel.app` (production)

2. **Platform**: Single-page application (SPA)

3. **API Permissions** (Delegated):
   - User.Read
   - User.Read.All
   - Group.Read.All
   - (Add others as needed for your use case)

## Benefits

✅ **Centralized Management**: Credentials managed in one place (Vercel backend)  
✅ **Better Security**: Client ID/Tenant ID not exposed in frontend code  
✅ **Easier Updates**: Change credentials in Vercel without redeploying frontend  
✅ **Multi-Environment**: Different credentials for dev/staging/production  
✅ **No Form Required**: Users don't need to enter credentials manually  

## Testing

### Local Development

1. Add environment variables to `backend/.env`:
   ```env
   AZURE_CLIENT_ID=your-client-id
   AZURE_TENANT_ID=your-tenant-id
   ```

2. Start backend: `cd backend && npm run dev`

3. Start frontend: `npm start`

4. Click "OAuth2 Interactive" button

5. Verify console logs show backend config being fetched

### Production (Vercel)

1. Set environment variables in Vercel dashboard for backend project

2. Deploy backend and frontend

3. Test interactive authentication on production URL

## Error Handling

- **Backend not configured**: Shows error message asking to set env vars
- **Network errors**: Shows error fetching configuration
- **MSAL errors**: Provides specific error messages (popup blocked, timeout, Azure AD errors)

## Troubleshooting

### "Interactive authentication not configured on backend"

- **Cause**: `AZURE_CLIENT_ID` or `AZURE_TENANT_ID` not set in Vercel backend env vars
- **Fix**: Add environment variables to Vercel backend project

### "Failed to load configuration"

- **Cause**: Backend API not responding or network error
- **Fix**: Check backend is running and accessible from frontend

### Popup blocked

- **Cause**: Browser blocking MSAL popup window
- **Fix**: Allow popups for your domain in browser settings

### "AADSTS" error

- **Cause**: Azure AD configuration issue (redirect URI, permissions, etc.)
- **Fix**: Verify redirect URI matches in Azure Portal and app registration has required permissions

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend  │         │   Backend    │         │   Azure AD   │
│   (React)   │         │  (Express)   │         │              │
└──────┬──────┘         └──────┬───────┘         └──────┬───────┘
       │                       │                        │
       │  1. GET /api/auth/    │                        │
       │     msal-config       │                        │
       ├──────────────────────>│                        │
       │                       │                        │
       │  2. Return config     │                        │
       │     from env vars     │                        │
       │<──────────────────────┤                        │
       │                       │                        │
       │  3. Initialize MSAL   │                        │
       │     with config       │                        │
       │                       │                        │
       │  4. Open popup        │                        │
       ├────────────────────────────────────────────────>│
       │                       │                        │
       │  5. User signs in     │                        │
       │<────────────────────────────────────────────────┤
       │                       │                        │
       │  6. Get access token  │                        │
       │     from MSAL         │                        │
       │                       │                        │
       │  7. Navigate to       │                        │
       │     dashboard         │                        │
       │                       │                        │
```

## Next Steps

1. Deploy backend to Vercel
2. Add `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` to Vercel backend environment variables
3. Test interactive authentication on production
4. Users can now sign in with their Microsoft accounts using backend-provided credentials

## Notes

- **App-Only authentication** still uses form-based configuration (requires client secret)
- **Demo mode** remains unchanged
- Backend environment variables are only used for interactive OAuth2 authentication
- Frontend configuration form is still available for app-only mode
