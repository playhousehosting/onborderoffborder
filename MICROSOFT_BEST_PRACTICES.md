# Microsoft Graph API & Authentication Best Practices

This document outlines how the Employee Offboarding Portal follows Microsoft Learn best practices.

## 📚 Reference Documentation

- [Best practices for working with Microsoft Graph](https://learn.microsoft.com/en-us/graph/best-practices-concept)
- [Microsoft Graph throttling guidance](https://learn.microsoft.com/en-us/graph/throttling)
- [Overview of Microsoft Graph permissions](https://learn.microsoft.com/en-us/graph/permissions-overview)
- [Best practices for secrets management in Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/secrets/secrets-best-practices)
- [MSAL React authentication patterns](https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-single-page-app-react-configure-authentication)

---

## ✅ Implemented Best Practices

### 1. Authentication & Authorization

| Best Practice | Implementation | File(s) |
|--------------|----------------|---------|
| **Use delegated permissions for interactive users** | MSAL SSO uses delegated permissions via OAuth 2.0 Authorization Code flow | `src/hooks/useMSALAuth.js` |
| **Use application permissions for background services** | Convex App-Only uses Client Credentials flow for tenant management | `convex/authActions.ts` |
| **Don't mix permission types in same app** | `serviceFactory.js` routes to correct service based on auth mode | `src/services/serviceFactory.js` |
| **Apply least privilege** | Each service requests only necessary scopes | All service files |

### 2. Throttling & Error Handling

Per [Microsoft Graph throttling guidance](https://learn.microsoft.com/en-us/graph/throttling#best-practices-to-handle-throttling):

```javascript
// src/services/graphService.js - Lines 222-241

// Handle throttling (429 Too Many Requests)
if (response.status === 429 && retryCount < this.maxRetries) {
  const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
  await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  return this.makeRequest(endpoint, options, retryCount + 1);
}

// Handle server errors with exponential backoff
if ((response.status === 500 || response.status === 503) && retryCount < this.maxRetries) {
  const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
  await new Promise(resolve => setTimeout(resolve, backoffDelay));
  return this.makeRequest(endpoint, options, retryCount + 1);
}
```

| Best Practice | Implementation |
|--------------|----------------|
| **Wait for Retry-After header** | ✅ Respects `Retry-After` header value |
| **Exponential backoff for 500/503** | ✅ Uses 2^n seconds with 10s max |
| **Max retry limit** | ✅ Limited to 3 retries |
| **Log throttling events** | ✅ Uses `logger.warn()` |

### 3. Multi-Tenant Application

Per [Building Multi-tenant applications](https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins-modernize/multi-tenant-applications):

| Best Practice | Implementation |
|--------------|----------------|
| **Register as multi-tenant app** | Azure AD app uses "Accounts in any organizational directory" |
| **Admin consent URL** | `/admin-consent` endpoint initiates admin consent flow |
| **Handle consent in target tenant** | Admin consent callback validates and stores consent status |

### 4. Credential Security

Per [Best practices for secrets management](https://learn.microsoft.com/en-us/azure/key-vault/secrets/secrets-best-practices):

| Best Practice | Implementation | Notes |
|--------------|----------------|-------|
| **Encrypt secrets at rest** | ✅ AES-256-CBC encryption | `convex/credentialUtils.ts` |
| **Don't hardcode secrets** | ✅ Uses environment variables | `.env` files are gitignored |
| **Limit access** | ✅ Session-based credential retrieval | Credentials linked to session ID |

### 5. API Response Caching

Per [Best practices to avoid throttling](https://learn.microsoft.com/en-us/graph/throttling#best-practices-to-avoid-throttling):

```javascript
// src/utils/apiCache.js
class ApiCache {
  constructor() {
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
  }
}

// Cache configurations per endpoint type
export const CACHE_CONFIG = {
  users: { ttl: 5 * 60 * 1000 },      // 5 min - frequently changing
  devices: { ttl: 10 * 60 * 1000 },   // 10 min - moderate changes
  groups: { ttl: 15 * 60 * 1000 },    // 15 min - less frequent changes
  settings: { ttl: 30 * 60 * 1000 },  // 30 min - rarely changes
};
```

---

## 🔧 Production Recommendations

### 1. Use Azure Key Vault for Secrets (HIGH Priority)

**Current State:** Encryption key stored in environment variable  
**Recommendation:** Store in Azure Key Vault with managed identity access

```typescript
// Production implementation example
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const client = new SecretClient(
  "https://your-vault-name.vault.azure.net",
  new DefaultAzureCredential()
);
const encryptionKey = await client.getSecret("encryption-key");
```

### 2. Implement Secret Rotation (MEDIUM Priority)

**Microsoft Recommendation:** Rotate secrets every 60 days

```javascript
// Recommended: Add rotation tracking
const SECRET_ROTATION_DAYS = 60;
const lastRotation = await getSecretMetadata('lastRotation');
if (daysSince(lastRotation) > SECRET_ROTATION_DAYS) {
  await notifyAdmins('Secret rotation required');
}
```

### 3. Enable Audit Logging (MEDIUM Priority)

**Microsoft Recommendation:** Log all secret access for compliance

```typescript
// Add to authActions.ts
function logCredentialAccess(action: string, sessionId: string) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action,
    sessionId: sessionId.substring(0, 8) + '...',
    source: 'CredentialManager'
  }));
}
```

### 4. Consider Managed Identities (LOW Priority for SaaS)

For Azure-hosted components, consider using Managed Identities:

```javascript
// When hosting backend on Azure
import { DefaultAzureCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

const credential = new DefaultAzureCredential();
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/.default"]
});
const graphClient = Client.initWithMiddleware({ authProvider });
```

---

## 📊 Compliance Checklist

| Category | Status | Notes |
|----------|--------|-------|
| **Permission Separation** | ✅ | Delegated vs App-Only properly separated |
| **Throttling Handling** | ✅ | Retry-After + exponential backoff |
| **Error Handling** | ✅ | Structured error responses with HTTP codes |
| **Multi-Tenant Support** | ✅ | Admin consent flow implemented |
| **Credential Encryption** | ✅ | AES-256-CBC at rest |
| **Response Caching** | ✅ | TTL-based caching per endpoint type |
| **Azure Key Vault** | ⚠️ | Recommended for production |
| **Secret Rotation** | ⚠️ | Manual - consider automation |
| **Audit Logging** | ⚠️ | Basic - enhance for compliance |

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Application                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐        ┌─────────────────┐                 │
│  │   MSAL SSO      │        │  Custom Tenant  │                 │
│  │   (Delegated)   │        │   (App-Only)    │                 │
│  └────────┬────────┘        └────────┬────────┘                 │
│           │                          │                           │
│           v                          v                           │
│  ┌─────────────────────────────────────────────────┐            │
│  │            serviceFactory.js                     │            │
│  │   Routes to correct service based on auth mode   │            │
│  └─────────────────────────────────────────────────┘            │
│           │                          │                           │
│           v                          v                           │
│  ┌─────────────────┐        ┌─────────────────┐                 │
│  │ msalGraphService│        │  graphService   │                 │
│  │ (User Token)    │        │ (App Token)     │                 │
│  └────────┬────────┘        └────────┬────────┘                 │
│           │                          │                           │
└───────────┼──────────────────────────┼───────────────────────────┘
            │                          │
            v                          v
   ┌────────────────┐         ┌────────────────┐
   │  Convex Proxy  │         │  Convex Actions │
   │ /msal-proxy/*  │         │ getAppOnlyToken │
   └────────┬───────┘         └────────┬───────┘
            │                          │
            └──────────┬───────────────┘
                       v
            ┌─────────────────────┐
            │  Microsoft Graph    │
            │  https://graph.     │
            │  microsoft.com      │
            └─────────────────────┘
```

---

*Last Updated: November 2024*
*Based on Microsoft Learn documentation accessed November 2024*
