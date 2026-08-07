/**
 * Thin Web Crypto helpers used by encryption + kryptixFormat.
 * Works in modern browsers, Tauri webviews, and Node 18+.
 */

function toHex(bytes: Uint8Array | number[]): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

/** SHA-256 of a UTF-8 string → hex */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(hash));
}

/** SHA-256 of a UTF-8 string → number[] (for compatibility with pure-JS AES) */
export async function sha256Bytes(input: string): Promise<number[]> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash));
}

/** Cryptographically secure random bytes */
export function getRandomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf;
}

export { toHex, fromHex };
