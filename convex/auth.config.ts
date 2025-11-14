// Traditional Convex Auth Configuration
// This file specifies the domain and application ID for OIDC-based authentication
export default {
  providers: [
    {
      domain:
        process.env.AUTH_AZURE_AD_ISSUER ||
        "https://login.microsoftonline.com/organizations/v2.0",
      applicationID: process.env.AUTH_AZURE_AD_ID || "",
    },
  ],
};
