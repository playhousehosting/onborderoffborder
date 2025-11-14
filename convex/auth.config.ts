import { convexAuth } from "@convex-dev/auth/server";
import AzureAD from "@auth/core/providers/azure-ad";
import { logValidationResults } from "./validateAuthConfig";

/**
 * Convex Auth Configuration for Microsoft 365 SSO
 * 
 * REQUIRED ENVIRONMENT VARIABLES (set in Convex Dashboard):
 * - AUTH_AZURE_AD_ID: Your Azure AD Application (Client) ID
 * - AUTH_AZURE_AD_SECRET: Your Azure AD Client Secret
 * - AUTH_AZURE_AD_ISSUER: https://login.microsoftonline.com/{TENANT_ID}/v2.0
 * 
 * Setup Instructions:
 * 1. Set these environment variables in Convex Dashboard → Settings → Environment Variables
 * 2. Configure redirect URI in Azure AD: https://your-deployment.convex.site/api/auth/callback/azure-ad
 * 3. Add delegated permissions: openid, profile, email, User.Read
 * 4. Run: npx convex deploy
 * 
 * See CONVEX_SSO_CONFIGURATION.md for detailed setup instructions
 */

// Validate environment variables at startup
// This will log helpful error messages if configuration is missing
logValidationResults();

// Configure authentication with Microsoft 365 SSO (Multi-tenant)
// Azure AD provider will use AUTH_AZURE_AD_* environment variables
export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    AzureAD({
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),
  ],
});

// Required default export for Convex Auth
export default { providers: [] };
