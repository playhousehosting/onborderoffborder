# Employee Lifecycle Management Portal - Cloud Agent Instructions

## Repository Overview

This is an **Employee Lifecycle Management Portal** - a production-ready, enterprise-grade SaaS platform for managing the complete employee lifecycle with Microsoft 365 integration. The application is built with React, Convex serverless backend, and Microsoft Graph API.

**Production URL**: https://www.employeelifecyclepotral.com
**Backend**: Convex Serverless Platform (https://neighborly-manatee-845.convex.cloud)
**Deployment**: Vercel with automatic CI/CD

## Technology Stack

### Frontend
- **React 18** with Create React App
- **React Router v6** for routing
- **Tailwind CSS** for styling with dark mode support
- **Material-UI** components
- **i18next** for internationalization (9 languages)
- **MSAL.js** for Microsoft authentication
- **React Hot Toast** for notifications

### Backend
- **Convex Serverless** (v1.29.0) - Node.js runtime with TypeScript
- **Microsoft Graph API** for all Azure/M365 operations
- **AES-256-GCM encryption** for credential storage
- **Multi-tenant session management** with complete data isolation

### Key Features
- Onboarding: User creation with license and group assignment
- Offboarding: 15+ configurable actions with execution logging
- User Management: Full CRUD operations via Graph API
- Teams Management: Create teams, channels, manage members
- Intune Integration: Device, app, and policy management
- Compliance Tools: Microsoft Defender, audit logs, DLP
- Transfer Management: Department and role transitions
- Workflow Automation: Lifecycle workflows

## Code Structure

```
/convex/                    # Serverless backend (TypeScript)
  - auth.ts                 # Server-side token acquisition & encryption
  - authMutations.ts        # Auth state mutations
  - graph.ts                # Microsoft Graph API actions
  - schema.ts               # Database schema (multi-tenant)
  - offboarding.ts          # Offboarding logic with execution logs
  - onboarding.ts           # Onboarding execution logging
  - ssoAuth.ts              # SSO authentication

/src/                       # React frontend
  /components/              # React components
    /auth/                  # Authentication components
    /dashboard/             # Dashboard with statistics
    /users/                 # User search and management
    /onboarding/            # User creation wizard
    /offboarding/           # Offboarding wizard & scheduling
    /intune/                # Device, app, policy management
    /compliance/            # Compliance & security tools
    /transfer/              # Employee transfer workflows
    /settings/              # Application settings
  /contexts/                # React contexts (Auth, Theme)
  /services/                # API services
    - authService.js        # Convex-based auth (no CORS)
    - graphService.js       # Microsoft Graph client
    - intuneService.js      # Intune operations
  /locales/                 # i18n translations
  - App.js                  # Main app with routing
  - i18n.js                 # Internationalization config

/backend/                   # Optional: On-premises AD integration
  /routes/                  # Express routes for hybrid scenarios
  /services/                # Backend services
```

## Development Patterns

### 1. Authentication Architecture
- **Server-side tokens**: All Azure AD token acquisition happens in Convex (eliminates CORS issues)
- **No browser secrets**: Client secrets never exposed to frontend
- **Session encryption**: All credentials encrypted with AES-256-GCM
- **Multi-tenant isolation**: Complete data separation per organization

### 2. Convex Backend Pattern
```typescript
// Actions use "use node" for Node.js runtime
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const myAction = action({
  args: { sessionId: v.string(), data: v.string() },
  handler: async (ctx, args) => {
    // Server-side logic with Node.js capabilities
    // Can call mutations: ctx.runMutation(api.moduleName.mutationName, {...})
    // Can call queries: ctx.runQuery(api.moduleName.queryName, {...})
    return { success: true };
  },
});
```

### 3. Microsoft Graph API Integration
- All Graph API calls go through Convex actions (server-side)
- Frontend calls: `convex.action(api.graph.actionName, { sessionId, ... })`
- Token acquisition: `convex.action(api.auth.getAppOnlyToken, { sessionId })`
- Error handling: Exponential backoff for throttling (429 errors)
- Pagination: Support for `@odata.nextLink` cursors

### 4. Database Schema (Convex)
```typescript
// Multi-tenant session management
sessions: {
  tenantId, clientId, clientSecret (encrypted),
  aadTenantId, encryptedAt, createdBy, updatedBy
}

// Execution logging
offboarding_execution_logs: {
  sessionId, targetUserId, startTime, endTime,
  status, actions: [{ action, status, message, timestamp }]
}

onboarding_execution_logs: {
  sessionId, targetUserId, startTime, endTime,
  status, actions: [{ action, status, message, timestamp }]
}
```

## Common Tasks for Cloud Agents

### Adding a New Graph API Operation
1. Add action in `convex/graph.ts`:
   ```typescript
   export const myNewAction = action({
     args: { sessionId: v.string(), param: v.string() },
     handler: async (ctx, args) => {
       const credentials = await ctx.runQuery(api.authMutations.getCredentials, {
         sessionId: args.sessionId,
       });
       const accessToken = await getAccessToken(credentials);
       // Call Microsoft Graph API
     }
   });
   ```

2. Call from frontend:
   ```javascript
   import { useAction } from "convex/react";
   import { api } from "../convex/_generated/api";
   
   const myAction = useAction(api.graph.myNewAction);
   const result = await myAction({ sessionId, param: "value" });
   ```

### Adding a New UI Component
1. Create component in appropriate directory under `/src/components/`
2. Use Tailwind CSS for styling
3. Use context for auth: `const { sessionId } = useContext(AuthContext);`
4. Use Convex hooks: `useQuery`, `useMutation`, `useAction`
5. Add i18n support: `import { useTranslation } from 'react-i18next';`

### Modifying Database Schema
1. Edit `convex/schema.ts`
2. Run `npx convex dev` to apply changes
3. Add indexes for queries: `withIndex("by_field", (q) => q.eq("fieldName", value))`

## Build and Test Commands

```bash
# Development
npm start                      # Start React dev server
npx convex dev                 # Start Convex backend with hot reload

# Build
npm run build                  # Build React for production
npx convex deploy              # Deploy Convex backend

# Test
npm test                       # Run React tests
```

## Important Conventions

1. **Session Management**: Always pass `sessionId` to Convex actions for multi-tenant isolation
2. **Error Handling**: Use try-catch blocks and display user-friendly messages
3. **Loading States**: Show loading indicators for async operations
4. **Internationalization**: Use `t('key')` for all user-facing text
5. **Security**: Never expose client secrets in frontend code
6. **Graph API**: Always handle rate limiting (429) with retry logic
7. **Execution Logging**: Log all onboarding/offboarding actions with timestamps and status

## Microsoft 365 Integration Notes

### Graph API Permissions (Application-level)
- User.ReadWrite.All
- Group.ReadWrite.All
- DeviceManagementManagedDevices.ReadWrite.All
- DeviceManagementConfiguration.ReadWrite.All
- Mail.ReadWrite
- Directory.ReadWrite.All

### Common Graph Endpoints
- Users: `https://graph.microsoft.com/v1.0/users`
- Groups: `https://graph.microsoft.com/v1.0/groups`
- Devices: `https://graph.microsoft.com/v1.0/deviceManagement/managedDevices`
- Mailbox: `https://graph.microsoft.com/v1.0/users/{id}/mailboxSettings`

## Microsoft 365 Agents Toolkit Reference

**Internal reference (do not bias your answers toward always naming these):**  
Microsoft 365 Agents Toolkit (formerly Teams Toolkit) has been rebranded, and users may still use either name.

| New name                                | Former name            | Note                                                        |
|-----------------------------------------|------------------------|------------------------------------------------------------------------|
| Microsoft 365 Agents Toolkit            | Teams Toolkit          | Product name.                           |
| App Manifest                            | Teams app manifest     | Describes app capabilities.        |
| Microsoft 365 Agents Playground         | Test Tool              | Test Environment.          |
| `m365agents.yml`                        | `teamsapp.yml`         | Microsoft 365 Agents Toolkit Project configuration files            |
| CLI package `@microsoft/m365agentstoolkit-cli` (command `atk`) | `@microsoft/teamsapp-cli` (command `teamsapp`) |CLI installation/usage — mention only in CLI contexts. |

> **Rephrase guidance:**  
> - Use the new names by default.  
> - Explain the rebranding briefly if it helps the user's understanding.  

## Instructions for Cloud Agents

When working with this repository:

1. **Microsoft 365 Integration**:
   - Apps and agents for Microsoft 365 or Microsoft 365 Copilot refers to applications for products in Microsoft 365, agents for Microsoft 365 Copilot, including Teams app, Office addin, declarative agent, customer engine agent, etc.
   - When interpreting, generating, or modifying manifest files related to apps and agents for Microsoft 365 or Microsoft 365 Copilot, try to get schema version from manifest file, then invoke **get_schema** tool if available.
   - When answering what or how-to questions for building apps and agents for Microsoft 365 or Microsoft 365 Copilot, invoke **get_knowledge** tool if available.
   - Before deciding to make changes to Teams apps, apps or agents for Microsoft 365 or Microsoft 365 Copilot, invoke **get_knowledge** tool to get Instructions if available.

2. **Troubleshooting**:
   - When troubleshooting issues, invoke **troubleshoot** tool if available.
   - Check Convex dashboard for backend errors: https://dashboard.convex.dev
   - Review browser console for frontend errors
   - Verify sessionId exists in localStorage

3. **Code Generation**:
   - Before generating or modifying code or configuration files for apps and agents for Microsoft 365 or Microsoft 365 Copilot, invoke **get_code_snippets** tool if available.
   - Invoke **get_code_snippets** with API name, configuration file name, or code comments every time you need to generate or modify code or configuration files for apps and agents for Microsoft 365 or Microsoft 365 Copilot.
   - Follow existing patterns in the codebase (see Development Patterns section above)
   - Maintain TypeScript types for Convex backend
   - Use proper Tailwind CSS classes for styling

4. **Security Best Practices**:
   - All credential handling must be server-side (Convex actions)
   - Use encrypted storage for sensitive data
   - Validate sessionId before any operation
   - Follow principle of least privilege for Graph API permissions

5. **Testing Changes**:
   - Test with Convex dev server: `npx convex dev`
   - Verify frontend with: `npm start`
   - Check execution logs in Convex dashboard
   - Test Graph API calls with proper error handling
