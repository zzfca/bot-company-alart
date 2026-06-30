import { schedule } from 'node-cron';
import { db } from '../db.js';
import { formatDateOnly, getDaysUntil } from '../lib/dates.js';
import { sendEmail } from '../lib/email.js';

const NOTIFICATION_DAYS = [30, 7];

function getNotificationTypeLabel(type: string): string {
  switch (type) {
    case 'annual_return': return 'Annual Return (年检)';
    case 'filing': return 'Annual Filing (年度报税)';
    case 'gst_return': return 'GST Return (GST申报)';
    default: return type;
  }
}

function getNotificationTypeField(type: string): string {
  switch (type) {
    case 'annual_return': return 'next_annual_return_date';
    case 'filing': return 'next_filing_date';
    case 'gst_return': return 'next_gst_return_date';
    default: return '';
  }
}

function getNotificationPausedField(type: string): string {
  switch (type) {
    case 'annual_return': return 'annual_return_paused';
    case 'filing': return 'filing_paused';
    case 'gst_return': return 'gst_return_paused';
    default: return '';
  }
}

async function checkAndSendNotifications() {
  const companies = db.prepare('SELECT * FROM companies').all() as any[];
  const settings = db.prepare('SELECT email FROM settings WHERE id = 1').get() as any;
  const toEmail = settings?.email || 'admin@company.com';

  const today = formatDateOnly(new Date());

  for (const company of companies) {
    const types: string[] = ['annual_return', 'filing'];
    if (company.has_gst) types.push('gst_return');

    for (const type of types) {
      const dateField = getNotificationTypeField(type);
      const pausedField = getNotificationPausedField(type);
      const dueDate = company[dateField];
      const isPaused = company[pausedField];

      // Skip if paused
      if (isPaused) continue;

      if (!dueDate) continue;

      const daysUntil = getDaysUntil(dueDate);
      if (!NOTIFICATION_DAYS.includes(daysUntil)) continue;

      // Check if already sent
      const existing = db.prepare(`
        SELECT COUNT(*) as count FROM notification_logs
        WHERE company_id = ? AND type = ? AND days_before = ? AND DATE(sent_at) = ?
      `).get(company.id, type, daysUntil, today) as { count: number };

      if (existing.count > 0) continue;

      const label = getNotificationTypeLabel(type);
      const subject = `[BC Company Tracker] ${company.name} - ${label} due in ${daysUntil} days`;
      const html = `
        <h2>Company Deadline Reminder</h2>
        <p><strong>Company:</strong> ${company.name}</p>
        <p><strong>Deadline Type:</strong> ${label}</p>
        <p><strong>Due Date:</strong> ${dueDate}</p>
        <p><strong>Days Remaining:</strong> ${daysUntil}</p>
        <hr/>
        <p>Please ensure this deadline is handled promptly.</p>
      `;

      const result = await sendEmail(toEmail, subject, html);

      db.prepare(`
        INSERT INTO notification_logs (company_id, type, days_before, status, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        company.id,
        type,
        daysUntil,
        result.success ? 'sent' : 'failed',
        result.error || null
      );
    }
  }
}

export function startNotificationCron() {
  // Run every day at 00:00
  schedule('0 0 * * *', checkAndSendNotifications);
  console.log('Notification cron job scheduled: daily at 00:00');

  // Also run once on startup
  checkAndSendNotifications().catch(console.error);
}
