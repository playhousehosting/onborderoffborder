# Security Architecture for Multi-Tenant Public Application

## 🚨 CRITICAL: Current Implementation is NOT Production-Ready

The current implementation stores sensitive credentials in browser localStorage, which is **INSECURE** for a public-facing application.

## Recommended Secure Architecture

### Option 1: Backend Authentication Service (RECOMMENDED for Production)

#### Architecture:
```
User Browser → Backend API → Azure AD → Microsoft Graph API
```

#### Implementation:
1. **Backend API Server** (Node.js/Express, .NET, Python/Flask, etc.)
   - Stores Azure AD credentials securely in environment variables or Azure Key Vault
   - Handles OAuth2 authorization code flow with PKCE
   - Issues secure session tokens (JWT) to frontend
   - Proxies Graph API requests with proper authentication

2. **Frontend (React)**
   - Stores only session tokens (HttpOnly cookies or short-lived JWT)
   - Never sees or stores client secrets
   - Sends authenticated requests to backend API

#### Benefits:
- ✅ Client secrets never exposed to browser
- ✅ Proper session management
- ✅ Can handle hundreds/thousands of concurrent users
- ✅ Centralized credential rotation
- ✅ Audit logging and monitoring
- ✅ Rate limiting and security controls

#### Required Components:

**Backend API Endpoints:**
```
POST   /api/auth/login          - Initiate OAuth2 flow
GET    /api/auth/callback       - OAuth2 callback handler
POST   /api/auth/logout         - Terminate session
GET    /api/auth/session        - Validate session
POST   /api/graph/*             - Proxy Graph API calls
```

**Backend Tech Stack Options:**
- Node.js + Express + Passport.js
- ASP.NET Core + Microsoft.Identity.Web
- Python + Flask + MSAL
- Any backend that supports OAuth2/OIDC

### Option 2: Pure OAuth2 Delegated Permissions (User Authentication Only)

#### Architecture:
```
User Browser → Azure AD (Interactive Login) → Microsoft Graph API
```

#### Implementation:
- Use ONLY OAuth2 interactive login (no client secrets)
- Users authenticate with their own Microsoft accounts
- Application uses delegated permissions
- MSAL.js handles token management in browser

#### Benefits:
- ✅ No client secrets needed
- ✅ Works with existing MSAL setup
- ✅ Each user's own credentials
- ✅ No backend required for simple use cases

#### Limitations:
- ❌ No app-only (unattended) operations
- ❌ Limited to user's own permissions
- ❌ Requires interactive sign-in

### Option 3: Azure AD B2C + Backend (Multi-Tenant SaaS)

For a true multi-tenant SaaS where different organizations can register:

#### Architecture:
```
User → Azure AD B2C → Backend API → Azure Key Vault → Customer's Azure AD
```

#### Features:
- Each customer registers their own Azure AD app
- Credentials stored encrypted in Azure Key Vault
- Backend manages per-tenant authentication
- Proper tenant isolation

## Implementation Roadmap

### Phase 1: Immediate Security Fix (THIS WEEK)

1. **Remove Client Secret from Frontend**
   ```javascript
   // Remove this IMMEDIATELY from production:
   localStorage.setItem('azureConfig', JSON.stringify({
     clientSecret: '...'  // ❌ NEVER store in browser
   }));
   ```

2. **Implement OAuth2-Only Mode**
   - Remove app-only authentication from UI
   - Use only interactive OAuth2 with delegated permissions
   - Let MSAL.js handle token caching securely

### Phase 2: Backend API (2-4 WEEKS)

1. **Create Backend API**
   - Set up Express.js or ASP.NET Core backend
   - Move Azure AD credentials to backend environment variables
   - Implement OAuth2 authorization code flow

2. **Session Management**
   - Use HttpOnly cookies for session tokens
   - Implement JWT with short expiration (15-30 minutes)
   - Add refresh token rotation

3. **API Proxy Layer**
   - All Graph API calls go through backend
   - Backend adds authentication headers
   - Rate limiting and request validation

### Phase 3: Advanced Features (1-2 MONTHS)

1. **Multi-Tenant Support**
   - Database to store per-tenant configurations
   - Azure Key Vault integration
   - Tenant isolation

