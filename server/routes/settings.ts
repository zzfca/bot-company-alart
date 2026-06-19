import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { resetTransporter, sendEmail } from '../lib/email.js';

const router = Router();

// Get settings
router.get('/', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, smtp_host, smtp_port, smtp_user, smtp_from, email FROM settings WHERE id = 1').get() as any;
  if (!row) {
    return res.json({ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_from: '', email: '' });
  }
  res.json(row);
});

// Update settings
router.put('/', requireAuth, (req, res) => {
  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, email } = req.body;
  const existing = db.prepare('SELECT smtp_pass FROM settings WHERE id = 1').get() as { smtp_pass: string | null } | undefined;
  const passwordToSave = smtp_pass || existing?.smtp_pass || null;

  db.prepare(`
    UPDATE settings SET
      smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, smtp_from = ?, email = ?
    WHERE id = 1
  `).run(
    smtp_host || null,
    smtp_port || 587,
    smtp_user || null,
    passwordToSave,
    smtp_from || null,
    email || null
  );
  resetTransporter();

  const row = db.prepare('SELECT id, smtp_host, smtp_port, smtp_user, smtp_from, email FROM settings WHERE id = 1').get() as any;
  res.json(row);
});

router.post('/test-email', requireAuth, async (req, res) => {
  const row = db.prepare('SELECT email FROM settings WHERE id = 1').get() as { email: string | null } | undefined;
  const toEmail = row?.email;

  if (!toEmail) {
    return res.status(400).json({ error: 'Notification email is required' });
  }

  const result = await sendEmail(
    toEmail,
    '[BC Company Tracker] Test email',
    `
      <h2>Test Email</h2>
      <p>Your BC Company Tracker email settings are working.</p>
      <p>Sent at: ${new Date().toLocaleString()}</p>
    `
  );

  if (!result.success) {
    return res.status(400).json({ error: result.error || 'Failed to send test email' });
  }

  res.json({ success: true });
});

export default router;
