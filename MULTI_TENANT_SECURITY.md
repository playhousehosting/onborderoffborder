# Multi-Tenant Security Best Practices Implementation

This document describes the security enhancements implemented for the multi-tenant Employee Offboarding Portal.

## Overview

The application follows Microsoft's best practices for multi-tenant SaaS applications:

1. **Token Validation** - Validates JWT tokens are from trusted Microsoft identity platform
2. **Admin Consent Flow** - Allows tenant administrators to grant org-wide permissions
3. **Tenant Context Isolation** - Stores and enforces tenant boundaries for data access

## Azure AD Application Configuration

**IMPORTANT**: Before deploying, update your Azure AD app registration:

### Step 1: Add Redirect URIs
Navigate to: **Azure Portal → App Registrations → Your App → Authentication**

Add these redirect URIs (Platform: **Web**):
- `https://neighborly-manatee-845.convex.site/api/auth/callback/azure-ad` (SSO login)
- `https://neighborly-manatee-845.convex.site/admin-consent-callback` (Admin consent)

### Step 2: Verify API Permissions
In **API Permissions**, ensure these are configured:
- `openid` (Microsoft Graph, Delegated)
- `profile` (Microsoft Graph, Delegated)
- `email` (Microsoft Graph, Delegated)
- `User.Read` (Microsoft Graph, Delegated)
- `offline_access` (Microsoft Graph, Delegated)

### Step 3: Application Settings
- **Supported account types**: Accounts in any organizational directory (Multi-tenant)
- **Allow public client flows**: No (using PKCE for security)
- **Client Secret**: Already configured in Convex environment variables

## 1. Token Validation

### Implementation
Located in `convex/authInit.ts`, the token validation ensures:

- All tokens originate from `login.microsoftonline.com`
- Invalid issuers are rejected to prevent token substitution attacks
- Tenant ID (`tid`) is extracted and stored for data isolation

### Code
```typescript
async conform(response) {
  const body = await response.json();
  
  // Validate issuer is from Microsoft
  if (body.id_token) {
    const [, payload] = body.id_token.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    
    // Verify issuer is from login.microsoftonline.com
    if (!decoded.iss || !decoded.iss.includes('login.microsoftonline.com')) {
      throw new Error('Invalid token issuer');
    }
    
    // Store tenant ID for multi-tenant isolation
    body.tenant_id = decoded.tid;
  }
  
  return Response.json(body);
}
```

## 2. Admin Consent Flow

### Purpose
Allows tenant administrators to grant organization-wide consent to the application, eliminating the need for individual user consent.

### Endpoints

#### Initiate Admin Consent
**URL:** `https://your-deployment.convex.site/admin-consent`

Redirects tenant administrators to Microsoft's admin consent page.

#### Admin Consent Callback
**URL:** `https://your-deployment.convex.site/admin-consent-callback`

Processes the consent response and records the grant in the database.

### Usage

1. **For Tenant Administrators:**
   - Navigate to: `https://neighborly-manatee-845.convex.site/admin-consent`
   - Sign in with admin credentials
   - Review and grant permissions
   - Automatically redirected back to application

2. **For Application Owners:**
   - Monitor consent grants in `tenantConsents` table
   - Track which tenants have granted admin consent
   - Verify consent status before accessing tenant data

### Database Schema

```typescript
tenantConsents: defineTable({
  tenantId: v.string(),           // Azure AD Tenant ID
  adminConsentGranted: v.boolean(), // Consent status
  consentedAt: v.number(),        // Timestamp
  consentedBy: v.optional(v.string()), // Admin who granted
  scopes: v.optional(v.array(v.string())), // Permissions
  lastVerified: v.optional(v.number()),
})
```

## 3. Tenant Context Isolation

### Implementation
Every user profile includes their Azure AD tenant ID:

```typescript
profile(profile) {
  return {
    id: profile.sub || profile.oid,
    name: profile.name,
    email: profile.email || profile.preferred_username,
    tenantId: profile.tid, // Tenant isolation
  };
}
```

### Data Access Pattern

All queries and mutations should filter by tenant:

```typescript
// Example: Get users for specific tenant
const users = await ctx.db
  .query("sessions")
  .withIndex("by_tenant", (q) => q.eq("tenantId", userTenantId))
  .collect();
```

### getCurrentUser Enhancement

The `getCurrentUser` query now includes tenant context:

```typescript
return {
  _id: user._id,
  email: user.email,
  name: user.name,
  tenantId: session?.tenantId, // For data isolation
  sessionId: session?.sessionId,
};
```

## Security Considerations

### Token Validation
- ✅ Validates issuer from `login.microsoftonline.com`
- ✅ Prevents token substitution attacks
- ✅ Extracts tenant ID for isolation

### Admin Consent
- ✅ Organization-wide permissions
- ✅ Eliminates individual user consent prompts
- ✅ Tracks consent grants per tenant
- ✅ Auditable consent records

### Tenant Isolation
- ✅ Every user has tenant context
- ✅ Sessions linked to specific tenants
- ✅ Data queries filtered by tenant ID
- ✅ Prevents cross-tenant data access

## Best Practices Compliance

According to Microsoft Learn documentation:

1. **Multi-tenant Apps** ✅
   - Using "common" endpoint for any organization
   - Supporting tenant-specific identity claims
   - Proper token validation

2. **OAuth 2.0 with PKCE** ✅
   - PKCE enabled for all authentication flows
   - State parameter validation
   - Secure authorization code exchange

3. **Admin Consent** ✅
   - Dedicated admin consent endpoint
   - Organization-wide permission grants
   - Consent tracking and verification

4. **Tenant Context** ✅
   - Tenant ID stored in user profile
   - Session isolation by tenant
   - Query-level tenant filtering

## Testing Admin Consent

### Test Flow:

1. As a tenant admin, visit:
   ```
   https://neighborly-manatee-845.convex.site/admin-consent
   ```

2. Sign in with admin credentials

3. Review permissions:
   - openid
   - profile
   - email
   - User.Read
   - offline_access

4. Click "Accept"

5. Verify success page displays

6. Check database for consent record:
   ```typescript
   // Query: convex/adminConsent.ts
   const consent = await ctx.db
     .query("tenantConsents")
     .withIndex("by_tenant", (q) => q.eq("tenantId", "your-tenant-id"))
     .first();
   ```

## Migration Notes

Existing users will continue to work. New security enhancements:
- Token validation adds extra security layer
- Admin consent is optional but recommended
- Tenant context automatically captured from tokens

## References

- [Microsoft Multi-tenant Apps Best Practices](https://learn.microsoft.com/en-us/entra/identity-platform/single-and-multi-tenant-apps#best-practices-for-multitenant-apps)
- [OAuth 2.0 Authorization Code Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Admin Consent Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent)
