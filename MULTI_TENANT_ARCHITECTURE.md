# Multi-Tenant and Multi-Session Architecture

## Overview

The Employee Offboarding Portal now implements comprehensive multi-tenant and multi-session architecture across the entire application. This ensures complete data isolation between different organizations, users, and sessions.

## Architecture Components

### 1. Tenant Context Middleware (`backend/middleware/tenantContext.js`)

The core of the multi-tenant system is the tenant context middleware that:
- Extracts tenant and session information from authenticated requests
- Adds structured tenant context to all requests
- Provides helper functions for authentication and authorization
- Ensures consistent tenant identification across the application

#### Key Functions:

**`extractTenantContext(req, res, next)`**
- Automatically extracts tenant info from authenticated sessions
- Adds `req.tenantContext` object to all authenticated requests
- Runs automatically after session middleware

**`requireAuth(req, res, next)`**
- Replaces individual route authentication checks
- Validates session and ensures tenant context exists
- Returns 401 if not authenticated

**`requireAdmin(req, res, next)`**
- Validates admin/Global Administrator role
- Returns 403 if user lacks admin privileges

**`getTenantParams(req)`**
- Helper to extract tenant parameters for service calls
- Returns `{ tenantId, sessionId, userId, userEmail }`

**`validateTenantOwnership(resource, tenantContext)`**
- Helper to verify resource ownership
- Checks both tenantId and sessionId/createdBy

### 2. Session Structure

All authenticated sessions now include standardized tenant information:

```javascript
req.session.user = {
  id: 'user-unique-id',
  tenantId: 'azure-ad-tenant-id',
  tid: 'azure-ad-tenant-id',
  oid: 'object-id',
  sub: 'subject-id',
  displayName: 'User Name',
  email: 'user@domain.com',
  userPrincipalName: 'user@domain.com',
  authMode: 'oauth2', // or 'app-only'
  roles: ['admin', 'user']
};
```

### 3. Authentication Modes

#### App-Only Authentication
- Used for service-to-service operations
- Uses Azure AD App Registration credentials
- TenantId extracted from credentials
- User object represents the application

#### OAuth2/Delegated Authentication
- User-interactive authentication via MSAL
- TenantId extracted from Azure AD token response
- Full user profile with roles and permissions

### 4. Database Schema

All database tables with user data include tenant isolation:

```sql
CREATE TABLE scheduled_offboardings (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  created_by VARCHAR(255),
  -- ... other fields ...
  
  INDEX idx_tenant (tenant_id),
  INDEX idx_session (session_id),
  INDEX idx_tenant_session (tenant_id, session_id)
);
```

### 5. Service Layer Pattern

All service methods accept and enforce tenant parameters:

```javascript
async function list(tenantId, sessionId) {
  // Validate tenant params
  if (!tenantId || !sessionId) {
    throw new Error('Tenant ID and Session ID are required');
  }
  
  // Query with tenant filtering
  const query = `
    SELECT * FROM table
    WHERE tenant_id = $1 AND (session_id = $2 OR created_by = $3)
  `;
  
  return await pool.query(query, [tenantId, sessionId, sessionId]);
}
```

### 6. Route Layer Pattern

Routes use the centralized middleware and helper:

