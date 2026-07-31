import * as Crypto from 'expo-crypto';
import type {
  KryptixSectionFlags,
  KryptixVaultFile,
  KryptixVaultPayload,
} from '../types/kryptixVault';
import {
  KRYPTIX_FORMAT_ID,
  KRYPTIX_FORMAT_VERSION,
} from '../types/kryptixVault';
import type { PasswordEntry } from '../types/vault';
import type { RecoveryPhraseEntry } from '../types/recovery';
import type { HardcodedPasswordEntry } from '../types/hardcoded';

const KDF_ITERATIONS = 12_000;

const fromHex = (hex: string): number[] => {
  const out: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    out.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
};

const toHex = (bytes: number[] | Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const textEncoder = (s: string): number[] =>
  Array.from(unescape(encodeURIComponent(s))).map((c) => c.charCodeAt(0));

const textDecoder = (bytes: number[]): string => {
  try {
    return decodeURIComponent(escape(String.fromCharCode(...bytes)));
  } catch {
    return String.fromCharCode(...bytes);
  }
};

async function sha256Hex(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

/** Stretch passphrase with salt for offline resistance */
async function deriveKeyHex(passphrase: string, saltHex: string, iterations: number): Promise<string> {
  let h = `${passphrase}|${saltHex}`;
  for (let i = 0; i < iterations; i++) {
    h = await sha256Hex(h);
  }
  return h;
}

// ---- AES-256-CBC (same tables as utils/encryption.ts, self-contained for the file format) ----

const SBOX = [
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
];
const INV_SBOX = new Array(256);
for (let i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;
const RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

function xtime(a: number): number {
  return (a & 0x80 ? (a << 1) ^ 0x11b : a << 1) & 0xff;
}
function multiply(a: number, b: number): number {
  let result = 0;
  let aa = a;
  let bb = b;
  for (let i = 0; i < 8; i++) {
    if (bb & 1) result ^= aa;
    aa = xtime(aa);
    bb >>= 1;
  }
  return result & 0xff;
}
function subWord(w: number[]): number[] {
  return w.map((b) => SBOX[b]);
}
function rotWord(w: number[]): number[] {
  return [w[1], w[2], w[3], w[0]];
}
function keyExpansion(key: number[]): number[][] {
  const Nk = 8;
  const Nr = 14;
  const Nb = 4;
  const w: number[][] = [];
  for (let i = 0; i < Nk; i++) w[i] = key.slice(i * 4, i * 4 + 4);
  for (let i = Nk; i < Nb * (Nr + 1); i++) {
    let temp = [...w[i - 1]];
    if (i % Nk === 0) {
      temp = subWord(rotWord(temp));
      temp[0] ^= RCON[Math.floor(i / Nk)];
    } else if (i % Nk === 4) {
      temp = subWord(temp);
    }
    w[i] = w[i - Nk].map((b, j) => b ^ temp[j]);
  }
  return w;
}
function addRoundKey(state: number[], roundKey: number[][]): void {
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) state[r + 4 * c] ^= roundKey[c][r];
  }
}
function subBytes(state: number[]): void {
  for (let i = 0; i < 16; i++) state[i] = SBOX[state[i]];
}
function invSubBytes(state: number[]): void {
  for (let i = 0; i < 16; i++) state[i] = INV_SBOX[state[i]];
}
function shiftRows(state: number[]): void {
  const t = [...state];
  state[1] = t[5]; state[5] = t[9]; state[9] = t[13]; state[13] = t[1];
  state[2] = t[10]; state[6] = t[14]; state[10] = t[2]; state[14] = t[6];
  state[3] = t[15]; state[7] = t[3]; state[11] = t[7]; state[15] = t[11];
}
function invShiftRows(state: number[]): void {
  const t = [...state];
  state[1] = t[13]; state[5] = t[1]; state[9] = t[5]; state[13] = t[9];
  state[2] = t[10]; state[6] = t[14]; state[10] = t[2]; state[14] = t[6];
  state[3] = t[7]; state[7] = t[11]; state[11] = t[15]; state[15] = t[3];
}
function mixColumns(state: number[]): void {
  for (let c = 0; c < 4; c++) {
    const i = 4 * c;
    const a0 = state[i], a1 = state[i + 1], a2 = state[i + 2], a3 = state[i + 3];
    state[i] = multiply(a0, 2) ^ multiply(a1, 3) ^ a2 ^ a3;
    state[i + 1] = a0 ^ multiply(a1, 2) ^ multiply(a2, 3) ^ a3;
    state[i + 2] = a0 ^ a1 ^ multiply(a2, 2) ^ multiply(a3, 3);
    state[i + 3] = multiply(a0, 3) ^ a1 ^ a2 ^ multiply(a3, 2);
  }
}
function invMixColumns(state: number[]): void {
  for (let c = 0; c < 4; c++) {
    const i = 4 * c;
    const a0 = state[i], a1 = state[i + 1], a2 = state[i + 2], a3 = state[i + 3];
    state[i] = multiply(a0, 14) ^ multiply(a1, 11) ^ multiply(a2, 13) ^ multiply(a3, 9);
    state[i + 1] = multiply(a0, 9) ^ multiply(a1, 14) ^ multiply(a2, 11) ^ multiply(a3, 13);
    state[i + 2] = multiply(a0, 13) ^ multiply(a1, 9) ^ multiply(a2, 14) ^ multiply(a3, 11);
    state[i + 3] = multiply(a0, 11) ^ multiply(a1, 13) ^ multiply(a2, 9) ^ multiply(a3, 14);
  }
}
function encryptBlock(input: number[], w: number[][]): number[] {
  const state = [...input];
  const Nr = 14;
  addRoundKey(state, w.slice(0, 4));
  for (let round = 1; round < Nr; round++) {
    subBytes(state); shiftRows(state); mixColumns(state);
    addRoundKey(state, w.slice(round * 4, round * 4 + 4));
  }
  subBytes(state); shiftRows(state);
  addRoundKey(state, w.slice(Nr * 4, Nr * 4 + 4));
  return state;
}
function decryptBlock(input: number[], w: number[][]): number[] {
  const state = [...input];
  const Nr = 14;
  addRoundKey(state, w.slice(Nr * 4, Nr * 4 + 4));
  for (let round = Nr - 1; round >= 1; round--) {
    invShiftRows(state); invSubBytes(state);
    addRoundKey(state, w.slice(round * 4, round * 4 + 4));
    invMixColumns(state);
  }
  invShiftRows(state); invSubBytes(state);
  addRoundKey(state, w.slice(0, 4));
  return state;
}
function pkcs7Pad(data: number[]): number[] {
  const pad = 16 - (data.length % 16);
  return [...data, ...Array(pad).fill(pad)];
}
function pkcs7Unpad(data: number[]): number[] {
  if (data.length === 0) return data;
  const pad = data[data.length - 1];
  if (pad < 1 || pad > 16) return data;
  return data.slice(0, data.length - pad);
}

async function aesEncryptCbc(plaintext: string, keyHex: string): Promise<{ ciphertext: string; iv: string }> {
  const key = fromHex(keyHex);
  const w = keyExpansion(key);
  const ivArr = await Crypto.getRandomBytesAsync(16);
  const iv = Array.from(ivArr);
  const data = pkcs7Pad(textEncoder(plaintext));
  const out: number[] = [];
  let prev = iv;
  for (let i = 0; i < data.length; i += 16) {
    const block = data.slice(i, i + 16).map((b, j) => b ^ prev[j]);
    const enc = encryptBlock(block, w);
    out.push(...enc);
    prev = enc;
  }
  return { ciphertext: toHex(out), iv: toHex(iv) };
}

async function aesDecryptCbc(ciphertextHex: string, keyHex: string, ivHex: string): Promise<string> {
  const key = fromHex(keyHex);
  const w = keyExpansion(key);
  const iv = fromHex(ivHex);
  const data = fromHex(ciphertextHex);
  const out: number[] = [];
  let prev = iv;
  for (let i = 0; i < data.length; i += 16) {
    const block = data.slice(i, i + 16);
    const dec = decryptBlock(block, w);
    out.push(...dec.map((b, j) => b ^ prev[j]));
    prev = block;
  }
  return textDecoder(pkcs7Unpad(out));
}

async function computeMac(
  passphrase: string,
  salt: string,
  iv: string,
  ciphertext: string
): Promise<string> {
  return sha256Hex(`${passphrase}|${salt}|${iv}|${ciphertext}`);
}

export function buildPayload(
  sections: KryptixSectionFlags,
  passwords: PasswordEntry[],
  recovery: RecoveryPhraseEntry[],
  hardcoded: HardcodedPasswordEntry[]
): KryptixVaultPayload {
  return {
    format: 'KRYPTIX-VAULT-PAYLOAD',
    version: KRYPTIX_FORMAT_VERSION,
    exportedAt: Date.now(),
    appVersion: '1.0.0',
    passwords: sections.passwords ? passwords : [],
    recoveryPhrases: sections.recovery ? recovery : [],
    hardcoded: sections.hardcoded ? hardcoded : [],
  };
}

export async function encryptVaultFile(
  payload: KryptixVaultPayload,
  passphrase: string,
  sections: KryptixSectionFlags
): Promise<KryptixVaultFile> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Export passphrase must be at least 4 characters');
  }

  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const salt = toHex(Array.from(saltBytes));
  const keyHex = await deriveKeyHex(passphrase, salt, KDF_ITERATIONS);
  const plaintext = JSON.stringify(payload);
  const { ciphertext, iv } = await aesEncryptCbc(plaintext, keyHex);
  const mac = await computeMac(passphrase, salt, iv, ciphertext);

  return {
    format: KRYPTIX_FORMAT_ID,
    version: KRYPTIX_FORMAT_VERSION,
    createdAt: Date.now(),
    kdf: 'sha256-stretch',
    kdfIterations: KDF_ITERATIONS,
    cipher: 'aes-256-cbc',
    salt,
    iv,
    ciphertext,
    mac,
    meta: {
      includePasswords: sections.passwords,
      includeRecovery: sections.recovery,
      includeHardcoded: sections.hardcoded,
      counts: {
        passwords: payload.passwords.length,
        recovery: payload.recoveryPhrases.length,
        hardcoded: payload.hardcoded.length,
      },
    },
  };
}

