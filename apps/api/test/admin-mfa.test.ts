import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTotpSecret,
  decryptTotpSecret,
  encryptTotpSecret,
  isAdminMfaRequired,
  totpCode,
  verifyTotpCode,
} from '../src/admin/admin-mfa.js';

test('TOTP follows the RFC 6238 SHA-1 six-digit vector', () => {
  assert.equal(totpCode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59_000), '287082');
  assert.equal(verifyTotpCode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '287082', 59_000), true);
  assert.equal(verifyTotpCode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '000000', 59_000), false);
});

test('global MFA requirement defaults to on and follows the environment switch', () => {
  const previous = process.env.ADMIN_MFA_REQUIRED;
  try {
    delete process.env.ADMIN_MFA_REQUIRED;
    assert.equal(isAdminMfaRequired(), true);
    process.env.ADMIN_MFA_REQUIRED = 'false';
    assert.equal(isAdminMfaRequired(), false);
    process.env.ADMIN_MFA_REQUIRED = 'true';
    assert.equal(isAdminMfaRequired(), true);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_MFA_REQUIRED;
    else process.env.ADMIN_MFA_REQUIRED = previous;
  }
});

test('admin TOTP secrets encrypt and decrypt with the configured key', () => {
  const previous = process.env.ADMIN_MFA_ENCRYPTION_KEY;
  process.env.ADMIN_MFA_ENCRYPTION_KEY = 'a'.repeat(64);
  try {
    const secret = createTotpSecret();
    assert.equal(decryptTotpSecret(encryptTotpSecret(secret)), secret);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_MFA_ENCRYPTION_KEY;
    else process.env.ADMIN_MFA_ENCRYPTION_KEY = previous;
  }
});
