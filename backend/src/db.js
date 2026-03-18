const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invite_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    send_date TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inbox_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    edit_url TEXT,
    received_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed default super admin if not exists
const existingAdmin = db.prepare('SELECT id FROM users WHERE role = ?').get('superadmin');
if (!existingAdmin) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(
    'admin@drugansdrums.com',
    hash,
    'Super Admin',
    'superadmin'
  );
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
