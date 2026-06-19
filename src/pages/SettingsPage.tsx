import { useState, useEffect } from 'react';
import { settings, auth } from '../lib/api';
import { Save, Lock, Mail, Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [smtp, setSmtp] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    email: '',
  });
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [error, setError] = useState('');
  const [passError, setPassError] = useState('');
  const [success, setSuccess] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  useEffect(() => {
    settings.get()
      .then(s => setSmtp({
        smtp_host: s.smtp_host || '',
        smtp_port: s.smtp_port || 587,
        smtp_user: s.smtp_user || '',
        smtp_pass: '',
        smtp_from: s.smtp_from || '',
        email: s.email || '',
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSmtpSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await settings.update(smtp);
      setSuccess(t('smtpSaved'));
    } catch (err: any) {
      setError(err.message || t('failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setError('');
    setSuccess('');
    setTestingEmail(true);
    try {
      await settings.update(smtp);
      await settings.sendTestEmail();
      setSuccess(t('testEmailSent'));
    } catch (err: any) {
      setError(err.message || t('failedToSendTestEmail'));
    } finally {
      setTestingEmail(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (password.new.length < 6) {
      setPassError(t('passwordMinLength'));
      return;
    }
    if (password.new !== password.confirm) {
      setPassError(t('passwordsDoNotMatch'));
      return;
    }

    setPassLoading(true);
    try {
      await auth.changePassword(password.current, password.new);
      setPassSuccess(t('passwordChanged'));
      setPassword({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      setPassError(err.message || t('failedToChangePassword'));
    } finally {
      setPassLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('settings')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('settingsSubtitle')}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <Languages className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">{t('language')}</h2>
        </div>
        <div className="p-6">
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as 'en' | 'zh')}
            className="w-full max-w-xs px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="en">{t('english')}</option>
            <option value="zh">{t('chinese')}</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <Mail className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">{t('emailNotificationSettings')}</h2>
        </div>
        <form onSubmit={handleSmtpSave} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-200">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('smtpHost')}</label>
              <input type="text" value={smtp.smtp_host} onChange={e => setSmtp({ ...smtp, smtp_host: e.target.value })} placeholder="smtp.example.com" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('smtpPort')}</label>
              <input type="number" value={smtp.smtp_port} onChange={e => setSmtp({ ...smtp, smtp_port: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('smtpUsername')}</label>
              <input type="text" value={smtp.smtp_user} onChange={e => setSmtp({ ...smtp, smtp_user: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('smtpPassword')}</label>
              <input type="password" value={smtp.smtp_pass} onChange={e => setSmtp({ ...smtp, smtp_pass: e.target.value })} placeholder={t('smtpPasswordPlaceholder')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('fromEmail')}</label>
              <input type="email" value={smtp.smtp_from} onChange={e => setSmtp({ ...smtp, smtp_from: e.target.value })} placeholder="noreply@example.com" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('notificationEmail')}</label>
              <input type="email" value={smtp.email} onChange={e => setSmtp({ ...smtp, email: e.target.value })} placeholder={t('notificationEmailPlaceholder')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-200">
            <button type="button" onClick={handleTestEmail} disabled={saving || testingEmail} className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 mr-3">
              <Mail className="w-4 h-4" />
              {testingEmail ? t('sending') : t('sendTestEmail')}
            </button>
            <button type="submit" disabled={saving || testingEmail} className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <Lock className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">{t('changePassword')}</h2>
        </div>
        <form onSubmit={handlePasswordChange} className="p-6 space-y-5">
          {passError && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{passError}</div>}
          {passSuccess && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-200">{passSuccess}</div>}

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('currentPassword')}</label>
              <input type="password" value={password.current} onChange={e => setPassword({ ...password, current: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('newPassword')}</label>
              <input type="password" value={password.new} onChange={e => setPassword({ ...password, new: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('confirmNewPassword')}</label>
              <input type="password" value={password.confirm} onChange={e => setPassword({ ...password, confirm: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" required />
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-200">
            <button type="submit" disabled={passLoading} className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50">
              <Lock className="w-4 h-4" />
              {passLoading ? t('changing') : t('changePassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
