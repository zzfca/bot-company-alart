import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { companies, type Company } from '../lib/api';
import { getDaysUntil, formatDate } from '../lib/dates';
import {
  Building2,
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  AlertTriangle,
  Receipt,
  Clock,
  FileCheck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type FilingType = 'annual_return' | 'filing' | 'gst_return';

function StatusCard({
  title,
  date,
  type,
  filingType,
  filingDate,
  saving,
  onFile,
  t,
}: {
  title: string;
  date: string | null;
  type: string;
  filingType: FilingType;
  filingDate: string;
  saving: boolean;
  onFile: (type: FilingType, date: string) => Promise<void>;
  t: ReturnType<typeof useLanguage>['t'];
}) {
  const [selectedDate, setSelectedDate] = useState(filingDate || getTodayDateInputValue());
  const [editing, setEditing] = useState(false);

  if (!date) return null;
  const days = getDaysUntil(date);
  const isOverdue = days < 0;
  const isWarning = days >= 0 && days <= 30;
  const isCritical = days >= 0 && days <= 7;

  return (
    <div className={`bg-white rounded-xl border p-5 ${
      isOverdue ? 'border-red-200' : isCritical ? 'border-red-200' : isWarning ? 'border-amber-200' : 'border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {type === 'annual' && <Calendar className="w-4 h-4 text-slate-500" />}
          {type === 'filing' && <Receipt className="w-4 h-4 text-slate-500" />}
          {type === 'gst' && <Clock className="w-4 h-4 text-slate-500" />}
          <span className="text-sm font-medium text-slate-600">{title}</span>
        </div>
        {isOverdue ? (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">{t('overdue')}</span>
        ) : isCritical ? (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">{days} {t('days')}</span>
        ) : isWarning ? (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">{days} {t('days')}</span>
        ) : (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">{days} {t('days')}</span>
        )}
      </div>
      <p className="text-lg font-semibold text-slate-900">{date}</p>
      <p className={`text-sm mt-1 ${
        isOverdue ? 'text-red-600' : isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-500'
      }`}>
        {isOverdue ? `${Math.abs(days)} ${t('daysOverdue')}` : isCritical ? t('dueVerySoon') : isWarning ? t('dueWithin30Days') : t('onTrack')}
      </p>
      {editing ? (
        <div className="mt-4 space-y-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving || !selectedDate}
              onClick={async () => {
                await onFile(filingType, selectedDate);
                setEditing(false);
              }}
              className="inline-flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <FileCheck className="w-3.5 h-3.5" />
              {saving ? t('saving') : t('save')}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <FileCheck className="w-3.5 h-3.5" />
          {t('file')}
        </button>
      )}
    </div>
  );
}

export default function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filingSaving, setFilingSaving] = useState<FilingType | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!id) return;
    companies.get(Number(id))
      .then(setCompany)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await companies.delete(Number(id));
      navigate('/companies');
    } catch {
      setDeleting(false);
    }
  };

  const handleFile = async (type: FilingType, filingDate: string) => {
    if (!company) return;
    setFilingSaving(type);
    const update = {
      name: company.name,
      registration_number: company.registration_number,
      address: company.address,
      registration_date: company.registration_date,
      has_gst: company.has_gst,
      gst_number: company.gst_number,
      gst_period: company.gst_period,
      last_filing_date: type === 'filing' ? filingDate : company.last_filing_date,
      last_annual_return_date: type === 'annual_return' ? filingDate : company.last_annual_return_date,
      last_gst_return_date: type === 'gst_return' ? filingDate : company.last_gst_return_date,
      notes: company.notes,
    };

    try {
      const updated = await companies.update(company.id, update);
      setCompany(updated);
    } finally {
      setFilingSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{t('companyNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/companies')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('backToCompanies')}
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                {company.registration_number && (
                  <span className="text-sm text-slate-500">{company.registration_number}</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  company.has_gst ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {company.has_gst ? t('gstRegistered') : t('gstNotRegistered')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/companies/${company.id}/edit`}
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              {t('edit')}
            </Link>
            <button
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('delete')}
            </button>
          </div>
        </div>

        {company.address && (
          <p className="text-sm text-slate-600 mt-4">{company.address}</p>
        )}
      </div>

      {/* Next deadlines */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">{t('upcomingDeadlines')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusCard title={t('annualReturn')} date={company.next_annual_return_date} type="annual" filingType="annual_return" filingDate={company.last_annual_return_date || ''} saving={filingSaving === 'annual_return'} onFile={handleFile} t={t} />
          <StatusCard title={t('annualFiling')} date={company.next_filing_date} type="filing" filingType="filing" filingDate={company.last_filing_date || ''} saving={filingSaving === 'filing'} onFile={handleFile} t={t} />
          {company.has_gst && (
            <StatusCard title={t('gstReturn')} date={company.next_gst_return_date} type="gst" filingType="gst_return" filingDate={company.last_gst_return_date || ''} saving={filingSaving === 'gst_return'} onFile={handleFile} t={t} />
          )}
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">{t('companyDetails')}</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-500">{t('registrationDate')}</p>
            <p className="text-sm font-medium text-slate-900 mt-1">{formatDate(company.registration_date)}</p>
          </div>
          {company.gst_number && (
            <div>
              <p className="text-sm text-slate-500">{t('gstNumber')}</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{company.gst_number}</p>
            </div>
          )}
          {company.gst_period && (
            <div>
              <p className="text-sm text-slate-500">{t('gstPeriod')}</p>
              <p className="text-sm font-medium text-slate-900 mt-1 capitalize">{company.gst_period}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-slate-500">{t('lastAnnualReturn')}</p>
            <p className="text-sm font-medium text-slate-900 mt-1">{formatDate(company.last_annual_return_date)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('lastAnnualFiling')}</p>
            <p className="text-sm font-medium text-slate-900 mt-1">{formatDate(company.last_filing_date)}</p>
          </div>
          {company.has_gst && (
            <div>
              <p className="text-sm text-slate-500">{t('lastGstReturn')}</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{formatDate(company.last_gst_return_date)}</p>
            </div>
          )}
          {company.notes && (
            <div className="md:col-span-2">
              <p className="text-sm text-slate-500">{t('notes')}</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{company.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{t('deleteCompany')}</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              {t('deleteConfirm')} <strong>{company.name}</strong>? {t('deleteCannotUndo')}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deleting ? t('deleting') : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
