import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./authInit";
import { initiateAdminConsent, handleAdminConsentCallback } from "./adminConsent";
import { health, graphGet, graphPost, graphPatch, graphDelete, graphOptions } from "./msalProxy";

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

// MSAL proxy endpoints for Graph API access
http.route({
  path: "/msal-proxy/health",
  method: "GET",
  handler: health,
});

// CORS preflight handler for /msal-proxy/graph/*
http.route({
  pathPrefix: "/msal-proxy/graph/",
  method: "OPTIONS",
  handler: graphOptions,
});

http.route({
  pathPrefix: "/msal-proxy/graph/",
  method: "GET",
  handler: graphGet,
});

http.route({
  pathPrefix: "/msal-proxy/graph/",
  method: "POST",
  handler: graphPost,
});

http.route({
  pathPrefix: "/msal-proxy/graph/",
  method: "PATCH",
  handler: graphPatch,
});

http.route({
  pathPrefix: "/msal-proxy/graph/",
  method: "DELETE",
  handler: graphDelete,
});

export default http;
