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
        },
      },
      token: {
        url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        // Token validation - ensure tokens are from Microsoft
        async conform(response) {
          const body = await response.json();
          
          // Validate issuer is from Microsoft
          if (body.id_token) {
            const [, payload] = body.id_token.split('.');
            // Use atob for base64 decoding (works in all JS runtimes)
            const decoded = JSON.parse(atob(payload));
            
            // Verify issuer is from login.microsoftonline.com
            if (!decoded.iss || !decoded.iss.includes('login.microsoftonline.com')) {
              throw new Error('Invalid token issuer - must be from login.microsoftonline.com');
            }
            
            // Store tenant ID for multi-tenant isolation
            body.tenant_id = decoded.tid;
          }
          
          return Response.json(body);
        },
      },
      userinfo: `https://graph.microsoft.com/oidc/userinfo`,
      checks: ["pkce", "state"],
      profile(profile) {
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
