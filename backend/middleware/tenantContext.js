/**
 * Multi-Tenant Context Middleware
 * 
 * This middleware extracts tenant and session information from authenticated requests
 * and adds it to the request object for use throughout the application.
 * 
 * Tenant isolation ensures that data from different organizations/users is completely
 * separated at the database and API level.
 */

/**
 * Extract tenant context from authenticated session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function extractTenantContext(req, res, next) {
  // Only add tenant context if user is authenticated
  if (req.session && req.session.authenticated) {
    // Extract tenant information from session
    // In enterprise deployments, this would come from:
    // - Azure AD tenant claims (preferred)
    // - Organization ID from database
    // - Multi-org user mapping
    
    const user = req.session.user || {};
    const tenantId = user.tenantId || user.tid || user.id || 'default-tenant';
    const sessionId = req.session.id || req.sessionID || 'default-session';
    
    // Add tenant context to request
    req.tenantContext = {
      tenantId: tenantId,
      sessionId: sessionId,
      userId: user.id || user.oid || user.sub,
      userEmail: user.email || user.mail || user.upn || user.preferred_username,
      displayName: user.displayName || user.name,
      roles: user.roles || [],
      
      // Helper method to check if user has specific role
      hasRole: (role) => {
        return req.tenantContext.roles.includes(role);
      },
      
      // Helper method to check if user is admin
      isAdmin: () => {
        return req.tenantContext.hasRole('admin') || req.tenantContext.hasRole('Global Administrator');
      }
    };
    
    // Log tenant context for debugging (development only)
    if (process.env.NODE_ENV !== 'production' && process.env.LOG_TENANT_CONTEXT === 'true') {
      console.log('🏢 Tenant Context:', {
        tenantId: req.tenantContext.tenantId,
        sessionId: req.tenantContext.sessionId?.substring(0, 8) + '...',
        userId: req.tenantContext.userId,
        userEmail: req.tenantContext.userEmail,
        path: req.path
      });
    }
  }
  
  next();
}

/**
 * Require authentication and tenant context
 * Use this middleware on routes that require authentication
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.authenticated) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please authenticate to access this resource'
    });
  }
  
  // Ensure tenant context is set
  if (!req.tenantContext) {
    extractTenantContext(req, res, () => {});
  }
  
  if (!req.tenantContext) {
    return res.status(401).json({ 
      error: 'Invalid session',
      message: 'Session is missing required tenant information'
    });
  }
  
  next();
}

/**
 * Require admin role
 * Use this middleware on routes that require admin access
 */
function requireAdmin(req, res, next) {
  if (!req.tenantContext) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please authenticate to access this resource'
    });
  }
  
  if (!req.tenantContext.isAdmin()) {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Admin privileges required to access this resource'
    });
  }
  
  next();
}

/**
 * Validate tenant ownership of a resource
 * Use this helper in route handlers to verify resource ownership
 * 
 * @param {Object} resource - Resource object with tenantId property
 * @param {Object} tenantContext - Tenant context from request
 * @returns {boolean} - True if tenant owns the resource
 */
function validateTenantOwnership(resource, tenantContext) {
  if (!resource || !tenantContext) {
    return false;
  }
  
  // Check if resource belongs to the tenant
  if (resource.tenantId && resource.tenantId !== tenantContext.tenantId) {
    return false;
  }
  
  // Check if resource was created by this session (additional validation)
  if (resource.sessionId && resource.sessionId !== tenantContext.sessionId && 
      resource.createdBy !== tenantContext.sessionId) {
    return false;
  }
  
  return true;
}

/**
 * Get tenant context parameters for service calls
 * Use this helper to extract tenant params for passing to service methods
 * 
 * @param {Object} req - Express request object
 * @returns {Object} - Object with tenantId and sessionId
 */
function getTenantParams(req) {
  const context = req.tenantContext;
  
  if (!context) {
    throw new Error('Tenant context not available - ensure authentication middleware is applied');
  }
  
  return {
    tenantId: context.tenantId,
    sessionId: context.sessionId,
    userId: context.userId,
    userEmail: context.userEmail
  };
}

module.exports = {
  extractTenantContext,
  requireAuth,
  requireAdmin,
  validateTenantOwnership,
  getTenantParams
};
