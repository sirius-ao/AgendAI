import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function isAdminMfaRequired() {
  return (process.env.ADMIN_MFA_REQUIRED || 'true').trim().toLowerCase() !== 'false';
}

const key = () => {
  const value = process.env.ADMIN_MFA_ENCRYPTION_KEY || '';
  if (!/^[a-f\d]{64}$/i.test(value))
    throw new Error('ADMIN_MFA_ENCRYPTION_KEY must be 64 hexadecimal characters');
  return Buffer.from(value, 'hex');
};

export function createTotpSecret() {
  const bytes = randomBytes(20);
  let bits = 0;
  let value = 0;
  let encoded = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      encoded += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  if (bits) encoded += alphabet[(value << (5 - bits)) & 31];
  return encoded;
}

function decodeBase32(value: string) {
  let bits = 0;
  let buffer = 0;
  const bytes: number[] = [];
  for (const char of value.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error('Invalid TOTP secret');
    buffer = (buffer << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
    buffer &= (1 << bits) - 1;
  }
  return Buffer.from(bytes);
}

export function encryptTotpSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptTotpSecret(value: string) {
  const [version, ivHex, tagHex, encryptedHex] = value.split(':');
  if (version !== 'v1' || !ivHex || !tagHex || !encryptedHex)
    throw new Error('Invalid encrypted TOTP secret');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

export function totpCode(secret: string, at = Date.now()) {
  const counter = Math.floor(at / 30_000);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 15;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, '0');
}

export function verifyTotpCode(secret: string, input: string, at = Date.now()) {
  if (!/^\d{6}$/.test(input)) return false;
  const candidate = Buffer.from(input);
  for (const skew of [-30_000, 0, 30_000]) {
    const expected = Buffer.from(totpCode(secret, at + skew));
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) return true;
  }
  return false;
}

export function totpUri(email: string, secret: string) {
  const label = encodeURIComponent(`AgendAKI:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=AgendAKI&algorithm=SHA1&digits=6&period=30`;
}
