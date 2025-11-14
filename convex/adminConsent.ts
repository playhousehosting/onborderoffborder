import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Admin Consent Endpoint for Multi-Tenant Applications
 * 
 * This endpoint allows tenant administrators to grant organization-wide
 * consent to the application's permissions. This is a best practice for
 * multi-tenant SaaS applications.
 * 
 * Usage:
 * Direct tenant admins to: https://your-app.convex.site/admin-consent
 * 
 * They will be redirected to Microsoft's admin consent flow and then
 * back to your application with the consent result.
 */

export const initiateAdminConsent = httpAction(async (ctx, request) => {
  const clientId = process.env.AUTH_AZURE_AD_ID;
  const redirectUri = `${new URL(request.url).origin}/admin-consent-callback`;
  
  // Build admin consent URL
  const consentUrl = new URL('https://login.microsoftonline.com/organizations/v2.0/adminconsent');
  consentUrl.searchParams.set('client_id', clientId!);
  consentUrl.searchParams.set('redirect_uri', redirectUri);
  consentUrl.searchParams.set('state', crypto.randomUUID());
  consentUrl.searchParams.set('scope', 'openid profile email User.Read offline_access');
  
  // Redirect to Microsoft admin consent page
  return new Response(null, {
    status: 302,
    headers: {
      'Location': consentUrl.toString(),
    },
  });
});

export const handleAdminConsentCallback = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  
  if (error) {
    console.error('Admin consent error:', error, errorDescription);
    return new Response(
      `<html><body><h1>Admin Consent Failed</h1><p>Error: ${error}</p><p>${errorDescription}</p></body></html>`,
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }
  
  if (tenant) {
    // Log successful consent
    console.log('Admin consent granted for tenant:', tenant);
    
    // Store tenant consent information
    await ctx.runMutation(api.adminConsent.recordTenantConsent, {
      tenantId: tenant,
      consentedAt: Date.now(),
    });
    
    return new Response(
      `<html><body><h1>Admin Consent Successful</h1><p>Thank you! Your organization (${tenant}) has been successfully configured.</p><p>You can now close this window and return to the application.</p></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }
  
  return new Response('Invalid callback', { status: 400 });
});

// Export as mutation for the API reference
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const recordTenantConsent = mutation({
  args: {
    tenantId: v.string(),
    consentedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if consent already exists
    const existing = await ctx.db
      .query("tenantConsents")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (existing) {
      // Update existing consent
      await ctx.db.patch(existing._id, {
        adminConsentGranted: true,
        consentedAt: args.consentedAt,
        lastVerified: Date.now(),
      });
    } else {
      // Store new tenant consent in database for tracking
      await ctx.db.insert("tenantConsents", {
        tenantId: args.tenantId,
        consentedAt: args.consentedAt,
        adminConsentGranted: true,
        lastVerified: Date.now(),
      });
    }
  },
});
