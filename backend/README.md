# Secure Backend API for Employee Offboarding Portal

This backend provides secure, session-based authentication for the Employee Offboarding Portal with encrypted credential storage.

## 🔒 Security Features

- **Encrypted Credential Storage**: All Azure AD credentials are encrypted using AES-256-GCM
- **Server-Side Sessions**: Credentials stored in secure, HttpOnly sessions
- **No Client-Side Secrets**: Client secrets never exposed to browser
- **Rate Limiting**: Protection against brute force attacks
- **CORS Protection**: Configured allowed origins
- **Helmet Security Headers**: XSS, clickjacking, and other attack prevention
- **Redis Session Store** (production): Scalable session management

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Redis (optional, for production)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit .env and add the generated key
```

### 3. Start Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following:

```env
# Server
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-domain.com

# Session Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=your-secret-here

# Encryption Key (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your-encryption-key-here

# Redis (production)
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=https://your-frontend-domain.com

# Security
SECURE_COOKIES=true
TRUST_PROXY=true
```

### Generate Secrets

```bash
# Generate SESSION_SECRET
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/configure` | Save Azure AD credentials (encrypted in session) |
| POST | `/api/auth/validate` | Validate stored credentials |
| POST | `/api/auth/login-app-only` | Login with client credentials |
| GET | `/api/auth/login-oauth2` | Initiate OAuth2 interactive login |
| GET | `/api/auth/callback` | OAuth2 callback handler |
| GET | `/api/auth/session` | Get current session info |
| POST | `/api/auth/logout` | Logout and destroy session |
| DELETE | `/api/auth/credentials` | Clear credentials from session |

### Microsoft Graph API Proxy

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graph/me` | Get current user |
| GET | `/api/graph/users` | List users |
| GET | `/api/graph/users/:id` | Get specific user |
| POST | `/api/graph/users` | Create user |
| PATCH | `/api/graph/users/:id` | Update user |
| DELETE | `/api/graph/users/:id` | Delete user |
| GET | `/api/graph/groups` | List groups |
| GET | `/api/graph/devices` | List managed devices |
| ALL | `/api/graph/proxy/*` | Generic Graph API proxy |

## 🔐 How It Works

### 1. Configure Credentials

```javascript
// POST /api/auth/configure
{
  "clientId": "your-client-id",
  "tenantId": "your-tenant-id",
  "clientSecret": "your-client-secret"  // Optional
}
```

Credentials are:
1. Encrypted using AES-256-GCM
2. Stored in server-side session only
3. Never sent back to client
4. Automatically decrypted when needed

### 2. Authenticate

**App-Only (Client Credentials):**
```javascript
// POST /api/auth/login-app-only
// Uses credentials from session
```

**OAuth2 (Interactive):**
```javascript
// GET /api/auth/login-oauth2
// Returns authorization URL
// User redirects to Azure AD
// Callback at /api/auth/callback
```

### 3. Make Graph API Calls

All Graph API calls go through backend:

```javascript
// GET /api/graph/users
// Backend adds authentication automatically
```

## 🎯 Frontend Integration

### Example: Configure and Login

```javascript
// 1. Configure credentials
const configureResponse = await fetch('http://localhost:5000/api/auth/configure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important: Include cookies
  body: JSON.stringify({
    clientId: 'your-client-id',
    tenantId: 'your-tenant-id',
    clientSecret: 'your-secret' // Optional
  })
});

// 2. Login with app-only
const loginResponse = await fetch('http://localhost:5000/api/auth/login-app-only', {
  method: 'POST',
  credentials: 'include'
});

// 3. Make Graph API calls
const usersResponse = await fetch('http://localhost:5000/api/graph/users', {
  credentials: 'include'
});
```

### Example: OAuth2 Flow

```javascript
// 1. Configure credentials (without secret)
await fetch('http://localhost:5000/api/auth/configure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    clientId: 'your-client-id',
    tenantId: 'your-tenant-id'
  })
});

// 2. Get OAuth2 URL
const response = await fetch('http://localhost:5000/api/auth/login-oauth2', {
  credentials: 'include'
});
const { authUrl } = await response.json();

// 3. Redirect user
window.location.href = authUrl;

// 4. User authenticates and is redirected back to /api/auth/callback
// 5. Backend redirects to your frontend with session cookie
```

## 🏗️ Deployment

### Deploy to Azure App Service

```bash
# Create App Service
az webapp create \
  --resource-group myResourceGroup \
  --plan myAppServicePlan \
  --name employee-portal-api \
  --runtime "NODE|18-lts"

# Configure environment variables
az webapp config appsettings set \
  --resource-group myResourceGroup \
  --name employee-portal-api \
  --settings \
    NODE_ENV=production \
    SESSION_SECRET="your-secret" \
    ENCRYPTION_KEY="your-key" \
    FRONTEND_URL="https://your-frontend.com" \
    REDIS_URL="your-redis-url"

# Deploy
az webapp deployment source config-zip \
  --resource-group myResourceGroup \
  --name employee-portal-api \
  --src backend.zip
```

### Deploy with Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

```bash
docker build -t employee-portal-backend .
docker run -p 5000:5000 --env-file .env employee-portal-backend
```

## 🔍 Testing

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test configuration
curl -X POST http://localhost:5000/api/auth/configure \
  -H "Content-Type: application/json" \
  -d '{"clientId":"test","tenantId":"test","clientSecret":"test"}' \
  -c cookies.txt

# Test login
curl -X POST http://localhost:5000/api/auth/login-app-only \
  -b cookies.txt

# Test session
curl http://localhost:5000/api/auth/session \
  -b cookies.txt
```

## 📊 Monitoring

Monitor these metrics in production:
- Request rate and latency
- Error rates (4xx, 5xx)
- Session creation/destruction rate
- Memory usage
- CPU usage

## 🔄 Session Management

Sessions automatically expire after 1 hour (configurable).

To extend session:
```javascript
// Any authenticated request refreshes the session
fetch('http://localhost:5000/api/auth/session', {
  credentials: 'include'
});
```

## 🛡️ Security Best Practices

1. **Always use HTTPS in production**
2. **Set strong SESSION_SECRET and ENCRYPTION_KEY**
3. **Use Redis for session storage in production**
4. **Enable rate limiting**
5. **Configure CORS properly**
6. **Monitor authentication logs**
7. **Rotate secrets regularly**
8. **Use Azure Key Vault for secrets in production**

## 📝 License

MIT

## 👨‍💻 Author

Kameron McCain
