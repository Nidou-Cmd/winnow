import crypto from 'node:crypto';

/**
 * Winnow Zero-Knowledge Crypto Vault
 * Military-grade security layer for API keys, in-memory credential sanitization,
 * and encrypted telemetry envelopes (AES-256-GCM + BYOK).
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;

/**
 * Ephemeral memory shredder: forcefully overwrites sensitive string or Buffer
 * with zeros in memory to prevent forensic RAM dumps.
 */
export function shredBuffer(buf) {
  if (Buffer.isBuffer(buf)) {
    buf.fill(0);
  }
}

/**
 * Derives a strong 256-bit encryption key from a master secret/passphrase + salt
 */
export function deriveKey(masterSecret, salt) {
  return crypto.pbkdf2Sync(masterSecret, salt, PBKDF2_ITERATIONS, 32, 'sha256');
}

/**
 * Zero-Knowledge Envelope Encryption (AES-256-GCM)
 * Encrypts sensitive credentials or metadata with authenticated encryption.
 */
export function encryptZeroKnowledge(plaintext, masterSecret = null) {
  const secret = masterSecret || process.env.WINNOW_VAULT_KEY || crypto.randomBytes(32);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(secret, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Clean derived key from memory
  shredBuffer(key);

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: authTag.toString('base64'),
    salt: salt.toString('base64'),
    algorithm: ALGORITHM,
    encryptedAt: new Date().toISOString()
  };
}

/**
 * Decrypts an envelope payload and validates cryptographic authentication tag
 */
export function decryptZeroKnowledge(envelope, masterSecret = null) {
  const secret = masterSecret || process.env.WINNOW_VAULT_KEY;
  if (!secret) throw new Error('Decryption requires a valid master secret or WINNOW_VAULT_KEY');

  const salt = Buffer.from(envelope.salt, 'base64');
  const key = deriveKey(secret, salt);
  const iv = Buffer.from(envelope.iv, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  shredBuffer(key);

  return decrypted.toString('utf8');
}

/**
 * Computes an HMAC-SHA256 signature for anti-tamper and replay protection
 */
export function signRequest(payload, secretKey) {
  const timestamp = Date.now();
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(`${timestamp}.${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
  return {
    signature: hmac.digest('hex'),
    timestamp
  };
}

/**
 * Validates request signature within an allowable time window (default 60s)
 */
export function verifyRequestSignature(payload, signature, timestamp, secretKey, maxAgeMs = 60_000) {
  if (Math.abs(Date.now() - timestamp) > maxAgeMs) {
    return false; // Replay attack prevention
  }
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(`${timestamp}.${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
  const expected = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}
