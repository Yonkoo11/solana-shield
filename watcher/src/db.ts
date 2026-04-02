import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { Alert, ProtocolState } from "./types";

const DB_PATH = path.join(__dirname, "..", "data", "shield.db");

let db: Database.Database;

export function initDb(): void {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      protocol TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      details TEXT NOT NULL,
      tx_signature TEXT,
      resolved INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS protocol_state (
      address TEXT PRIMARY KEY,
      last_known_balance INTEGER NOT NULL,
      last_known_authority TEXT NOT NULL,
      last_updated TEXT NOT NULL
    );
  `);
}

export function insertAlert(alert: Alert): number {
  const stmt = db.prepare(`
    INSERT INTO alerts (timestamp, protocol, type, severity, details, tx_signature, resolved)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    alert.timestamp,
    alert.protocol,
    alert.type,
    alert.severity,
    alert.details,
    alert.txSignature || null,
    alert.resolved ? 1 : 0
  );
  return result.lastInsertRowid as number;
}

export function getAlerts(limit: number = 50): Alert[] {
  const stmt = db.prepare(`
    SELECT id, timestamp, protocol, type, severity, details, tx_signature as txSignature, resolved
    FROM alerts
    ORDER BY id DESC
    LIMIT ?
  `);
  return stmt.all(limit) as Alert[];
}

export function getAlertCount24h(): number {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM alerts
    WHERE timestamp > datetime('now', '-24 hours')
  `);
  return (stmt.get() as { count: number }).count;
}

export function getProtocolState(address: string): ProtocolState | null {
  const stmt = db.prepare(`
    SELECT address, last_known_balance as lastKnownBalance,
           last_known_authority as lastKnownAuthority,
           last_updated as lastUpdated
    FROM protocol_state WHERE address = ?
  `);
  return (stmt.get(address) as ProtocolState) || null;
}

export function upsertProtocolState(state: ProtocolState): void {
  const stmt = db.prepare(`
    INSERT INTO protocol_state (address, last_known_balance, last_known_authority, last_updated)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(address) DO UPDATE SET
      last_known_balance = excluded.last_known_balance,
      last_known_authority = excluded.last_known_authority,
      last_updated = excluded.last_updated
  `);
  stmt.run(state.address, state.lastKnownBalance, state.lastKnownAuthority, state.lastUpdated);
}
