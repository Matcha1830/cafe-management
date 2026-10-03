/**
 * token-crypto.ts
 * Server-only AES-256-CBC encryption for Google OAuth tokens.
 * Uses Node.js built-in `crypto` — no external crypto packages.
 *
 * Key is derived from AUTH_SECRET via SHA-256.
 * IV is randomly generated per encryption, prepended to ciphertext (hex:hex).
 */

import crypto from "crypto";

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set.");
  }
  // SHA-256 of the secret gives us a deterministic 32-byte key
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plain-text string.
 * Returns "<iv_hex>:<ciphertext_hex>" suitable for DB storage.
 */
export function encryptToken(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a string previously encrypted with `encryptToken`.
 * Expects the format "<iv_hex>:<ciphertext_hex>".
 */
export function decryptToken(encryptedValue: string): string {
  const key = deriveKey();
  const [ivHex, dataHex] = encryptedValue.split(":");
  if (!ivHex || !dataHex) {
    throw new Error("Invalid encrypted token format.");
  }
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
