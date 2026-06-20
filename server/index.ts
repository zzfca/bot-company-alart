import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import authRouter from './routes/auth.js';
import companiesRouter from './routes/companies.js';
import settingsRouter from './routes/settings.js';
import { startNotificationCron } from './cron/notifications.js';
import { computeDueDates } from './lib/dates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'bc-company-tracker-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  },
}));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/settings', settingsRouter);

// Serve static files
const clientDistPath = path.join(__dirname, '..', 'dist');
app.use(express.static(clientDistPath));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

function refreshAllDueDates() {
  const companies = db.prepare('SELECT * FROM companies').all() as any[];
  const updateStmt = db.prepare(`
    UPDATE companies SET
      next_annual_return_date = ?, next_filing_date = ?, next_gst_return_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const transaction = db.transaction((rows: any[]) => {
    for (const company of rows) {
      const dueDates = computeDueDates({
        registration_date: company.registration_date,
        last_annual_return_date: company.last_annual_return_date,
        last_filing_date: company.last_filing_date,
        last_gst_return_date: company.last_gst_return_date,
        has_gst: company.has_gst,
        gst_period: company.gst_period,
      });

      updateStmt.run(dueDates.nextAnnualReturn, dueDates.nextFiling, dueDates.nextGst, company.id);
    }
  });

  transaction(companies);
  console.log(`Refreshed due dates for ${companies.length} companies`);
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  refreshAllDueDates();
  startNotificationCron();
});
