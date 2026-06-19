import Database from 'better-sqlite3';
import { hashSync } from 'bcryptjs';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'database.sqlite');
const db: Database.Database = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables
function initDb() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Companies table
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      registration_number TEXT,
      address TEXT,
      registration_date TEXT NOT NULL,
      has_gst INTEGER NOT NULL DEFAULT 0,
      gst_number TEXT,
      gst_period TEXT,
      last_filing_date TEXT,
      last_annual_return_date TEXT,
      last_gst_return_date TEXT,
      next_filing_date TEXT,
      next_annual_return_date TEXT,
      next_gst_return_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Notification logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      days_before INTEGER NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'sent',
      message TEXT
    )
  `);

  // Settings table (SMTP config)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      smtp_host TEXT,
      smtp_port INTEGER DEFAULT 587,
      smtp_user TEXT,
      smtp_pass TEXT,
      smtp_from TEXT,
      email TEXT
    )
  `);

  // Create default admin user if not exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
    db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
      .run('admin@company.com', hashSync(defaultPassword, 10), 'admin');
  }

  // Create default settings row
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (settingsCount.count === 0) {
    db.prepare('INSERT INTO settings (id) VALUES (1)').run();
  }
}

initDb();

export { db };
