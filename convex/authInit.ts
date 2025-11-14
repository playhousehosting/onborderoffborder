import { convexAuth } from "@convex-dev/auth/server";
import MicrosoftEntraID from "@auth/core/providers/microsoft-entra-id";

// Configure authentication with Microsoft 365 SSO
const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID || process.env.AUTH_AZURE_AD_TENANT_ID || "common";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_AZURE_AD_ID,
      clientSecret: process.env.AUTH_AZURE_AD_SECRET,
      authorization: {
        params: {
          scope: "openid profile email User.Read offline_access",
        },
      },
      checks: ["state"],
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
