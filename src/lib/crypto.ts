/**
 * Client-side (zero-knowledge) encryption helpers.
 *
 * Pastes are encrypted with AES-256-GCM in the browser before upload, so the
 * server only ever stores ciphertext. The key either travels in the URL
 * fragment (never sent to the server) or is derived from a user password via
 * PBKDF2, in which case a random salt is stored alongside the ciphertext.
 */

const PBKDF2_ITERATIONS = 210_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bufToB64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBuf(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Generate a random AES-256-GCM key and its portable base64url form. */
export async function generateKey(): Promise<{ key: CryptoKey; exported: string }> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const raw = await crypto.subtle.exportKey("raw", key);
  return { key, exported: bufToB64url(raw) };
}

/** Import a key previously exported with generateKey(). */
export async function importKey(exported: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    b64urlToBuf(exported) as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export function generateSalt(): string {
  return bufToB64url(crypto.getRandomValues(new Uint8Array(16)));
}

/** Derive an AES-256-GCM key from a password and base64url salt. */
export async function deriveKey(password: string, saltB64url: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: b64urlToBuf(saltB64url) as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypt a string; returns a self-describing JSON payload string. */
export async function encryptString(plain: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encoder.encode(plain)
  );
  return JSON.stringify({ v: 1, iv: bufToB64url(iv), ct: bufToB64url(ct) });
}

/** Decrypt a payload produced by encryptString(). Throws on wrong key/password. */
export async function decryptString(payload: string, key: CryptoKey): Promise<string> {
  const { iv, ct } = JSON.parse(payload) as { iv: string; ct: string };
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64urlToBuf(iv) as BufferSource },
    key,
    b64urlToBuf(ct) as BufferSource
  );
  return decoder.decode(plain);
}
