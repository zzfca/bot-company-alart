import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import companiesRouter from './routes/companies.js';
import settingsRouter from './routes/settings.js';
import { startNotificationCron } from './cron/notifications.js';

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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startNotificationCron();
});
