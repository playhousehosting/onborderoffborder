import { convexAuth } from "@convex-dev/auth/server";
import AzureAD from "@auth/core/providers/azure-ad";

// Configure authentication with Microsoft 365 SSO
const tenantId = process.env.AUTH_AZURE_AD_TENANT_ID || "common";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    AzureAD({
      clientId: process.env.AUTH_AZURE_AD_ID,
      clientSecret: process.env.AUTH_AZURE_AD_SECRET,
      // Use wellKnown for automatic discovery - handles multi-tenant issuer validation
      wellKnown: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
      authorization: {
        params: {
          scope: "openid profile email User.Read offline_access",
        },
      },
      checks: ["state"], // Use "state" only - PKCE causes "error in response body" with Microsoft
      profile(profile) {
        // Validate required profile data
        if (!profile.sub && !profile.oid) {
          throw new Error("Invalid profile data received from Microsoft Entra ID");
        }
        
        return {
          id: profile.sub || profile.oid,
          name: profile.name,
          email: profile.email || profile.preferred_username,
          // Store tenant context for data isolation
          tenantId: profile.tid,
        };
      },
    }),
  ],
});
