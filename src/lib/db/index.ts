import Database from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";
import { SCHEMA_SQL } from "./schema";

let db: Database.Database | null = null;

function getDbPath(): string {
  const dataDir = path.join(os.homedir(), ".exeflow");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, "exeflow.db");
}

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();
  db = new Database(dbPath);

  // Configure for reliability
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  return db;
}

export function initializeDb(): void {
  const database = getDb();

  // Run integrity check on first open
  const integrity = database.pragma("integrity_check") as Array<{ integrity_check: string }>;
  if (integrity[0]?.integrity_check !== "ok") {
    const dbPath = getDbPath();
    const corruptPath = `${dbPath}.corrupt.${Date.now()}`;
    database.close();
    db = null;
    fs.renameSync(dbPath, corruptPath);
    console.error(`Database corrupt — backed up to ${corruptPath}, creating fresh database`);
    const freshDb = getDb();
    freshDb.exec(SCHEMA_SQL);
    return;
  }

  database.exec(SCHEMA_SQL);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function withTransaction<T>(fn: () => T): T {
  const database = getDb();
  const transaction = database.transaction(fn);
  return transaction();
}

export function withRetry<T>(fn: () => T, maxRetries = 3): T {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return fn();
    } catch (error) {
      lastError = error as Error;
      if (
        lastError.message?.includes("SQLITE_BUSY") &&
        attempt < maxRetries - 1
      ) {
        const delay = Math.min(100 * Math.pow(2, attempt), 2000);
        const jitter = delay * 0.25 * Math.random();
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay + jitter);
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}
