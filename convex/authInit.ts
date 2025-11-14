import { convexAuth } from "@convex-dev/auth/server";
import AzureAD from "@auth/core/providers/azure-ad";

// Configure authentication with Microsoft 365 SSO
const tenantId = process.env.AUTH_AZURE_AD_TENANT_ID || "common";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    AzureAD({
      clientId: process.env.AUTH_AZURE_AD_ID,
      clientSecret: process.env.AUTH_AZURE_AD_SECRET,
      authorization: {
        url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        params: {
          scope: "openid profile email User.Read offline_access",
          // Add redirect_uri parameter for explicit control
          redirect_uri: process.env.CONVEX_SITE_URL ? `${process.env.CONVEX_SITE_URL}/api/auth/callback/azure-ad` : undefined,
        },
      },
      token: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      userinfo: `https://graph.microsoft.com/oidc/userinfo`,
      // Configure issuer for multi-tenant support
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
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
