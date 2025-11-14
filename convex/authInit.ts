import { convexAuth } from "@convex-dev/auth/server";
import AzureAD from "@auth/core/providers/azure-ad";

// Configure authentication with Microsoft 365 SSO
export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    AzureAD({
      clientId: process.env.AUTH_AZURE_AD_ID,
      clientSecret: process.env.AUTH_AZURE_AD_SECRET,
      tenantId: process.env.AUTH_AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: "openid profile email User.Read",
          prompt: "select_account",
        },
      },
    }),
  ],
});