```javascript
const { requireAuth, getTenantParams } = require('../middleware/tenantContext');

router.get('/resource', requireAuth, async (req, res) => {
  try {
    const { tenantId, sessionId } = getTenantParams(req);
    const items = await service.list(tenantId, sessionId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

## Security Features

### 1. Complete Data Isolation
- Each tenant can only access their own data
- Database queries always include tenant filtering
- Session-level additional validation

### 2. Cross-Tenant Access Prevention
- All service methods validate tenant ownership
- 404 responses for unauthorized access attempts
- No data leakage in error messages

### 3. Audit Trail
- `created_by` field tracks which session created records
- `updated_at` timestamp for change tracking
- Full tenant context logged (development mode)

### 4. Role-Based Access Control
- Admin role validation with `requireAdmin` middleware
- Role information extracted from Azure AD tokens
- Flexible role checking with `hasRole()` helper

## Updated Components

### Backend Routes
All routes now use centralized authentication:
- ✅ `/api/offboarding` - Scheduled offboarding management
- ✅ `/api/graph` - Microsoft Graph API operations
- ✅ `/api/ad` - On-premises Active Directory
- ✅ `/api/exchange` - Hybrid Exchange management
- ✅ `/api/auth` - Authentication with tenant extraction

### Services
- ✅ `offboardingService.js` - Multi-tenant CRUD operations
- Future: Other services can follow the same pattern

### Middleware
- ✅ Global tenant context extraction in `server.js`
- ✅ Per-route authentication with tenant validation
- ✅ Admin role validation available

## Testing Multi-Tenant Isolation

### Test Case 1: Different Users
1. Login as User A (Microsoft Account 1)
2. Create scheduled offboarding
3. Logout and login as User B (Microsoft Account 2)
4. Verify User B cannot see User A's data
5. Verify User B can create their own data
6. Verify User A cannot see User B's data

### Test Case 2: Direct API Access
```bash
# With User A's session
curl -H "Cookie: sessionId=..." \
  http://localhost:5000/api/offboarding/scheduled
# Returns only User A's records

# With User B's session
curl -H "Cookie: sessionId=..." \
  http://localhost:5000/api/offboarding/scheduled
# Returns only User B's records
```

### Test Case 3: Cross-Tenant Resource Access
```bash
# Try to access User A's record with User B's session
curl -X GET \
  -H "Cookie: sessionId=user_b_session..." \
  http://localhost:5000/api/offboarding/scheduled/user_a_record_id
# Returns 404 or access denied
```

## Environment Variables

No new environment variables required. The system uses existing:
- `DATABASE_URL` - Neon PostgreSQL connection
- `SESSION_SECRET` - Session encryption key
- `ENCRYPTION_KEY` - Credential encryption

Optional debugging:
- `LOG_TENANT_CONTEXT=true` - Log tenant info (development only)

## Migration Path

### For Existing Data
If you have existing data without tenant information:

```sql
-- Add tenant_id to existing records (one-time migration)
UPDATE scheduled_offboardings 
SET tenant_id = 'migration-tenant',
    session_id = 'migration-session',
    created_by = 'migration'
WHERE tenant_id IS NULL;
```

### For New Services
To add multi-tenant support to new services:

1. Add tenant columns to database schema
2. Update service methods to accept `tenantId, sessionId` parameters
3. Add tenant filtering to all queries
4. Use `requireAuth` middleware in routes
5. Use `getTenantParams(req)` helper to extract context

## Production Considerations

### Enterprise Tenant Resolution
In production with multiple organizations:

```javascript
// Extract from Azure AD organization claims
const tenantId = user.tid || user.tenantId;
const organizationId = user.organization_id;
const departmentId = user.department;
```

### Performance Optimization
- Tenant-specific indexes already created
- Connection pooling configured
- Query optimization with EXPLAIN ANALYZE

### Monitoring and Logging
- Tenant context included in all logs
- Per-tenant usage metrics available
- Audit trail for compliance

## Benefits

1. **Enterprise-Ready**: Multiple organizations can use the same deployment
2. **Secure**: Complete data isolation prevents cross-tenant access
3. **Scalable**: Indexed queries perform well with large datasets
4. **Auditable**: Full tracking of who created/modified records
5. **Maintainable**: Centralized authentication and tenant logic
6. **Flexible**: Easy to add tenant support to new features

## Vercel Compatibility

The multi-tenant architecture is fully compatible with Vercel:
- ✅ Serverless functions (stateless design)
- ✅ Neon PostgreSQL (persistent storage)
- ✅ Session management via database
- ✅ Environment variable configuration
- ✅ No file system dependencies

## Support

For questions or issues with multi-tenancy:
1. Check tenant context is properly extracted in logs
2. Verify session has required user fields
3. Ensure database has tenant columns and indexes
4. Test with multiple user accounts
5. Review middleware configuration in `server.js`

---

**The application now provides enterprise-grade multi-tenant security and data isolation!** 🏢🔒
