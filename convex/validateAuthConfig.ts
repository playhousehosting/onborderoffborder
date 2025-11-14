/**
 * Convex Auth Configuration Validator
 * 
 * This file helps diagnose SSO configuration issues by validating
 * that all required environment variables are properly set.
 * 
 * Usage: This file is automatically checked when auth.config.ts loads
 */

export interface AuthConfigValidation {
  isValid: boolean;
  missingVariables: string[];
  warnings: string[];
}

/**
 * Validate that all required Convex Auth environment variables are set
 */
export function validateAuthConfig(): AuthConfigValidation {
  const requiredVars = [
    'AUTH_AZURE_AD_ID',
    'AUTH_AZURE_AD_SECRET',
    'AUTH_AZURE_AD_ISSUER',
  ];

  const missingVariables: string[] = [];
  const warnings: string[] = [];

  // Check for missing variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVariables.push(varName);
    }
  }

  // Validate AUTH_AZURE_AD_ISSUER format if provided
  if (process.env.AUTH_AZURE_AD_ISSUER) {
    const issuer = process.env.AUTH_AZURE_AD_ISSUER;
    
    if (!issuer.startsWith('https://login.microsoftonline.com/')) {
      warnings.push(
        `AUTH_AZURE_AD_ISSUER should start with 'https://login.microsoftonline.com/'. ` +
        `Current value: ${issuer}`
      );
    }
    
    if (!issuer.endsWith('/v2.0')) {
      warnings.push(
        `AUTH_AZURE_AD_ISSUER should end with '/v2.0'. ` +
        `Current value: ${issuer}`
      );
    }
  }

  // Validate AUTH_AZURE_AD_ID format if provided (should be a GUID)
  if (process.env.AUTH_AZURE_AD_ID) {
    const clientId = process.env.AUTH_AZURE_AD_ID;
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!guidPattern.test(clientId)) {
      warnings.push(
        `AUTH_AZURE_AD_ID doesn't match expected GUID format. ` +
        `Current value: ${clientId.substring(0, 10)}...`
      );
    }
  }

  return {
    isValid: missingVariables.length === 0 && warnings.length === 0,
    missingVariables,
    warnings,
  };
}

/**
 * Log validation results to console
 * This is called automatically during development to help diagnose issues
 */
export function logValidationResults() {
  const validation = validateAuthConfig();

  if (validation.isValid) {
    console.log('✅ Convex Auth configuration is valid');
    return;
  }

  if (validation.missingVariables.length > 0) {
    console.error(`
❌ CONVEX AUTH CONFIGURATION ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Missing required environment variables:
${validation.missingVariables.map(v => `  • ${v}`).join('\n')}

SSO login will fail until these are configured.

TO FIX:
1. Go to Convex Dashboard: https://dashboard.convex.dev
2. Select your project
3. Navigate to Settings → Environment Variables
4. Add the missing variables:
   
   AUTH_AZURE_AD_ID: Your Azure AD Application (Client) ID
   AUTH_AZURE_AD_SECRET: Your Azure AD Client Secret
   AUTH_AZURE_AD_ISSUER: https://login.microsoftonline.com/{TENANT_ID}/v2.0
   
5. Run: npx convex deploy

See CONVEX_SSO_CONFIGURATION.md for detailed setup instructions.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  }

  if (validation.warnings.length > 0) {
    console.warn(`
⚠️  CONVEX AUTH CONFIGURATION WARNINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${validation.warnings.map(w => `  • ${w}`).join('\n')}

These may cause authentication issues. Please verify your configuration.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  }
}

/**
 * Get a user-friendly error message for SSO failures
 */
export function getSSOErrorMessage(error: any): string {
  const validation = validateAuthConfig();
  
  if (validation.missingVariables.length > 0) {
    return (
      'SSO login failed because Convex Auth environment variables are not configured. ' +
      `Missing: ${validation.missingVariables.join(', ')}. ` +
      'Please see CONVEX_SSO_CONFIGURATION.md for setup instructions.'
    );
  }
  
  if (validation.warnings.length > 0) {
    return (
      'SSO login failed due to configuration issues. ' +
      'Please check Convex Dashboard logs and verify your environment variables. ' +
      'See SSO_TROUBLESHOOTING.md for help.'
    );
  }
  
  // Generic error message if configuration looks valid
  if (error?.message) {
    return `SSO login failed: ${error.message}. Check SSO_TROUBLESHOOTING.md for help.`;
  }
  
  return 'SSO login failed. Please check Convex Dashboard logs and see SSO_TROUBLESHOOTING.md for help.';
}
