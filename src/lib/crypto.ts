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

// Short paste codes: a single ~58-bit random code from which both the storage
// id and the AES key are derived via PBKDF2. The server only ever sees the
// derived id, so knowing the database contents doesn't reveal codes or keys —
// recovering a code from an id would cost ~2^58 × 210k hashes.
const CODE_ALPHABET =
  "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/l/I lookalikes
export const CODE_LENGTH = 10;
export const CODE_PATTERN = /^[a-zA-Z0-9]{10}$/;

/** Generate a short, typeable paste code (unbiased rejection sampling). */
export function generateCode(): string {
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let code = "";
  while (code.length < CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH * 2));
    for (const b of bytes) {
      if (b < limit && code.length < CODE_LENGTH) {
        code += CODE_ALPHABET[b % CODE_ALPHABET.length];
      }
    }
  }
  return code;
}

/** Extract a code from user input — accepts a bare code or a full share URL. */
export function normalizeCode(input: string): string {
  const trimmed = input.trim();
  const hashIndex = trimmed.lastIndexOf("#");
  return (hashIndex >= 0 ? trimmed.slice(hashIndex + 1) : trimmed).trim();
}

/**
 * Derive the storage id and AES-256-GCM key from a paste code.
 * The id is what the client sends to / looks up on the server; the key never
 * leaves the browser.
 */
export async function deriveFromCode(
  code: string
): Promise<{ id: string; key: CryptoKey }> {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(code),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode("pastebin.code.v1"),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    (16 + 32) * 8
  );
  const bytes = new Uint8Array(bits);
  const id = bufToB64url(bytes.subarray(0, 16));
  const key = await crypto.subtle.importKey(
    "raw",
    bytes.subarray(16) as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return { id, key };
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
