import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { buffer as collect } from 'node:stream/consumers';
import { test } from 'node:test';
import { BackupDecryptTransform, BackupEncryptTransform } from '../src/admin/backup-crypto.js';

process.env.ADMIN_BACKUP_ENCRYPTION_KEY = '0123456789abcdef'.repeat(4);

test('backup encryption round-trips authenticated chunks', async () => {
  const original = Buffer.alloc(2 * 1024 * 1024 + 371, 0x61);
  const encrypted = await collect(Readable.from([original]).pipe(new BackupEncryptTransform()));
  const recovered = await collect(Readable.from([encrypted]).pipe(new BackupDecryptTransform()));
  assert.deepEqual(recovered, original);
  assert.notDeepEqual(encrypted.subarray(16), original.subarray(0, encrypted.length - 16));
});

test('backup decryption rejects modified authentication tags', async () => {
  const encrypted = await collect(
    Readable.from([Buffer.from('SQL backup')]).pipe(new BackupEncryptTransform()),
  );
  encrypted[encrypted.length - 1] ^= 0xff;
  await assert.rejects(collect(Readable.from([encrypted]).pipe(new BackupDecryptTransform())));
});
