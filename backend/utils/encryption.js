const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Get encryption key from environment
 * In production, this should come from Azure Key Vault
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Derive a key from the encryption key and salt
 */
function getKey(salt) {
  return crypto.pbkdf2Sync(getEncryptionKey(), salt, 100000, 32, 'sha512');
}

/**
 * Encrypt sensitive data
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text in base64
 */
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = getKey(salt);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(String(text), 'utf8'),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    // Combine salt + iv + tag + encrypted data
    const combined = Buffer.concat([salt, iv, tag, encrypted]);
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text in base64
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedText) {
  try {
    const data = Buffer.from(encryptedText, 'base64');
    
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, TAG_POSITION);
    const tag = data.subarray(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = data.subarray(ENCRYPTED_POSITION);
    
    const key = getKey(salt);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = decipher.update(encrypted) + decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data (one-way, for comparison only)
 * @param {string} text - Text to hash
 * @returns {string} - Hashed text in hex
 */
function hash(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

/**
 * Generate a secure random string
 * @param {number} length - Length of the string
 * @returns {string} - Random string
 */
function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Encrypt Azure AD credentials for session storage
 * @param {Object} credentials - Azure AD credentials
 * @returns {Object} - Encrypted credentials
 */
function encryptCredentials(credentials) {
  return {
    clientId: credentials.clientId, // Client ID is not secret, no need to encrypt
    tenantId: credentials.tenantId, // Tenant ID is not secret
    clientSecret: credentials.clientSecret ? encrypt(credentials.clientSecret) : null,
    encrypted: true
  };
}

/**
 * Decrypt Azure AD credentials from session storage
 * @param {Object} encryptedCredentials - Encrypted credentials
 * @returns {Object} - Decrypted credentials
 */
function decryptCredentials(encryptedCredentials) {
  if (!encryptedCredentials.encrypted) {
    return encryptedCredentials;
  }
  
  return {
    clientId: encryptedCredentials.clientId,
    tenantId: encryptedCredentials.tenantId,
    clientSecret: encryptedCredentials.clientSecret ? decrypt(encryptedCredentials.clientSecret) : null
  };
}

module.exports = {
  encrypt,
  decrypt,
  hash,
  generateRandomString,
  encryptCredentials,
  decryptCredentials
};
