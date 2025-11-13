# Multi-Tenant Quick Start Guide

## For Backend Developers

### Adding Multi-Tenant Support to New Features

#### 1. Update Database Schema

Add tenant columns to your table:

```sql
ALTER TABLE your_table ADD COLUMN tenant_id VARCHAR(255) NOT NULL;
ALTER TABLE your_table ADD COLUMN session_id VARCHAR(255) NOT NULL;
ALTER TABLE your_table ADD COLUMN created_by VARCHAR(255);
ALTER TABLE your_table ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX idx_your_table_tenant ON your_table(tenant_id);
CREATE INDEX idx_your_table_session ON your_table(session_id);
CREATE INDEX idx_your_table_tenant_session ON your_table(tenant_id, session_id);
```

#### 2. Update Service Methods

```javascript
// backend/services/yourService.js

async function list(tenantId, sessionId) {
  // Validate tenant params
  if (!tenantId || !sessionId) {
    throw new Error('Tenant ID and Session ID are required');
  }

  const query = `
    SELECT * FROM your_table
    WHERE tenant_id = $1 AND (session_id = $2 OR created_by = $3)
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [tenantId, sessionId, sessionId]);
  return result.rows;
}

async function create(data, tenantId, sessionId) {
  if (!tenantId || !sessionId) {
    throw new Error('Tenant ID and Session ID are required');
  }

  const query = `
    INSERT INTO your_table (tenant_id, session_id, created_by, ...)
    VALUES ($1, $2, $3, ...)
    RETURNING *
  `;

  const values = [tenantId, sessionId, sessionId, ...];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function update(id, data, tenantId, sessionId) {
  if (!tenantId || !sessionId) {
    throw new Error('Tenant ID and Session ID are required');
  }

  // First verify ownership
  const existing = await get(id, tenantId, sessionId);
  if (!existing) {
    return null; // Not found or access denied
  }

  const query = `
    UPDATE your_table 
    SET ..., updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2 
      AND (session_id = $3 OR created_by = $4)
    RETURNING *
  `;

  const result = await pool.query(query, [id, tenantId, sessionId, sessionId]);
  return result.rows[0];
}

async function remove(id, tenantId, sessionId) {
  if (!tenantId || !sessionId) {
    throw new Error('Tenant ID and Session ID are required');
  }

  // Verify ownership first
  const existing = await get(id, tenantId, sessionId);
  if (!existing) {
    return false;
  }

  const query = `
    DELETE FROM your_table 
    WHERE id = $1 AND tenant_id = $2 
      AND (session_id = $3 OR created_by = $4)
  `;

  const result = await pool.query(query, [id, tenantId, sessionId, sessionId]);
  return result.rowCount > 0;
}
```

#### 3. Update Routes

```javascript
// backend/routes/yourRoutes.js
const express = require('express');
const router = express.Router();
const yourService = require('../services/yourService');
const { requireAuth, getTenantParams } = require('../middleware/tenantContext');

// List resources
router.get('/', requireAuth, async (req, res) => {
  try {
    const { tenantId, sessionId } = getTenantParams(req);
    const items = await yourService.list(tenantId, sessionId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create resource
router.post('/', requireAuth, async (req, res) => {
  try {
    const { tenantId, sessionId } = getTenantParams(req);
    const created = await yourService.create(req.body, tenantId, sessionId);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update resource
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { tenantId, sessionId } = getTenantParams(req);
    const updated = await yourService.update(req.params.id, req.body, tenantId, sessionId);
    if (!updated) {
      return res.status(404).json({ error: 'Not found or access denied' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete resource
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { tenantId, sessionId } = getTenantParams(req);
    const ok = await yourService.remove(req.params.id, tenantId, sessionId);
    if (!ok) {
      return res.status(404).json({ error: 'Not found or access denied' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

#### 4. Register Routes

```javascript
// backend/server.js
const yourRoutes = require('./routes/yourRoutes');
app.use('/api/your-resource', yourRoutes);
```

## For Frontend Developers

### The frontend doesn't need changes!

The multi-tenant architecture is transparent to the frontend:
- Session cookies automatically include tenant context
- All API calls are automatically scoped to the logged-in user's tenant
- No changes needed to existing API calls

### Example Frontend Code

```javascript
// This works automatically with multi-tenancy:
const response = await fetch('/api/offboarding/scheduled', {
  credentials: 'include' // Include session cookie
});
const schedules = await response.json();
// Only returns current user's tenant data
```

## Testing Your Implementation

### 1. Unit Tests for Services

```javascript
describe('YourService Multi-Tenant', () => {
  it('should only return tenant data', async () => {
    const tenant1Items = await yourService.list('tenant-1', 'session-1');
    const tenant2Items = await yourService.list('tenant-2', 'session-2');
    
    expect(tenant1Items).not.toContainEqual(tenant2Items);
  });

  it('should reject cross-tenant access', async () => {
    const created = await yourService.create(data, 'tenant-1', 'session-1');
    const retrieved = await yourService.get(created.id, 'tenant-2', 'session-2');
    
    expect(retrieved).toBeNull();
  });
});
```

### 2. Integration Tests

```javascript
describe('API Multi-Tenant', () => {
  it('should isolate data between tenants', async () => {
    // Login as user 1
    const session1 = await loginAs('user1@domain.com');
    const item1 = await createItem(session1);
    
    // Login as user 2
    const session2 = await loginAs('user2@domain.com');
    const items2 = await listItems(session2);
    
    expect(items2).not.toContain(item1);
  });
});
```

## Common Patterns

### Pattern 1: Shared Resources
If resources should be shared across tenants:

```javascript
// Add a 'shared' flag
const query = `
  SELECT * FROM your_table
  WHERE (tenant_id = $1 OR shared = true)
    AND (session_id = $2 OR created_by = $3 OR shared = true)
`;
```

### Pattern 2: Admin Override
If admins should see all tenant data:

```javascript
async function list(tenantId, sessionId, isAdmin = false) {
  if (isAdmin) {
    return await listAll();
  }
  return await listForTenant(tenantId, sessionId);
}
```

### Pattern 3: Cross-Tenant References
If resources need to reference other tenants:

```javascript
// Store but don't expose tenant IDs
const query = `
  SELECT id, name, status
  -- Don't select tenant_id in response
  FROM your_table
  WHERE id = $1
`;
```

## Troubleshooting

### Issue: "Tenant ID and Session ID are required"
**Cause**: Missing tenant context  
**Solution**: Ensure `requireAuth` middleware is applied to route

### Issue: "Not found or access denied"
**Cause**: Trying to access another tenant's resource  
**Solution**: Verify user has correct permissions and owns the resource

### Issue: Data not showing up
**Cause**: Tenant filtering too strict  
**Solution**: Check tenant_id matches between session and database

### Issue: Performance problems
**Cause**: Missing indexes on tenant columns  
**Solution**: Add indexes as shown in database schema section

## Best Practices

1. ✅ **Always validate tenant params** in service methods
2. ✅ **Use `getTenantParams(req)`** helper in routes
3. ✅ **Verify ownership** before update/delete operations
4. ✅ **Return 404** instead of 403 to avoid information leakage
5. ✅ **Add indexes** on tenant_id and session_id columns
6. ✅ **Test cross-tenant access** scenarios
7. ✅ **Log tenant context** in development mode
8. ✅ **Use parameterized queries** to prevent SQL injection

## Checklist for New Features

- [ ] Database schema includes tenant columns
- [ ] Indexes created for tenant queries
- [ ] Service methods accept tenantId/sessionId
- [ ] All queries filter by tenant
- [ ] Ownership verified before mutations
- [ ] Routes use `requireAuth` middleware
- [ ] Routes use `getTenantParams()` helper
- [ ] Tests verify tenant isolation
- [ ] Documentation updated

## Getting Help

1. Check `MULTI_TENANT_ARCHITECTURE.md` for detailed architecture
2. Look at `backend/services/offboardingService.js` for reference implementation
3. Review `backend/middleware/tenantContext.js` for available helpers
4. Test with multiple user accounts to verify isolation

---

**Follow this guide to ensure all features have proper multi-tenant security!** 🔒✨
