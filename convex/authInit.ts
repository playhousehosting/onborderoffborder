import { convexAuth } from "@convex-dev/auth/server";
import AzureAD from "@auth/core/providers/azure-ad";

// Configure authentication with Microsoft 365 SSO (Multi-tenant)
export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    AzureAD({
      clientId: process.env.AUTH_AZURE_AD_ID,
      clientSecret: process.env.AUTH_AZURE_AD_SECRET,
      tenantId: "common", // Multi-tenant support
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),
  ],
});
