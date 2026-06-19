import { createTransport, type Transporter } from 'nodemailer';
import { db } from '../db.js';

let cachedTransporter: Transporter | null = null;
let cachedSettings: any = null;

function getTransporter(): { transporter: Transporter | null; from: string | null } {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() as any;
  if (!settings || !settings.smtp_host || !settings.smtp_user || !settings.smtp_pass || !settings.smtp_from) {
    return { transporter: null, from: null };
  }

  if (!cachedTransporter || JSON.stringify(cachedSettings) !== JSON.stringify(settings)) {
    cachedTransporter = createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port || 587,
      secure: [465, 994].includes(settings.smtp_port || 587),
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });
    cachedSettings = settings;
  }

  return { transporter: cachedTransporter, from: settings.smtp_from };
}

export function resetTransporter() {
  cachedTransporter = null;
  cachedSettings = null;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  const { transporter, from } = getTransporter();
  if (!transporter || !from) {
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
