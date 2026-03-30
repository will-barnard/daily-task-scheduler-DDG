const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invite_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    send_date TEXT NOT NULL,
    product_url TEXT,
    done INTEGER DEFAULT 0,
    in_progress INTEGER DEFAULT 0,
    claimed_by TEXT,
    claimed_by_name TEXT,
    created_by TEXT NOT NULL,
    created_by_name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inbox_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    product_url TEXT,
    product_id TEXT,
    condition TEXT,
    received_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrations for existing deployments
const taskCols = db.prepare('PRAGMA table_info(tasks)').all().map((c) => c.name);
if (!taskCols.includes('product_url'))      db.exec('ALTER TABLE tasks ADD COLUMN product_url TEXT');
if (!taskCols.includes('done'))             db.exec('ALTER TABLE tasks ADD COLUMN done INTEGER DEFAULT 0');
if (!taskCols.includes('in_progress'))      db.exec('ALTER TABLE tasks ADD COLUMN in_progress INTEGER DEFAULT 0');
if (!taskCols.includes('claimed_by'))       db.exec('ALTER TABLE tasks ADD COLUMN claimed_by TEXT');
if (!taskCols.includes('claimed_by_name'))  db.exec('ALTER TABLE tasks ADD COLUMN claimed_by_name TEXT');
if (!taskCols.includes('created_by_name'))  db.exec('ALTER TABLE tasks ADD COLUMN created_by_name TEXT');

const inboxCols = db.prepare("PRAGMA table_info(inbox_items)").all().map((c) => c.name);
if (inboxCols.includes('edit_url') && !inboxCols.includes('product_url')) {
  db.exec('ALTER TABLE inbox_items RENAME COLUMN edit_url TO product_url');
}
if (!inboxCols.includes('product_id'))  db.exec('ALTER TABLE inbox_items ADD COLUMN product_id TEXT');
if (!inboxCols.includes('condition'))   db.exec('ALTER TABLE inbox_items ADD COLUMN condition TEXT');

// Seed super admin
const adminEmail = 'admin@drugansdrums.com';
const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!existingAdmin) {
  const hashed = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Admin', adminEmail, hashed, 'superadmin');
}

// Seed default settings if not exists
const existingTime = db.prepare('SELECT key FROM settings WHERE key = ?').get('send_time');
if (!existingTime) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('send_time', '09:00');
}

const existingRecipients = db.prepare('SELECT key FROM settings WHERE key = ?').get('recipients');
if (!existingRecipients) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('recipients', '[]');
}

const existingTz = db.prepare('SELECT key FROM settings WHERE key = ?').get('send_timezone');
if (!existingTz) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('send_timezone', 'America/New_York');
}

module.exports = db;
