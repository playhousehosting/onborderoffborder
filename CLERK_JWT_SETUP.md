# Clerk JWT Template Configuration

## Complete JWT Template for Your Application

To ensure your Clerk authentication works properly with your backend, you need to customize the JWT session token to include the necessary claims.

---

## 📋 Step-by-Step Setup

### 1. Navigate to Clerk Dashboard

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your application: **Employee Offboarding Portal**
3. In the left sidebar, click **Sessions**

### 2. Configure Custom JWT Template

Under **Customize session token**, click on the **Claims editor** and paste the following JSON:

```json
{
  "email": "{{user.primary_email_address}}",
  "email_verified": "{{user.primary_email_address_verified}}",
  "family_name": "{{user.last_name}}",
  "given_name": "{{user.first_name}}",
  "name": "{{user.full_name}}",
  "preferred_username": "{{user.username}}",
  "user_id": "{{user.id}}",
  "username": "{{user.username}}",
  "fullName": "{{user.full_name}}",
  "primaryEmail": "{{user.primary_email_address}}",
  "imageUrl": "{{user.image_url}}",
  "organizationId": "{{org.id}}",
  "organizationSlug": "{{org.slug}}",
  "organizationName": "{{org.name}}",
  "permissions": "{{user.public_metadata.permissions}}",
  "role": "{{user.public_metadata.role}}"
}
```

> **Note:** Reserved claims like `azp`, `sub`, `iss`, `aud`, `exp`, `nbf`, `iat`, and `jti` are automatically included by Clerk and cannot be customized.

### 3. Click **Save**

---

## 🔍 What Each Claim Does

