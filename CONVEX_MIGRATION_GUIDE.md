# Convex Backend Migration Guide

## Overview

The Employee Offboarding Portal has been migrated from a traditional Express.js backend to **Convex**, a modern serverless backend platform. This provides:

- ✅ **Real-time database** with automatic synchronization
- ✅ **Serverless functions** that scale automatically  
- ✅ **No session management issues** - sessions stored in database
- ✅ **TypeScript-first** development experience
- ✅ **Zero configuration deployment**
- ✅ **Built-in multi-tenancy** support

## Architecture

### Backend Structure

```
convex/
├── schema.ts           # Database schema definitions
├── auth.ts             # Authentication functions
├── offboarding.ts      # Offboarding CRUD operations
└── _generated/         # Auto-generated types
```

### Database Schema

**Tables:**
1. **sessions** - User authentication sessions with encrypted credentials
2. **scheduled_offboarding** - Scheduled offboarding records with tenant isolation
3. **audit_log** - Compliance and audit trail

All tables have multi-tenant indexes for data isolation.

### Authentication Flow

#### App-Only Mode (Client Credentials)

1. **Configure Credentials**
   ```javascript
   const result = await convex.mutation(api.auth.configure, {
     clientId: "...",
     tenantId: "...",
     clientSecret: "..."
   });
   // Returns: { success: true, sessionId: "..." }
   ```

2. **Login**
   ```javascript
   const result = await convex.mutation(api.auth.loginAppOnly, {
     sessionId: sessionId
   });
   // Returns: { success: true, user: {...} }
   ```

3. **Store Session ID**
   ```javascript
   import { setSessionId } from './services/convexService';
   setSessionId(result.sessionId);
   ```

#### OAuth2 Mode (Delegated)

1. **Configure Credentials** (without clientSecret)
2. **Perform OAuth2 flow** (MSAL handles this)
3. **Login with Token**
   ```javascript
   const result = await convex.mutation(api.auth.loginOAuth2, {
     sessionId: sessionId,
     userId: account.localAccountId,
     email: account.username,
     displayName: account.name,
     tenantId: account.tenantId
   });
   ```

### Offboarding Operations

All operations require a `sessionId` parameter for authentication and tenant isolation.

#### List Scheduled Offboardings
```javascript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { getSessionId } from './services/convexService';

function MyComponent() {
  const sessionId = getSessionId();
  const offboardings = useQuery(api.offboarding.list, {
    sessionId,
    status: "scheduled" // optional filter
  });
  
  return <div>{/* render offboardings */}</div>;
}
```

#### Create Offboarding
```javascript
import { useMutation } from "convex/react";

function ScheduleForm() {
  const createOffboarding = useMutation(api.offboarding.create);
  const sessionId = getSessionId();
  
  const handleSubmit = async (formData) => {
    await createOffboarding({
      sessionId,
      userId: formData.userId,
      userPrincipalName: formData.userPrincipalName,
      displayName: formData.displayName,
      offboardingDate: new Date(formData.date).getTime(),
      actions: {
        disableAccount: true,
        revokeAccess: true,
        // ... other actions
      }
    });
  };
}
```

#### Update Offboarding
```javascript
await convex.mutation(api.offboarding.update, {
  sessionId,
  offboardingId: "...",
  offboardingDate: newDate.getTime(),
  notes: "Updated notes"
});
```

#### Delete Offboarding
```javascript
await convex.mutation(api.offboarding.remove, {
  sessionId,
  offboardingId: "..."
});
```

#### Execute Offboarding
```javascript
await convex.mutation(api.offboarding.execute, {
  sessionId,
  offboardingId: "..."
});
```

## Frontend Migration

### 1. Update AuthContext

Replace REST API calls with Convex mutations:

```javascript
// OLD: fetch('/api/auth/configure', {...})
// NEW: convex.mutation(api.auth.configure, {...})

import { useConvex } from "convex/react";
import { api } from "../convex/_generated/api";

const convex = useConvex();

// Configure credentials
const result = await convex.mutation(api.auth.configure, {
  clientId,
  tenantId,
  clientSecret
});

setSessionId(result.sessionId);

// Login app-only
await convex.mutation(api.auth.loginAppOnly, {
  sessionId: getSessionId()
});
```

### 2. Update Offboarding Components

Replace fetch calls with Convex hooks:

