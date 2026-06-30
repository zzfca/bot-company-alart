import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { companies, type Company } from '../lib/api';
import { getDaysUntil, formatDate } from '../lib/dates';
import {
  Search,
  Plus,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

function getStatusBadge(date: string | null, paused: boolean, t: ReturnType<typeof useLanguage>['t']) {
  if (!date) return null;
  if (paused) return { text: t('paused'), color: 'bg-slate-100 text-slate-500' };
  const days = getDaysUntil(date);
  if (days < 0) return { text: t('overdue'), color: 'bg-red-100 text-red-700' };
  if (days <= 7) return { text: `${days}${t('daysShort')}`, color: 'bg-red-100 text-red-700' };
  if (days <= 30) return { text: `${days}${t('daysShort')}`, color: 'bg-amber-100 text-amber-700' };
  return { text: `${days}${t('daysShort')}`, color: 'bg-green-100 text-green-700' };
}

export default function CompaniesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    companies.list()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.registration_number && c.registration_number.toLowerCase().includes(search.toLowerCase())) ||
    (c.notes && c.notes.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('companies')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('manageCompanies')}</p>
        </div>
        <Link
          to="/companies/new"
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('addCompany')}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('searchCompanies')}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-sm">
              {data.length === 0 ? t('noCompanies') : t('noMatchingCompanies')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-left">
                  <th className="px-6 py-3 font-medium">{t('company')}</th>
                  <th className="px-6 py-3 font-medium">{t('regNumber')}</th>
                  <th className="px-6 py-3 font-medium">{t('regDate')}</th>
                  <th className="px-6 py-3 font-medium">{t('gst')}</th>
                  <th className="px-6 py-3 font-medium">{t('nextAnnualReturn')}</th>
                  <th className="px-6 py-3 font-medium">{t('nextFiling')}</th>
                  <th className="px-6 py-3 font-medium">{t('nextGst')}</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(company => (
                  <tr
                    key={company.id}
                    className="cursor-pointer hover:bg-slate-50 focus-within:bg-slate-50 transition-colors"
                    onClick={() => navigate(`/companies/${company.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/companies/${company.id}`);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`View details for ${company.name}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{company.name}</div>
                      {company.notes && (
                        <div className="mt-1 max-w-xs text-xs text-slate-500 leading-relaxed line-clamp-2">{company.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{company.registration_number || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(company.registration_date)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        company.has_gst ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {company.has_gst ? t('yes') : t('no')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={company.annual_return_paused ? "text-slate-400" : "text-slate-600"}>{formatDate(company.next_annual_return_date)}</span>
                        {company.next_annual_return_date && getStatusBadge(company.next_annual_return_date, !!company.annual_return_paused, t) && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(company.next_annual_return_date, !!company.annual_return_paused, t)!.color}`}>
                            {getStatusBadge(company.next_annual_return_date, !!company.annual_return_paused, t)!.text}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={company.filing_paused ? "text-slate-400" : "text-slate-600"}>{formatDate(company.next_filing_date)}</span>
                        {company.next_filing_date && getStatusBadge(company.next_filing_date, !!company.filing_paused, t) && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(company.next_filing_date, !!company.filing_paused, t)!.color}`}>
                            {getStatusBadge(company.next_filing_date, !!company.filing_paused, t)!.text}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={company.gst_return_paused ? "text-slate-400" : "text-slate-600"}>{formatDate(company.next_gst_return_date)}</span>
                        {company.has_gst && company.next_gst_return_date && getStatusBadge(company.next_gst_return_date, !!company.gst_return_paused, t) && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(company.next_gst_return_date, !!company.gst_return_paused, t)!.color}`}>
                            {getStatusBadge(company.next_gst_return_date, !!company.gst_return_paused, t)!.text}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex text-teal-600">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
