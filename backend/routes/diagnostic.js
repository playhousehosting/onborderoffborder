const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * POST /api/diagnostic/test-azure-token
 * Test Azure AD token acquisition directly (for debugging)
 */
router.post('/test-azure-token', async (req, res) => {
  try {
    const { clientId, clientSecret, tenantId } = req.body;

    console.log('🔍 DIAGNOSTIC: Testing Azure AD token acquisition');
    console.log('  - Tenant ID:', tenantId);
    console.log('  - Client ID:', clientId);
    console.log('  - Client Secret length:', clientSecret?.length || 0);

    if (!clientId || !clientSecret || !tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        received: {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          hasTenantId: !!tenantId
        }
      });
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    console.log('🔍 DIAGNOSTIC: Token endpoint:', tokenEndpoint);

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');

    console.log('🔍 DIAGNOSTIC: Making request to Azure AD...');

    const response = await axios.post(tokenEndpoint, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('✅ DIAGNOSTIC: Token acquired successfully!');

    return res.json({
      success: true,
      message: 'Token acquired successfully!',
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in,
      hasAccessToken: !!response.data.access_token,
      accessTokenLength: response.data.access_token?.length || 0
    });

  } catch (error) {
    console.error('❌ DIAGNOSTIC: Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });

    // Return FULL error details regardless of environment
    return res.status(error.response?.status || 500).json({
      success: false,
      error: 'Token acquisition failed',
      errorMessage: error.message,
      azureError: error.response?.data?.error,
      azureErrorDescription: error.response?.data?.error_description,
      azureErrorCodes: error.response?.data?.error_codes,
      httpStatus: error.response?.status,
      fullAzureResponse: error.response?.data
    });
  }
});

module.exports = router;