2. **Security Features**
   - Audit logging
   - Rate limiting
   - IP whitelisting
   - MFA enforcement
   - Role-based access control (RBAC)

## Recommended Technology Stack

### Backend Options:

#### Option A: Node.js + Express
```javascript
// server.js
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { ConfidentialClientApplication } = require('@azure/msal-node');

const app = express();

// MSAL configuration with client secret on backend
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    authority: process.env.AZURE_AUTHORITY,
  }
};

const cca = new ConfidentialClientApplication(msalConfig);

// OAuth2 routes
app.get('/api/auth/signin', (req, res) => {
  // Redirect to Azure AD for authentication
});

app.get('/api/auth/callback', async (req, res) => {
  // Handle callback, exchange code for tokens
});

app.post('/api/graph/*', async (req, res) => {
  // Proxy Graph API requests with proper auth
});
```

#### Option B: ASP.NET Core
```csharp
// Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
        .AddMicrosoftIdentityWebApp(Configuration.GetSection("AzureAd"))
        .EnableTokenAcquisitionToCallDownstreamApi()
        .AddMicrosoftGraph(Configuration.GetSection("Graph"))
        .AddInMemoryTokenCaches();
}
```

### Frontend Changes:

```javascript
// authService.js - NEW SECURE VERSION
class AuthService {
  async login() {
    // Redirect to backend OAuth2 endpoint
    window.location.href = '/api/auth/signin';
  }

  async getSession() {
    // Check session with backend
    const response = await fetch('/api/auth/session', {
      credentials: 'include' // Include HttpOnly cookie
    });
    return response.json();
  }

  async callGraphAPI(endpoint, method, body) {
    // All Graph API calls go through backend
    const response = await fetch(`/api/graph${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined
    });
    return response.json();
  }
}
```

## Environment Variables (Backend)

```env
# .env (NEVER commit to git)
AZURE_CLIENT_ID=your-client-id
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_SECRET=your-client-secret
SESSION_SECRET=random-secret-key
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# For production, use Azure Key Vault:
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
```

## Security Best Practices

### ✅ DO:
- Store credentials in backend only
- Use environment variables or Azure Key Vault
- Implement proper session management
- Use HttpOnly, Secure, SameSite cookies
- Enable CORS properly
- Implement rate limiting
- Log all authentication attempts
- Use HTTPS everywhere
- Regular security audits
- Implement CSRF protection

### ❌ DON'T:
- Store client secrets in browser
- Use localStorage for sensitive data
- Expose Azure AD credentials in frontend code
- Trust client-side validation only
- Hardcode credentials
- Use weak session tokens
- Allow unlimited API calls

## Migration Steps

### Step 1: Create Backend (Week 1)
```bash
# Initialize backend project
mkdir employee-portal-backend
cd employee-portal-backend
npm init -y
npm install express @azure/msal-node express-session cors dotenv
```

### Step 2: Move Credentials (Week 1)
- Move all Azure AD config to backend
- Update frontend to call backend APIs
- Remove localStorage credential storage

### Step 3: Deploy Backend (Week 2)
- Deploy to Azure App Service, AWS, or Heroku
- Configure environment variables
- Set up SSL/HTTPS
- Configure CORS for frontend domain

### Step 4: Update Frontend (Week 2)
- Remove direct MSAL calls from frontend
- Implement backend API calls
- Update authentication context
- Test end-to-end flow

## Quick Start: Secure Demo Mode

For immediate security improvement, use ONLY OAuth2:

```javascript
// Remove from Login.js:
- Client Secret input field
- App-Only authentication
- handleAppOnlyLogin function
- localStorage credential storage

// Keep only:
- OAuth2 interactive login
- Demo mode (for testing with mock data)
```

## Resources

- [Azure AD Authentication Flows](https://docs.microsoft.com/en-us/azure/active-directory/develop/authentication-flows-app-scenarios)
- [MSAL.js Best Practices](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## Support

For implementation help:
1. Review Azure AD App Registration setup
2. Choose architecture (Backend API vs OAuth2-only)
3. Plan migration timeline
4. Implement security measures
5. Test thoroughly before production deployment

---

**⚠️ IMPORTANT: Do NOT deploy the current version to production with client secret storage in the browser!**
