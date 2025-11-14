import { convexAuth } from "@convex-dev/auth/server";
import AzureAD from "@auth/core/providers/azure-ad";

// Configure authentication with Microsoft 365 SSO (Multi-tenant)
// Azure AD provider will use AUTH_AZURE_AD_* environment variables
export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    AzureAD({
      tenantId: process.env.AUTH_AZURE_AD_TENANT_ID,
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
