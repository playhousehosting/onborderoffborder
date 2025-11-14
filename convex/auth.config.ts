import { convexAuth } from "@convex-dev/auth/server";
import AzureAD from "@auth/core/providers/azure-ad";

// Configure authentication with Microsoft 365 SSO (Multi-tenant)
export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    AzureAD({
      issuer: "https://login.microsoftonline.com/common/v2.0",
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