```javascript
// OLD: useEffect + fetch
// NEW: useQuery hook

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function ScheduledOffboarding() {
  const sessionId = getSessionId();
  
  // Real-time query - automatically updates!
  const offboardings = useQuery(api.offboarding.list, { sessionId });
  
  // Mutations
  const createOffboarding = useMutation(api.offboarding.create);
  const updateOffboarding = useMutation(api.offboarding.update);
  const deleteOffboarding = useMutation(api.offboarding.remove);
  
  // Use them in handlers
  const handleCreate = async (data) => {
    await createOffboarding({ sessionId, ...data });
    // UI updates automatically!
  };
}
```

### 3. Remove Old Backend Service Files

You can now delete:
- `src/services/backendApiService.js` (if only used for offboarding)
- Most fetch calls to `/api/*` endpoints

### 4. Update Login Component

```javascript
// In Login.js handleSubmit:

// Step 1: Configure
const configResult = await convex.mutation(api.auth.configure, {
  clientId: configToSave.clientId,
  tenantId: configToSave.tenantId,
  clientSecret: configToSave.clientSecret
});

// Save session ID
setSessionId(configResult.sessionId);

// Step 2: Login
await convex.mutation(api.auth.loginAppOnly, {
  sessionId: configResult.sessionId
});

// Step 3: Update frontend state
setIsAuthenticated(true);
setUser({...});
```

## Local Development

### Start Convex Dev Server

```bash
npx convex dev
```

This will:
- Watch `convex/` directory for changes
- Auto-deploy function updates
- Start local dashboard at http://localhost:6790

### Start React Dev Server

```bash
npm start
```

Both servers run simultaneously.

## Environment Variables

### .env.local (Auto-generated)

```
CONVEX_DEPLOYMENT=dev:...
REACT_APP_CONVEX_URL=https://...
```

### .env (Optional - for encryption)

```
ENCRYPTION_KEY=your-32-byte-hex-key-here
```

## Deployment

### Deploy to Convex Cloud

1. **Create Account**
   ```bash
   npx convex login
   ```

2. **Create Production Deployment**
   ```bash
   npx convex deploy
   ```

3. **Copy Production URL**
   - Update `REACT_APP_CONVEX_URL` in your frontend environment
   - Deploy frontend to Vercel/Netlify as normal

### Deploy Frontend (Vercel)

1. Build frontend:
   ```bash
   npm run build
   ```

2. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

3. Set environment variable in Vercel dashboard:
   - `REACT_APP_CONVEX_URL` = your production Convex URL

## Benefits Over Express Backend

### 1. No Session Management Issues
- Sessions stored in database, not in-memory
- Survives server restarts
- Works in serverless environments
- No session cookie CORS issues

### 2. Real-Time Updates
```javascript
// Components automatically re-render when data changes!
const offboardings = useQuery(api.offboarding.list, { sessionId });
```

### 3. Automatic Scaling
- No server configuration needed
- Scales to zero when not in use
- Handles traffic spikes automatically

### 4. Type Safety
- Full TypeScript support
- Auto-generated types from schema
- Catch errors at compile time

### 5. Simplified Deployment
- No server management
- No database configuration
- One command deployment

## Migration Checklist

- [x] Install Convex packages
- [x] Create schema with multi-tenant tables
- [x] Implement authentication functions
- [x] Implement offboarding CRUD operations
- [ ] Update AuthContext to use Convex
- [ ] Update Login component
- [ ] Update ScheduledOffboarding component
- [ ] Update other components using backend API
- [ ] Test app-only authentication
- [ ] Test OAuth2 authentication
- [ ] Test multi-tenant isolation
- [ ] Deploy to Convex cloud
- [ ] Update frontend environment variables
- [ ] Deploy frontend to Vercel
- [ ] Remove old Express backend (optional)

## Troubleshooting

### Session Not Found
- Make sure you're calling `setSessionId()` after configure
- Check `localStorage` for 'convex_session_id'
- Session expires after 24 hours

### Unauthorized Errors
- Verify session hasn't expired
- Check tenantId matches between requests
- Ensure sessionId is being passed to all operations

### Data Not Updating
- Check Convex dev server is running: `npx convex dev`
- Look for function errors in Convex dashboard
- Verify function calls are using correct arguments

### TypeScript Errors
- Run `npx convex dev` to regenerate types
- Check `convex/_generated/` directory exists
- Ensure imports use `api` from generated files

## Support

- **Convex Docs**: https://docs.convex.dev
- **Convex Discord**: https://convex.dev/community
- **Convex Support**: support@convex.dev

## Next Steps

1. **Test the migration** - Run both servers and verify authentication works
2. **Update all components** - Gradually migrate from fetch to Convex hooks
3. **Deploy to production** - Use Convex cloud for production deployment
4. **Monitor usage** - Check Convex dashboard for performance metrics
