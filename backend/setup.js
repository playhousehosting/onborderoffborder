#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   Employee Offboarding Portal - Backend Setup             ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Check if .env already exists
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await question('.env file already exists. Overwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('\n📝 Generating secure configuration...\n');

  // Generate secrets
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  const encryptionKey = crypto.randomBytes(32).toString('hex');

  // Get user input
  const port = await question('Port (default: 5000): ') || '5000';
  const frontendUrl = await question('Frontend URL (default: http://localhost:3000): ') || 'http://localhost:3000';
  const nodeEnv = await question('Environment (development/production, default: development): ') || 'development';
  
  let redisUrl = '';
  if (nodeEnv === 'production') {
    const useRedis = await question('Use Redis for session storage? (y/n): ');
    if (useRedis.toLowerCase() === 'y') {
      redisUrl = await question('Redis URL (default: redis://localhost:6379): ') || 'redis://localhost:6379';
    }
  }

  // Create .env content
  const envContent = `# Environment Configuration
# Generated on ${new Date().toISOString()}

# Server Configuration
NODE_ENV=${nodeEnv}
PORT=${port}
FRONTEND_URL=${frontendUrl}

# Session Configuration
SESSION_SECRET=${sessionSecret}
SESSION_MAX_AGE=3600000

# Encryption Key (AES-256)
ENCRYPTION_KEY=${encryptionKey}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=${frontendUrl}

# Redis (Session Storage - Production)
${redisUrl ? `REDIS_URL=${redisUrl}` : '# REDIS_URL=redis://localhost:6379'}

# Logging
LOG_LEVEL=info

# Security (Production)
${nodeEnv === 'production' ? 'SECURE_COOKIES=true' : '# SECURE_COOKIES=true'}
${nodeEnv === 'production' ? 'COOKIE_SAME_SITE=strict' : '# COOKIE_SAME_SITE=lax'}
${nodeEnv === 'production' ? 'TRUST_PROXY=true' : '# TRUST_PROXY=false'}

# Azure AD Default Configuration (Optional)
# Users can override these at runtime
# AZURE_CLIENT_ID=
# AZURE_TENANT_ID=
# AZURE_REDIRECT_URI=${frontendUrl}
`;

  // Write .env file
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Configuration file created successfully!');
  console.log('\n📋 Summary:');
  console.log(`   Environment: ${nodeEnv}`);
  console.log(`   Port: ${port}`);
  console.log(`   Frontend URL: ${frontendUrl}`);
  console.log(`   Session Secret: Generated (64 chars)`);
  console.log(`   Encryption Key: Generated (64 chars)`);
  if (redisUrl) {
    console.log(`   Redis: ${redisUrl}`);
  }

  console.log('\n🔒 IMPORTANT:');
  console.log('   - Never commit the .env file to git');
  console.log('   - Keep your SESSION_SECRET and ENCRYPTION_KEY secure');
  console.log('   - In production, use Azure Key Vault or similar');
  
  console.log('\n🚀 Next steps:');
  console.log('   1. Install dependencies: npm install');
  console.log('   2. Start the server:');
  console.log(`      Development: npm run dev`);
  console.log(`      Production:  npm start`);
  console.log('   3. Test the health endpoint: curl http://localhost:' + port + '/health');

  rl.close();
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
