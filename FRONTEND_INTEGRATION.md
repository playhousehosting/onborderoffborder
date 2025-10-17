# Frontend Integration Guide

## Overview

This guide shows how to integrate the React frontend with the secure backend API.

## Architecture

```
Frontend (React) → Backend API → Microsoft Graph API
                ↑ Session Cookie
```

**Key Points:**
- Credentials stored on backend only (encrypted)
- Frontend never sees client secrets
- Session managed via HttpOnly cookies
- All Graph API calls proxied through backend

## Setup

### 1. Configure API Base URL

Create or update `src/config/apiConfig.js`:

```javascript
// src/config/apiConfig.js
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Auth endpoints
  configure: '/api/auth/configure',
  validate: '/api/auth/validate',
  loginAppOnly: '/api/auth/login-app-only',
  loginOAuth2: '/api/auth/login-oauth2',
  callback: '/api/auth/callback',
  session: '/api/auth/session',
  logout: '/api/auth/logout',
  clearCredentials: '/api/auth/credentials',
  
  // Graph endpoints
  me: '/api/graph/me',
  users: '/api/graph/users',
  groups: '/api/graph/groups',
  devices: '/api/graph/devices',
  graphProxy: '/api/graph/proxy'
};
```

### 2. Create Backend API Service

Create `src/services/backendApiService.js`:

```javascript
// src/services/backendApiService.js
import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';

class BackendApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Make API request with credentials (cookies)
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      credentials: 'include', // Important: Include cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Auth methods
  async configureCredentials(clientId, tenantId, clientSecret = null) {
    return this.request(API_ENDPOINTS.configure, {
      method: 'POST',
      body: JSON.stringify({ clientId, tenantId, clientSecret })
    });
  }

  async validateCredentials() {
    return this.request(API_ENDPOINTS.validate, { method: 'POST' });
  }

  async loginAppOnly() {
    return this.request(API_ENDPOINTS.loginAppOnly, { method: 'POST' });
  }

  async getOAuth2Url() {
    return this.request(API_ENDPOINTS.loginOAuth2);
  }

  async getSession() {
    return this.request(API_ENDPOINTS.session);
  }

  async logout() {
    return this.request(API_ENDPOINTS.logout, { method: 'POST' });
  }

  async clearCredentials() {
    return this.request(API_ENDPOINTS.clearCredentials, { method: 'DELETE' });
  }

  // Graph API methods
  async getMe() {
    return this.request(API_ENDPOINTS.me);
  }

  async getUsers(options = {}) {
    const params = new URLSearchParams(options);
    return this.request(`${API_ENDPOINTS.users}?${params}`);
  }

  async getUser(userId) {
    return this.request(`${API_ENDPOINTS.users}/${userId}`);
  }

  async createUser(userData) {
    return this.request(API_ENDPOINTS.users, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async updateUser(userId, userData) {
    return this.request(`${API_ENDPOINTS.users}/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(userId) {
    return this.request(`${API_ENDPOINTS.users}/${userId}`, {
      method: 'DELETE'
    });
  }

  async getGroups(options = {}) {
    const params = new URLSearchParams(options);
    return this.request(`${API_ENDPOINTS.groups}?${params}`);
  }

  async getDevices(options = {}) {
    const params = new URLSearchParams(options);
    return this.request(`${API_ENDPOINTS.devices}?${params}`);
  }

  // Generic Graph API proxy
  async graphProxy(endpoint, method = 'GET', data = null, useBeta = false) {
    const url = `${API_ENDPOINTS.graphProxy}${endpoint}${useBeta ? '?beta=true' : ''}`;
    return this.request(url, {
      method,
      ...(data && { body: JSON.stringify(data) })
    });
  }
}

export const backendApi = new BackendApiService();
export default backendApi;
```

### 3. Update Login Component

Update `src/components/auth/Login.js`:

```javascript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import backendApi from '../../services/backendApiService';

