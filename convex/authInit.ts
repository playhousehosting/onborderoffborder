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
        url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        params: {
          scope: "openid profile email User.Read offline_access",
        },
      },
      token: {
        url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        async conform(response) {
          const body = await response.json();
          
          // For multi-tenant apps, accept any Microsoft issuer
          // The issuer will be tenant-specific even when using "common"
          if (body.id_token) {
            const [, payload] = body.id_token.split('.');
            const decoded = JSON.parse(atob(payload));
            console.log('🔍 Token issuer:', decoded.iss);
            
            // Validate it's a Microsoft issuer
            if (!decoded.iss?.includes('login.microsoftonline.com')) {
              throw new Error('Invalid issuer - must be from Microsoft');
            }
            
            // Override issuer validation by setting expected issuer
            body.issuer = decoded.iss;
          }
          
          return Response.json(body);
        },
      },
      userinfo: `https://graph.microsoft.com/oidc/userinfo`,
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
