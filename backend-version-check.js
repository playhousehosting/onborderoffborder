// Quick backend version check
// Paste this in your browser console to see which code is deployed

const config = JSON.parse(localStorage.getItem('azureConfig') || '{}');

fetch('https://onboardingoffboarding.dynamicendpoints.com/api/auth/app-only-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: config.clientId || 'test',
    clientSecret: config.clientSecret || 'test',
    tenantId: config.tenantId || 'test'
  })
})
.then(async (response) => {
  const version = response.headers.get('X-API-Version');
  const data = await response.json();

  console.log('═══════════════════════════════════════');
  console.log('🔍 BACKEND VERSION CHECK');
  console.log('═══════════════════════════════════════');
  console.log('API Version Header:', version || 'NOT FOUND (Old code!)');
  console.log('Response Status:', response.status);
  console.log('Response Data:', data);
  console.log('═══════════════════════════════════════');

  if (!version) {
    console.error('❌ BACKEND IS RUNNING OLD CODE!');
    console.error('   The enhanced error handling is not deployed yet.');
    console.error('   Please redeploy the backend from branch: claude/verify-msal-auth-011CUKCVDuySX2JZMKMApSes');
  } else {
    console.log('✅ Backend is running NEW code (v2.0)');

    if (data.error) {
      console.log('\n📋 ERROR DETAILS:');
      console.log('   Error:', data.error);
      console.log('   Details:', data.details || 'undefined');
      console.log('   Azure Error:', data.azureError || 'N/A');
      console.log('   Error Code:', data.errorCode || 'N/A');
    }
  }
})
.catch(err => console.error('Network error:', err));