### Automatically Included by Clerk (Reserved Claims)
These are added automatically and cannot be customized:
- **`azp`** - Authorized party (client ID making the request)
- **`sub`** - Subject (unique user identifier) - standard JWT claim
- **`iss`** - Issuer (Clerk's domain)
- **`aud`** - Audience (your application)
- **`exp`** - Expiration time
- **`nbf`** - Not before time
- **`iat`** - Issued at time
- **`jti`** - JWT ID (unique token identifier)

### Custom Claims (What You Add)
- **`email`** - User's primary email address
- **`email_verified`** - Whether email is verified
- **`family_name`** - User's last name
- **`given_name`** - User's first name
- **`name`** - User's full name
- **`preferred_username`** - Username
- **`user_id`** - Clerk's user ID (for convenience)
- **`username`** - User's username
- **`fullName`** - Full name (for easier access)
- **`primaryEmail`** - Primary email (for easier access)
- **`imageUrl`** - User's profile image URL

### Organization Claims (if using Clerk Organizations)
- **`organizationId`** - Current organization ID
- **`organizationSlug`** - Organization slug/URL-safe name
- **`organizationName`** - Organization display name

### Custom Role/Permission Claims
- **`permissions`** - Array of permissions from user metadata
- **`role`** - User's role from public metadata

---

## 🎯 Why These Claims Matter

### For Your Backend Authentication
Your Convex backend (`clerkProxy.ts`) needs these claims to:
- ✅ Verify the user's identity (`sub`, `user_id`)
- ✅ Check authorization (`azp` for CSRF protection)
- ✅ Access user information without additional API calls
- ✅ Display user details in the UI

### For Microsoft Graph API Integration
When proxying Graph API calls through Clerk:
- ✅ `email` - Used to look up users in Azure AD
- ✅ `sub` - Used to track which Clerk user made the request
- ✅ `organizationId` - Used for multi-tenant scenarios

### For Frontend Components
Your React components can access these claims via `auth().sessionClaims`:
```javascript
import { useAuth } from '@clerk/clerk-react';

function UserProfile() {
  const { sessionClaims } = useAuth();
  
  return (
    <div>
      <h1>Welcome, {sessionClaims.fullName}</h1>
      <p>Email: {sessionClaims.primaryEmail}</p>
      <img src={sessionClaims.imageUrl} alt="Profile" />
    </div>
  );
}
```

---

## 🔒 Security Considerations

### Cookie Size Limit
- Clerk stores JWT in a cookie (4KB browser limit)
- Default Clerk claims use ~2.8KB
- Custom claims limited to ~1.2KB
- **Current template size: ~600 bytes** ✅ Well within limits

### Authorized Parties (`azp`)
The `azp` claim is automatically included by Clerk and protects against CSRF attacks by validating the request origin. Clerk automatically sets this to the client ID making the request.

### Sensitive Data
**⚠️ DO NOT include:**
- Passwords
- API keys
- Secrets
- Social Security Numbers
- Payment information

**✅ Safe to include:**
- Name, email (already public to app)
- Role/permissions (needed for authorization)
- Non-sensitive metadata

---

## 🧪 Testing Your JWT Configuration

### 1. In Browser DevTools
```javascript
// Open Console, run:
console.log(await Clerk.session.getToken());
```

### 2. Decode the JWT
1. Copy the token from DevTools
2. Go to [https://jwt.io](https://jwt.io)
3. Paste token to verify claims are present

### 3. Test in Your App
```javascript
// In any component
import { useAuth } from '@clerk/clerk-react';

function DebugAuth() {
  const { sessionClaims } = useAuth();
  
  console.log('Session Claims:', sessionClaims);
  
  return <pre>{JSON.stringify(sessionClaims, null, 2)}</pre>;
}
```

---

## 🔄 Accessing Claims in Different Contexts

### Frontend (React)
```javascript
import { useAuth } from '@clerk/clerk-react';

const { sessionClaims } = useAuth();
const userEmail = sessionClaims.primaryEmail;
const userName = sessionClaims.fullName;
```

### Backend (Convex)
```typescript
// In clerkProxy.ts or any Convex function
const decoded = jwt.verify(token, publicKey);

console.log('User ID:', decoded.sub);
console.log('Email:', decoded.email);
console.log('Organization:', decoded.organizationId);
```

### API Routes
```javascript
// Next.js API route example
import { auth } from '@clerk/nextjs/server';

export default async function handler(req, res) {
  const { sessionClaims } = await auth();
  
  if (!sessionClaims.email_verified) {
    return res.status(403).json({ error: 'Email not verified' });
  }
  
  // Continue with verified user
}
```

---

## 🎨 TypeScript Support

Add global type definitions for auto-complete:

**File: `types/globals.d.ts`**
```typescript
export {}

declare global {
  interface CustomJwtSessionClaims {
    // Custom claims you added
    email?: string;
    email_verified?: boolean;
    family_name?: string;
    given_name?: string;
    name?: string;
    preferred_username?: string;
    user_id?: string;
    username?: string;
    fullName?: string;
    primaryEmail?: string;
    imageUrl?: string;
    organizationId?: string;
    organizationSlug?: string;
    organizationName?: string;
    permissions?: string[];
    role?: string;
    // Reserved claims (automatically included by Clerk)
    azp?: string;
    sub?: string;
    iss?: string;
    aud?: string | string[];
    exp?: number;
    nbf?: number;
    iat?: number;
    jti?: string;
  }
}
```

Now you'll get IntelliSense when accessing `sessionClaims.fullName` etc.

---

## ✅ Verification Checklist

After saving your JWT template:

- [ ] JWT template saved in Clerk Dashboard
- [ ] Test login and verify token contains custom claims
- [ ] Check browser DevTools → Application → Cookies → `__session` (should be < 4KB)
- [ ] Verify `clerkProxy.ts` can decode and access claims
- [ ] Test frontend components can access `sessionClaims`
- [ ] Add TypeScript types (`types/globals.d.ts`)
- [ ] Test in production after deployment

---

## 🆘 Troubleshooting

### "Cookie too large" error
- **Cause:** Custom claims exceed 1.2KB
- **Solution:** Remove unnecessary claims from the template

### Claims not appearing in token
- **Cause:** Didn't click "Save" in Clerk Dashboard
- **Solution:** Save template and refresh your app

### `undefined` when accessing claims
- **Cause:** User data not yet loaded or claim name typo
- **Solution:** Check `sessionClaims` exists before accessing properties

### Old claims still showing
- **Cause:** Browser cached old session token
- **Solution:** Sign out and sign back in to get new token

---

## 📚 Additional Resources

- [Clerk Session Tokens Docs](https://clerk.com/docs/backend-requests/making/custom-session-token)
- [JWT.io - Token Debugger](https://jwt.io)
- [Clerk Dashboard - Sessions](https://dashboard.clerk.com)
- [OpenID Connect Claims](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims)

---

## 🎉 You're All Set!

Your Clerk JWT is now configured with all the necessary claims for:
- ✅ Authentication verification
- ✅ User identification
- ✅ Authorization checks
- ✅ Graph API integration
- ✅ Frontend display
- ✅ Multi-tenant support

**Next Steps:**
1. Save the JWT template in Clerk Dashboard
2. Test authentication flow
3. Verify claims are accessible in your app
4. Deploy to production
