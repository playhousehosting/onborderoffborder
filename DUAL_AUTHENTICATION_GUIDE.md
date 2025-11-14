# Dual Authentication Guide

## Overview
The Employee Offboarding Portal now supports **two authentication modes** running simultaneously:

1. **Clerk SSO** - For regular users (email/password, social login, Microsoft 365)
2. **App-Only Credentials** - For admin/service accounts (Azure AD client credentials)

## Architecture

### Provider Stack
```
ClerkProvider
  └─ ConvexProvider
       └─ ConvexAuthProvider (app-only auth)
            └─ AuthProvider (unified auth interface)
                 └─ App
```

### Authentication Flow
The unified `AuthContext` checks both authentication providers:
- **Clerk**: Uses `useAuth()` and `useUser()` from `@clerk/clerk-react`
- **App-Only**: Uses `useAuth()` from `ConvexAuthContext`

When a user is authenticated by either provider, `isAuthenticated` returns `true`.

## Login Options

### Option 1: Clerk SSO (Default)
Regular users can sign in using:
- Email and password
- Social providers (Google, GitHub, etc.)
- Microsoft 365 (after OAuth configuration)

**Benefits:**
- User-friendly signup/signin flows
- Multi-factor authentication
- Session management
- User profile management

**Permissions:** Standard access (configurable via Clerk metadata)

### Option 2: App Credentials (Admin)
Admin users can authenticate using Azure AD application credentials:
- Client ID
- Tenant ID
- Client Secret

**Benefits:**
- Full admin permissions
- Suitable for service accounts
- Direct Microsoft Graph API access
- No user account required

**Permissions:** Full access to all operations

## Usage

### For End Users
1. Navigate to `/login`
2. Choose your authentication method:
   - **Default:** Use Clerk sign-in form (email/password or social)
   - **Admin:** Click "Use App Credentials (Admin)" to reveal app credentials form

### For Developers

#### Check Authentication Status
```javascript
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { isAuthenticated, authMode, user, permissions } = useAuth();
  
  console.log('Authenticated:', isAuthenticated);
  console.log('Auth mode:', authMode); // 'clerk' or 'app-only'
  console.log('User:', user);
  console.log('Permissions:', permissions);
}
```

#### Check Specific Auth Mode
```javascript
const { authMode, permissions } = useAuth();

if (authMode === 'app-only') {
  // User authenticated with app credentials - full admin access
  console.log('Admin user with full permissions');
} else if (authMode === 'clerk') {
  // User authenticated via Clerk - standard permissions
  console.log('Regular user via Clerk');
}
```

#### Logout
```javascript
import { useAuth } from './contexts/AuthContext';
import { useClerk } from '@clerk/clerk-react';

function LogoutButton() {
  const { authMode, logout } = useAuth();
  const { signOut } = useClerk();

  const handleLogout = async () => {
    if (authMode === 'app-only' && logout) {
      await logout(); // App-only logout
    } else if (authMode === 'clerk') {
      await signOut(); // Clerk logout
    }
  };

  return <button onClick={handleLogout}>Sign Out</button>;
}
```

## Configuration

### Environment Variables
```bash
# Clerk Configuration
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_...

# Convex Backend
REACT_APP_CONVEX_URL=https://your-convex-deployment.convex.cloud
```

### Azure AD App Registration
For app-only authentication, you need an Azure AD application with:
- Application (client) ID
- Directory (tenant) ID  
- Client secret
- Appropriate Microsoft Graph API permissions

## Security Considerations

### App Credentials
- **Never commit app credentials to source control**
- Client secrets are encrypted before storage in Convex backend
- Only users with credentials can authenticate
- Consider implementing IP whitelisting for app-only access

### Clerk Users
- Use Clerk Dashboard to manage user permissions via metadata
- Enable multi-factor authentication in production
- Configure session timeout policies
- Review OAuth provider configurations

## Testing

### Test Clerk Authentication
1. Go to `/login`
2. Click "Sign up" or "Sign in"
3. Complete Clerk authentication flow
4. Verify redirect to dashboard
5. Check user info displays correctly

### Test App-Only Authentication
1. Go to `/login`
2. Click "Use App Credentials (Admin)"
3. Enter valid Azure AD app credentials:
   - Client ID
   - Tenant ID
   - Client Secret
4. Click "Sign in with App Credentials"
5. Verify redirect to dashboard
6. Check "Admin (App Credentials)" displays in user menu

### Test Simultaneous Access
- Both auth modes can be used by different users at the same time
- Each maintains its own session independently
- No conflicts between authentication providers

## Troubleshooting

### Issue: App credentials not working
**Solution:**
- Verify credentials are correct in Azure Portal
- Check app has required Microsoft Graph API permissions
- Ensure client secret hasn't expired
- Check browser console for detailed error messages

### Issue: Clerk authentication fails
**Solution:**
- Verify `REACT_APP_CLERK_PUBLISHABLE_KEY` is set correctly
- Check Clerk Dashboard for any service issues
- Ensure redirect URIs are configured in Clerk Dashboard
- Review browser console for CSP violations

### Issue: "Missing Clerk Publishable Key" error
**Solution:**
- Copy `.env.example` to `.env.local`
- Add your Clerk publishable key
- Restart development server

### Issue: User stuck on login page
**Solution:**
- Check browser console for errors
- Clear browser cache and cookies
- Verify authentication backend is running
- Check network tab for failed API requests

## Migration Notes

This implementation restores app-only authentication that was previously removed during the Clerk migration. Both authentication methods now coexist:

- **Files modified:**
  - `src/components/auth/Login.js` - Added app credentials form with toggle
  - `src/contexts/AuthContext.js` - Unified auth state from both providers
  - `src/index.js` - Added ConvexAuthProvider to provider stack

- **Files restored:**
  - `src/contexts/ConvexAuthContext.js` - Original app-only auth provider (was disconnected, now re-integrated)

- **Backward compatibility:**
  - Existing Clerk users continue to work without changes
  - App-only credentials work exactly as before
  - No breaking changes to existing code

## Next Steps

1. **Test both authentication methods** thoroughly
2. **Configure Microsoft OAuth in Clerk** (optional, for M365 SSO via Clerk)
3. **Add Azure redirect URI** for Clerk Microsoft provider (see `AZURE_REDIRECT_URI_FIX.md`)
4. **Update user documentation** with login instructions
5. **Configure Clerk metadata** for role-based permissions (if needed)

## Support

- **Clerk Issues:** [Clerk Documentation](https://clerk.dev/docs)
- **App-Only Issues:** Check `convex/authActions.ts` for backend logic
- **General Auth:** Review `src/contexts/AuthContext.js` for unified auth implementation
