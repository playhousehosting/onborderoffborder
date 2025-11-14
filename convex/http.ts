import { httpRouter } from "convex/server";
import { auth } from "./authInit";
import { initiateAdminConsent, handleAdminConsentCallback } from "./adminConsent";

const http = httpRouter();

// Add Convex Auth HTTP routes for OAuth flow
auth.addHttpRoutes(http);

// Admin consent endpoints for multi-tenant applications
http.route({
  path: "/admin-consent",
  method: "GET",
  handler: initiateAdminConsent,
});

http.route({
  path: "/admin-consent-callback",
  method: "GET",
  handler: handleAdminConsentCallback,
});

export default http;
