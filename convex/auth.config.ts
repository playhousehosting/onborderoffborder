import { convexAuth } from "@convex-dev/auth/server";
import AzureAD from "@auth/core/providers/azure-ad";

// Configure authentication with Microsoft 365 SSO (Multi-tenant)
// Azure AD provider will use AUTH_AZURE_AD_* environment variables
// The issuer is set via AUTH_AZURE_AD_ISSUER which includes the tenant
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
