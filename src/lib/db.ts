import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "dough.db");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    console.info("[db] Opening database at", DB_PATH);
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initializeDb(_db);
  }
  return _db;
}

function initializeDb(db: Database.Database) {
  console.info("[db] Initializing schema");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'fi')),
      ynab_access_token TEXT,
      ynab_budget_id TEXT,
      last_ynab_sync TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recurring_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
      category TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS income_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      expected_day INTEGER NOT NULL CHECK (expected_day BETWEEN 1 AND 31),
      is_recurring INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      remaining_amount REAL NOT NULL,
      interest_rate REAL NOT NULL DEFAULT 0,
      minimum_payment REAL NOT NULL DEFAULT 0,
      due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ynab_id TEXT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      payee TEXT NOT NULL DEFAULT '',
      category TEXT DEFAULT '',
      memo TEXT DEFAULT '',
      is_recurring INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_ynab_id ON transactions(user_id, ynab_id) WHERE ynab_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS net_worth_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      checking REAL NOT NULL DEFAULT 0,
      savings REAL NOT NULL DEFAULT 0,
      investments REAL NOT NULL DEFAULT 0,
      debts REAL NOT NULL DEFAULT 0,
      net_worth REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_net_worth_user_date ON net_worth_snapshots(user_id, date);

    CREATE TABLE IF NOT EXISTS payee_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL CHECK (source_type IN ('income', 'bill')),
      source_id INTEGER NOT NULL,
      payee_pattern TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_payee_matches_source ON payee_matches(source_type, source_id);

    CREATE TABLE IF NOT EXISTS monthly_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL CHECK (source_type IN ('income', 'bill')),
      source_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      ynab_transaction_id TEXT NOT NULL,
      amount REAL NOT NULL,
      matched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_matches_unique ON monthly_matches(source_type, source_id, month, ynab_transaction_id);

    CREATE TABLE IF NOT EXISTS debt_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ynab_account_id TEXT UNIQUE NOT NULL,
      interest_rate REAL NOT NULL DEFAULT 0,
      minimum_payment REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS household_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migrate YNAB settings from users to household_settings
  const existingYnab = db.prepare("SELECT ynab_access_token, ynab_budget_id FROM users WHERE ynab_access_token IS NOT NULL LIMIT 1").get() as { ynab_access_token: string; ynab_budget_id: string | null } | undefined;
  if (existingYnab) {
    const hasHousehold = db.prepare("SELECT value FROM household_settings WHERE key = 'ynab_access_token'").get();
    if (!hasHousehold) {
      console.info("[db] Migrating YNAB settings from users to household_settings");
      db.prepare("INSERT OR IGNORE INTO household_settings (key, value) VALUES (?, ?)").run("ynab_access_token", existingYnab.ynab_access_token);
      if (existingYnab.ynab_budget_id) {
        db.prepare("INSERT OR IGNORE INTO household_settings (key, value) VALUES (?, ?)").run("ynab_budget_id", existingYnab.ynab_budget_id);
      }
    }
  }

  console.info("[db] Schema initialized");
}
