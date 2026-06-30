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

  // Add paused columns if they don't exist
  const tableInfo = db.pragma('table_info(companies)') as any[];
  const columns = tableInfo.map((col: any) => col.name);

  if (!columns.includes('annual_return_paused')) {
    db.exec('ALTER TABLE companies ADD COLUMN annual_return_paused INTEGER NOT NULL DEFAULT 0');
  }
  if (!columns.includes('filing_paused')) {
    db.exec('ALTER TABLE companies ADD COLUMN filing_paused INTEGER NOT NULL DEFAULT 0');
  }
  if (!columns.includes('gst_return_paused')) {
    db.exec('ALTER TABLE companies ADD COLUMN gst_return_paused INTEGER NOT NULL DEFAULT 0');
  }

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

  // Filing history
  db.exec(`
    CREATE TABLE IF NOT EXISTS filing_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      filed_date TEXT NOT NULL,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  // Backfill one history record from legacy "last filed" fields where missing.
  db.prepare(`
    INSERT INTO filing_history (company_id, type, filed_date, recorded_at)
    SELECT c.id, 'annual_return', c.last_annual_return_date, COALESCE(c.updated_at, c.created_at, CURRENT_TIMESTAMP)
    FROM companies c
    WHERE c.last_annual_return_date IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM filing_history fh
        WHERE fh.company_id = c.id
          AND fh.type = 'annual_return'
          AND fh.filed_date = c.last_annual_return_date
      )
  `).run();

  db.prepare(`
    INSERT INTO filing_history (company_id, type, filed_date, recorded_at)
    SELECT c.id, 'filing', c.last_filing_date, COALESCE(c.updated_at, c.created_at, CURRENT_TIMESTAMP)
    FROM companies c
    WHERE c.last_filing_date IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM filing_history fh
        WHERE fh.company_id = c.id
          AND fh.type = 'filing'
          AND fh.filed_date = c.last_filing_date
      )
  `).run();

  db.prepare(`
    INSERT INTO filing_history (company_id, type, filed_date, recorded_at)
    SELECT c.id, 'gst_return', c.last_gst_return_date, COALESCE(c.updated_at, c.created_at, CURRENT_TIMESTAMP)
    FROM companies c
    WHERE c.last_gst_return_date IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM filing_history fh
        WHERE fh.company_id = c.id
          AND fh.type = 'gst_return'
          AND fh.filed_date = c.last_gst_return_date
      )
  `).run();
}

initDb();

export { db };
