# Multi-Tenant Deployment Checklist

## Pre-Deployment Verification

### ✅ Code Quality
- [x] All route files have no syntax errors
- [x] Middleware created and tested
- [x] Service layer updated with tenant support
- [x] Database schema includes tenant columns
- [x] Documentation complete

### ✅ Database Preparation
- [ ] Run database migration to add tenant columns (if existing data)
- [ ] Verify indexes are created for tenant queries
- [ ] Test database queries with tenant filtering
- [ ] Confirm Neon PostgreSQL connection works

### ✅ Environment Variables
```bash
# Required for all deployments
DATABASE_URL=postgresql://...  # Neon PostgreSQL
SESSION_SECRET=...             # Random 32+ character string
ENCRYPTION_KEY=...             # Random 64 character hex string

# Optional debugging
LOG_TENANT_CONTEXT=true        # Enable tenant logging (dev only)
NODE_ENV=production            # Set for production
```

### ✅ Testing Before Deployment

#### Test 1: Backend Starts Successfully
```bash
cd backend
npm start
# Should start without errors
# Health check should show "multiTenant": true
```

#### Test 2: Authentication Works
```bash
# Test app-only auth
curl -X POST http://localhost:5000/api/auth/configure \
  -H "Content-Type: application/json" \
  -d '{"clientId":"...","tenantId":"...","clientSecret":"..."}'

# Should return success with session cookie
```

#### Test 3: Tenant Isolation
1. Login with User A
2. Create a scheduled offboarding
3. Logout and login with User B
4. Verify User B cannot see User A's data
5. Verify User B can create their own data

#### Test 4: Cross-Tenant Access Prevention
```bash
# Try to access another user's resource
# Should return 404 or "access denied"
curl -X GET http://localhost:5000/api/offboarding/scheduled/{other-user-id} \
  -H "Cookie: sessionId=..."
```

## Vercel Deployment

### 1. Update Vercel Configuration

Ensure `vercel.json` is configured:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": null,
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/backend/server.js"
    }
  ]
}
```

### 2. Environment Variables in Vercel

Set in Vercel dashboard:
```
DATABASE_URL          # Neon PostgreSQL connection string
SESSION_SECRET        # Random secure string
ENCRYPTION_KEY        # 64-character hex string
AZURE_CLIENT_ID       # Optional: Default Azure AD credentials
AZURE_TENANT_ID       # Optional: Default Azure AD credentials
AZURE_CLIENT_SECRET   # Optional: Default Azure AD credentials
NODE_ENV=production
TRUST_PROXY=true
```

### 3. Deploy to Vercel

```bash
# Option 1: Deploy via Git (Recommended)
git add .
git commit -m "Add multi-tenant support"
git push origin main
# Vercel auto-deploys

# Option 2: Manual deployment
vercel --prod
```

### 4. Post-Deployment Verification

#### Test Production Health
```bash
curl https://your-app.vercel.app/health
# Should return: {"status":"healthy","multiTenant":true}
```

#### Test Production Authentication
1. Navigate to `https://your-app.vercel.app`
2. Configure Azure AD credentials
3. Login with Microsoft account
4. Verify tenant context in requests

#### Test Production Multi-Tenancy
1. Login with Account A and create data
2. Logout and login with Account B
3. Verify Account B cannot see Account A's data
4. Check database to confirm tenant_id values

## Database Migration (If Existing Data)

### For Scheduled Offboardings

```sql
-- Connect to Neon database
psql $DATABASE_URL

-- Add tenant columns (if not already present)
ALTER TABLE scheduled_offboardings 
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Migrate existing data to default tenant
UPDATE scheduled_offboardings 
SET 
  tenant_id = COALESCE(tenant_id, 'migration-tenant'),
  session_id = COALESCE(session_id, 'migration-session'),
  created_by = COALESCE(created_by, 'migration')
WHERE tenant_id IS NULL;

-- Make tenant columns NOT NULL (after migration)
ALTER TABLE scheduled_offboardings 
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN session_id SET NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_offboardings_tenant 
  ON scheduled_offboardings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_offboardings_session 
  ON scheduled_offboardings(session_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_offboardings_tenant_session 
  ON scheduled_offboardings(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_offboardings_created_by 
  ON scheduled_offboardings(created_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_offboardings_status 
  ON scheduled_offboardings(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_offboardings_date 
  ON scheduled_offboardings(scheduled_date_time);

-- Verify migration
SELECT COUNT(*) as total,
       COUNT(DISTINCT tenant_id) as tenants,
       COUNT(DISTINCT session_id) as sessions
FROM scheduled_offboardings;
```

