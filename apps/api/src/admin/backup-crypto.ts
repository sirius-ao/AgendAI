import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Transform, type TransformCallback } from 'node:stream';

const MAGIC = Buffer.from('AGBK0001');
const CHUNK_BYTES = 1024 * 1024;

function encryptionKey() {
  const raw = process.env.ADMIN_BACKUP_ENCRYPTION_KEY || '';
  if (!/^[a-f\d]{64}$/i.test(raw))
    throw new Error('ADMIN_BACKUP_ENCRYPTION_KEY must be 64 hexadecimal characters');
  return Buffer.from(raw, 'hex');
}

export class BackupEncryptTransform extends Transform {
  private readonly key = encryptionKey();
  private readonly noncePrefix = randomBytes(8);
  private pending: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  private sequence = 0;

  constructor() {
    super();
    this.push(Buffer.concat([MAGIC, this.noncePrefix]));
  }

  private encryptChunk(plain: Buffer) {
    const nonce = Buffer.alloc(12);
    this.noncePrefix.copy(nonce);
    nonce.writeUInt32BE(this.sequence, 8);
    const aad = Buffer.alloc(8);
    aad.writeUInt32BE(this.sequence, 0);
    aad.writeUInt32BE(plain.length, 4);
    const cipher = createCipheriv('aes-256-gcm', this.key, nonce);
    cipher.setAAD(aad);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    const frame = Buffer.alloc(4);
    frame.writeUInt32BE(encrypted.length);
    this.sequence += 1;
    this.push(Buffer.concat([frame, encrypted, cipher.getAuthTag()]));
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
    try {
      const data = this.pending.length ? Buffer.concat([this.pending, chunk]) : chunk;
      let offset = 0;
      while (data.length - offset >= CHUNK_BYTES) {
        this.encryptChunk(data.subarray(offset, offset + CHUNK_BYTES));
        offset += CHUNK_BYTES;
      }
      this.pending = data.subarray(offset);
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }

  override _flush(callback: TransformCallback) {
    try {
      if (this.pending.length) this.encryptChunk(this.pending);
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }
}

export class BackupDecryptTransform extends Transform {
  private readonly key = encryptionKey();
  private pending: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  private noncePrefix: Buffer<ArrayBufferLike> | null = null;
  private sequence = 0;
  private chunkCount = 0;

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
    try {
      this.pending = this.pending.length ? Buffer.concat([this.pending, chunk]) : chunk;
      if (!this.noncePrefix) {
        if (this.pending.length < 16) return callback();
        if (!this.pending.subarray(0, 8).equals(MAGIC)) throw new Error('Invalid backup format');
        this.noncePrefix = this.pending.subarray(8, 16);
        this.pending = this.pending.subarray(16);
      }
      while (this.pending.length >= 4) {
        const size = this.pending.readUInt32BE(0);
        if (size < 1 || size > CHUNK_BYTES) throw new Error('Invalid backup chunk length');
        const frameSize = 4 + size + 16;
        if (this.pending.length < frameSize) break;
        const nonce = Buffer.alloc(12);
        this.noncePrefix.copy(nonce);
        nonce.writeUInt32BE(this.sequence, 8);
        const aad = Buffer.alloc(8);
        aad.writeUInt32BE(this.sequence, 0);
        aad.writeUInt32BE(size, 4);
        const decipher = createDecipheriv('aes-256-gcm', this.key, nonce);
        decipher.setAAD(aad);
        decipher.setAuthTag(this.pending.subarray(4 + size, frameSize));
        const plain = Buffer.concat([
          decipher.update(this.pending.subarray(4, 4 + size)),
          decipher.final(),
        ]);
        this.push(plain);
        this.pending = this.pending.subarray(frameSize);
        this.sequence += 1;
        this.chunkCount += 1;
      }
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }

  override _flush(callback: TransformCallback) {
    if (!this.noncePrefix || this.pending.length || this.chunkCount === 0) {
      callback(new Error('Backup authentication failed or file is incomplete'));
      return;
    }
    callback();
  }
}