export function parseVaultFileJson(content: string): KryptixVaultFile {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error('Not a valid .kryptix file (invalid JSON)');
  }
  const file = data as KryptixVaultFile;
  if (!file || file.format !== KRYPTIX_FORMAT_ID) {
    throw new Error('Not a Kryptix vault file');
  }
  if (file.version !== KRYPTIX_FORMAT_VERSION) {
    throw new Error(`Unsupported .kryptix version: ${file.version}`);
  }
  if (!file.salt || !file.iv || !file.ciphertext || !file.mac) {
    throw new Error('Incomplete .kryptix file');
  }
  return file;
}

export async function decryptVaultFile(
  file: KryptixVaultFile,
  passphrase: string
): Promise<KryptixVaultPayload> {
  if (!passphrase) throw new Error('Passphrase required');

  const expectedMac = await computeMac(passphrase, file.salt, file.iv, file.ciphertext);
  if (expectedMac !== file.mac) {
    throw new Error('Wrong passphrase or file was tampered with');
  }

  const iterations = file.kdfIterations || KDF_ITERATIONS;
  const keyHex = await deriveKeyHex(passphrase, file.salt, iterations);
  let plaintext: string;
  try {
    plaintext = await aesDecryptCbc(file.ciphertext, keyHex, file.iv);
  } catch {
    throw new Error('Decryption failed — wrong passphrase?');
  }

  let payload: KryptixVaultPayload;
  try {
    payload = JSON.parse(plaintext) as KryptixVaultPayload;
  } catch {
    throw new Error('Decrypted payload is invalid');
  }
  if (payload.format !== 'KRYPTIX-VAULT-PAYLOAD') {
    throw new Error('Invalid vault payload');
  }
  return {
    ...payload,
    passwords: Array.isArray(payload.passwords) ? payload.passwords : [],
    recoveryPhrases: Array.isArray(payload.recoveryPhrases) ? payload.recoveryPhrases : [],
    hardcoded: Array.isArray(payload.hardcoded) ? payload.hardcoded : [],
  };
}

export function isKryptixFileName(name: string): boolean {
  return name.toLowerCase().endsWith('.kryptix');
}
