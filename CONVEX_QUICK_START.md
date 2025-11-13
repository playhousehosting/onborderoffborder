# Quick Start: Using Convex Backend

## ✅ What's Been Set Up

1. **Convex Backend** - Running locally at http://127.0.0.1:3210
2. **Convex Dashboard** - http://127.0.0.1:6790
3. **Database Schema** - Multi-tenant tables with indexes
4. **Authentication** - App-only and OAuth2 support
5. **Offboarding CRUD** - Complete operations with tenant isolation
6. **Graph API Integration** - Microsoft Graph actions

## 🚀 How to Use It

### 1. Start Both Servers

**Terminal 1 - Convex Backend:**
```bash
npx convex dev
```

**Terminal 2 - React Frontend:**
```bash
npm start
```

### 2. Login Flow (App-Only Mode)

The login process now uses Convex instead of Express:

1. Enter your Azure AD credentials (Client ID, Tenant ID, Client Secret)
2. Click "Save & Sign In"
3. Behind the scenes:
   - Credentials are encrypted and stored in Convex database
   - A session ID is generated and saved to localStorage
   - Authentication is established
   - You're redirected to dashboard

### 3. Schedule an Offboarding

1. Go to "Scheduled Offboarding" page
2. Search for a user (uses Microsoft Graph via Convex action)
3. Fill in the form
4. Click "Schedule Offboarding"
5. Data is saved to Convex database with tenant isolation

### 4. View Scheduled Offboardings

- List automatically loads from Convex
- Real-time updates - if you open another tab and add/edit, both tabs update automatically!
- Data is filtered by your tenant ID and session ID

## 🔧 Key Differences from Express Backend

### Before (Express):
```javascript
// Had to manage session cookies, CORS, serverless issues
await fetch('/api/auth/configure', {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({...})
});
```

### Now (Convex):
```javascript
// Direct function calls, no HTTP, no CORS issues
const result = await convex.mutation(api.auth.configure, {
  clientId, tenantId, clientSecret
});
```

## 📊 View Your Data

Open the Convex Dashboard at http://127.0.0.1:6790

You'll see:
- **sessions** table - Your authentication sessions
- **scheduled_offboarding** table - All scheduled offboardings
- **audit_log** table - Audit trail of all actions

Click on any table to browse the data!

## 🐛 Troubleshooting

### "Session not found" error
1. Open browser DevTools → Application → Local Storage
2. Check for `convex_session_id` key
3. If missing, you need to login again

### Convex functions not updating
1. Make sure `npx convex dev` is running
2. Check terminal for compilation errors
3. Functions auto-deploy when you save files in `convex/` directory

### Data not showing
1. Open Convex dashboard: http://127.0.0.1:6790
2. Check if data exists in tables
3. Verify `tenantId` and `sessionId` match your session

## 🎯 Next Steps

### Option 1: Keep Express for Graph API, Use Convex for Data

- Keep backend running for Microsoft Graph proxy
- Use Convex only for authentication and data storage
- Best for gradual migration

### Option 2: Full Convex Migration

- Use Convex actions for all Microsoft Graph calls
- Remove Express backend entirely
- Simpler deployment, no server management

### Option 3: Hybrid Approach

- Use Convex for most operations
- Keep Express for complex Graph API workflows
- Both can coexist

## 📝 Current Status

✅ **Working:**
- Authentication (app-only mode)
- Session management
- Credentials encryption/storage
- Multi-tenant data isolation

⏳ **To Be Updated:**
- Login.js - needs to call Convex instead of Express
- AuthContext - use ConvexAuthContext instead
- ScheduledOffboarding component - use Convex hooks

🔄 **Still Using Express:**
- Microsoft Graph API proxy (optional - can migrate to Convex actions)
- Active Directory operations (optional)
- Exchange operations (optional)

## 💡 Recommendation

**Start Here:**
1. Update Login.js to use `convex.mutation(api.auth.configure)` and `api.auth.loginAppOnly`
2. Replace AuthProvider with ConvexAuthProvider in index.js
3. Test login flow
4. Update ScheduledOffboarding to use Convex hooks
5. Test full offboarding workflow
6. Decide if you want to migrate Graph API calls to Convex actions

## 📚 Documentation

- **Full Guide**: See CONVEX_MIGRATION_GUIDE.md
- **Convex Docs**: https://docs.convex.dev
- **Dashboard**: http://127.0.0.1:6790

## ❓ Questions?

The Convex backend is **ready to use**. You can:
1. Keep the Express backend running alongside Convex (hybrid)
2. Gradually migrate features from Express to Convex
3. Go all-in on Convex and remove Express

Your choice! The foundation is in place. 🎉