const Login = () => {
  const [config, setConfig] = useState({
    clientId: '',
    tenantId: '',
    clientSecret: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveAndLogin = async () => {
    if (!config.clientId || !config.tenantId) {
      toast.error('Client ID and Tenant ID are required');
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Configure credentials (sent to backend, encrypted)
      await backendApi.configureCredentials(
        config.clientId,
        config.tenantId,
        config.clientSecret || null
      );

      toast.success('Credentials saved securely!');

      // Step 2: Login
      if (config.clientSecret) {
        // App-Only authentication
        await backendApi.loginAppOnly();
        toast.success('Logged in with client credentials!');
        navigate('/dashboard');
      } else {
        // OAuth2 interactive authentication
        const { authUrl } = await backendApi.getOAuth2Url();
        // Redirect to Azure AD for authentication
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(`Login failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>Employee Offboarding Portal</h1>
      
      <div className="credentials-form">
        <h2>Azure AD Credentials</h2>
        
        <input
          type="text"
          name="tenantId"
          placeholder="Tenant ID"
          value={config.tenantId}
          onChange={handleConfigChange}
        />
        
        <input
          type="text"
          name="clientId"
          placeholder="Client ID"
          value={config.clientId}
          onChange={handleConfigChange}
        />
        
        <input
          type="password"
          name="clientSecret"
          placeholder="Client Secret (optional)"
          value={config.clientSecret}
          onChange={handleConfigChange}
        />
        
        <button
          onClick={handleSaveAndLogin}
          disabled={isLoading || !config.clientId || !config.tenantId}
        >
          {isLoading ? 'Logging in...' : 'Save & Login'}
        </button>
        
        <p className="info">
          ✅ Credentials are encrypted and stored securely on the server
        </p>
      </div>
    </div>
  );
};

export default Login;
```

### 4. Create Auth Context

Create `src/contexts/SecureAuthContext.js`:

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import backendApi from '../services/backendApiService';

const SecureAuthContext = createContext();

export const useAuth = () => {
  const context = useContext(SecureAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within SecureAuthProvider');
  }
  return context;
};

export const SecureAuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState(null);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);
      const session = await backendApi.getSession();
      
      if (session.authenticated) {
        setIsAuthenticated(true);
        setUser(session.user);
        setAuthMode(session.authMode);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setAuthMode(null);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await backendApi.logout();
      setIsAuthenticated(false);
      setUser(null);
      setAuthMode(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    authMode,
    checkSession,
    logout
  };

  return (
    <SecureAuthContext.Provider value={value}>
      {children}
    </SecureAuthContext.Provider>
  );
};
```

### 5. Update App.js

```javascript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SecureAuthProvider } from './contexts/SecureAuthContext';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import PrivateRoute from './components/common/PrivateRoute';

function App() {
  return (
    <SecureAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </SecureAuthProvider>
  );
}

export default App;
```

### 6. Create Private Route Component

```javascript
// src/components/common/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/SecureAuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/" />;
};

export default PrivateRoute;
```

### 7. Update Environment Variables

Create or update `.env` in the frontend root:

```env
# Frontend Environment Variables
REACT_APP_API_URL=http://localhost:5000

# For production:
# REACT_APP_API_URL=https://your-backend-domain.com
```

## Usage Examples

### Configure and Login

```javascript
// User enters credentials in the UI
// Frontend sends to backend (encrypted)
await backendApi.configureCredentials(clientId, tenantId, clientSecret);

// Backend encrypts and stores in session
// Frontend receives confirmation
// Credentials never visible in browser!
```

### Make Graph API Calls

```javascript
// All calls go through backend
// Backend adds authentication automatically

// Get users
const users = await backendApi.getUsers({
  top: 10,
  filter: "startswith(displayName,'John')"
});

// Get specific user
const user = await backendApi.getUser('user-id');

// Create user
const newUser = await backendApi.createUser({
  displayName: 'John Doe',
  userPrincipalName: 'john@company.com',
  mailNickname: 'john',
  accountEnabled: true,
  passwordProfile: {
    password: 'TempPass123!',
    forceChangePasswordNextSignIn: true
  }
});
```

### Check Authentication Status

```javascript
const { isAuthenticated, user, authMode } = useAuth();

if (isAuthenticated) {
  console.log('User:', user.displayName);
  console.log('Auth mode:', authMode); // 'app-only' or 'oauth2'
}
```

## Deployment

### Development

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd ..
npm start
```

### Production

1. **Deploy Backend:**
   - Azure App Service, AWS, Heroku, etc.
   - Set environment variables
   - Enable HTTPS
   - Configure CORS for your frontend domain

2. **Deploy Frontend:**
   - Build: `npm run build`
   - Deploy to static hosting (Vercel, Netlify, Azure Static Web Apps)
   - Set `REACT_APP_API_URL` to your backend URL

3. **Update CORS:**
   ```env
   # Backend .env
   ALLOWED_ORIGINS=https://your-frontend-domain.com
   ```

## Security Checklist

- ✅ Backend API uses HTTPS in production
- ✅ SESSION_SECRET is strong and unique
- ✅ ENCRYPTION_KEY is strong and unique
- ✅ CORS is configured for your frontend domain only
- ✅ Credentials stored on backend only (encrypted)
- ✅ HttpOnly cookies for session management
- ✅ Rate limiting enabled
- ✅ Security headers (Helmet) enabled
- ✅ Environment variables not committed to git

## Troubleshooting

### CORS Errors

Make sure backend CORS is configured:
```env
ALLOWED_ORIGINS=http://localhost:3000
```

### Session Not Persisting

Make sure to include credentials:
```javascript
fetch(url, {
  credentials: 'include'  // Important!
});
```

### 401 Unauthorized

Check session:
```javascript
const session = await backendApi.getSession();
console.log('Session:', session);
```

## Support

- Backend README: `backend/README.md`
- Security Architecture: `SECURITY_ARCHITECTURE.md`
