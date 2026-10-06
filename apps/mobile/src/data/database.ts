import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const DATABASE_KEY = 'agendaki.mobile.database-key';

export async function initializeDatabase(db: SQLiteDatabase) {
  let key = await SecureStore.getItemAsync(DATABASE_KEY);
  if (!key) {
    const random = await Crypto.getRandomBytesAsync(32);
    key = Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(DATABASE_KEY, key);
  }
  await db.execAsync(`PRAGMA key = '${key}';`);
  await migrateDatabase(db);
}

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS dashboard_cache_v2 (
      account_id TEXT NOT NULL,
      school_id TEXT NOT NULL,
      snapshot TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(account_id, school_id)
    );
    CREATE TABLE IF NOT EXISTS sync_queue_v2 (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL,
      school_id TEXT NOT NULL,
      collection TEXT NOT NULL,
      record_id TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(account_id, school_id, collection, record_id)
    );
  `);
}
