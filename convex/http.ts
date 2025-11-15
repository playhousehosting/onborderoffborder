import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./authInit";
import { initiateAdminConsent, handleAdminConsentCallback } from "./adminConsent";
import { health, graphGet, graphPost } from "./clerkProxy";

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

// Clerk proxy endpoints for Graph API access
http.route({
  path: "/clerk-proxy/health",
  method: "GET",
  handler: health,
});

http.route({
  path: "/clerk-proxy/graph",
  method: "GET",
  handler: graphGet,
});

http.route({
  path: "/clerk-proxy/graph",
  method: "POST",
  handler: graphPost,
});

export default http;