## Monitoring & Maintenance

### Check Application Health
```bash
# Health endpoint should always return 200
curl https://your-app.vercel.app/health

# Response should include:
{
  "status": "healthy",
  "multiTenant": true,
  "timestamp": "...",
  "uptime": ...,
  "environment": "production"
}
```

### Monitor Database Performance
```sql
-- Check tenant distribution
SELECT tenant_id, COUNT(*) as records
FROM scheduled_offboardings
GROUP BY tenant_id
ORDER BY records DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'scheduled_offboardings';

-- Check slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
WHERE query LIKE '%scheduled_offboardings%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Application Logs
```bash
# Vercel logs
vercel logs --production

# Look for:
# - "🏢 Tenant Context:" entries
# - Authentication success/failures
# - Database query errors
# - Cross-tenant access attempts
```

## Rollback Plan

If issues arise after deployment:

### Quick Rollback
```bash
# Vercel: Rollback to previous deployment
vercel rollback

# Or redeploy previous git commit
git revert HEAD
git push origin main
```

### Database Rollback (if needed)
```sql
-- Remove tenant constraints (emergency only)
ALTER TABLE scheduled_offboardings 
  ALTER COLUMN tenant_id DROP NOT NULL,
  ALTER COLUMN session_id DROP NOT NULL;

-- This allows old code to work temporarily
-- DO NOT leave in this state - fix and redeploy
```

## Success Criteria

### ✅ Deployment Successful When:
- [ ] Application deploys without errors
- [ ] Health endpoint returns 200 with `"multiTenant": true`
- [ ] Users can login successfully
- [ ] Data is isolated between different user sessions
- [ ] Scheduled offboarding CRUD operations work
- [ ] No SQL errors in logs
- [ ] No authentication errors
- [ ] Performance is acceptable (< 500ms API responses)

### ✅ Multi-Tenancy Working When:
- [ ] Different users see only their own data
- [ ] Cross-tenant access attempts return 404
- [ ] Database has proper tenant_id values
- [ ] Indexes are created and being used
- [ ] Audit trail shows created_by values

## Troubleshooting

### Issue: "Tenant ID and Session ID are required"
**Solution**: Check that:
- `extractTenantContext` middleware is registered in `server.js`
- Middleware runs after session middleware
- User is properly authenticated with session data

### Issue: Users see no data after migration
**Solution**: 
- Check user's tenant_id matches data tenant_id
- Verify session has user.id or user.tenantId field
- Check database tenant_id values are not null

### Issue: Performance degradation
**Solution**:
- Verify indexes are created: `\d scheduled_offboardings` in psql
- Check query plans: `EXPLAIN ANALYZE SELECT...`
- Consider adding compound indexes for common queries

### Issue: Session errors on Vercel
**Solution**:
- Verify `DATABASE_URL` environment variable is set
- Check Neon database connection limit
- Ensure session table exists and is accessible

## Documentation Reference

- **Architecture**: `MULTI_TENANT_ARCHITECTURE.md`
- **Quick Start**: `MULTI_TENANT_QUICK_START.md`
- **Testing**: `MULTI_TENANT_TEST_GUIDE.md`
- **Summary**: `MULTI_TENANT_IMPLEMENTATION_SUMMARY.md`

## Post-Deployment Tasks

### Immediate (First 24 Hours)
- [ ] Monitor Vercel logs for errors
- [ ] Test with multiple real users
- [ ] Verify database query performance
- [ ] Check session storage is working

### Short-Term (First Week)
- [ ] Gather user feedback
- [ ] Monitor tenant data growth
- [ ] Review query performance metrics
- [ ] Optimize slow queries if needed

### Long-Term (First Month)
- [ ] Implement tenant usage analytics
- [ ] Add tenant-level admin management
- [ ] Create tenant onboarding automation
- [ ] Consider tenant-level feature flags

---

**Follow this checklist to ensure smooth multi-tenant deployment!** ✅🚀
