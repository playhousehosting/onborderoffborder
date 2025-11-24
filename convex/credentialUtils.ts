"use node";

/**
 * Credential Encryption Utilities
 * 
 * Following Microsoft Best Practices for Secrets Management:
 * - https://learn.microsoft.com/en-us/azure/key-vault/secrets/secrets-best-practices
 * - https://learn.microsoft.com/en-us/entra/identity-platform/security-best-practices-for-app-registration
 * 
 * Production Recommendations:
 * 1. Use Azure Key Vault for storing ENCRYPTION_KEY
 * 2. Rotate encryption key every 60 days
 * 3. Use managed identities where possible
 * 4. Enable audit logging for credential access
 * 
 * Current implementation uses AES-256-CBC encryption which meets
 * Microsoft's recommendation for "strong encryption algorithms"
 */

import crypto from "crypto";

// Production: Store this in Azure Key Vault, not environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-dev-key-change-in-production";
const ALGORITHM = "aes-256-cbc";

function buildKey() {
  return Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, "0"));
}

export function encryptCredentials(credentials: any): string {
  const key = buildKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(JSON.stringify(credentials), "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

export function decryptCredentials(encryptedData: string): any {
  const key = buildKey();
  const [ivHex, encryptedHex] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted);
}
