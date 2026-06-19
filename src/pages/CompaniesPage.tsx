import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { companies, type Company } from '../lib/api';
import { getDaysUntil, formatDate } from '../lib/dates';
import {
  Search,
  Plus,
  Building2,
  ArrowRight,
} from 'lucide-react';

function getStatusBadge(date: string | null) {
  if (!date) return null;
  const days = getDaysUntil(date);
  if (days < 0) return { text: 'Overdue', color: 'bg-red-100 text-red-700' };
  if (days <= 7) return { text: `${days}d`, color: 'bg-red-100 text-red-700' };
  if (days <= 30) return { text: `${days}d`, color: 'bg-amber-100 text-amber-700' };
  return { text: `${days}d`, color: 'bg-green-100 text-green-700' };
}

export default function CompaniesPage() {
  const [data, setData] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your BC companies and compliance deadlines</p>
        </div>
        <Link
          to="/companies/new"
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Company
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
              placeholder="Search companies..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-sm">
              {data.length === 0 ? 'No companies yet. Add your first company to get started.' : 'No matching companies found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-left">
                  <th className="px-6 py-3 font-medium">Company</th>
                  <th className="px-6 py-3 font-medium">Reg. Number</th>
                  <th className="px-6 py-3 font-medium">Reg. Date</th>
                  <th className="px-6 py-3 font-medium">GST</th>
                  <th className="px-6 py-3 font-medium">Next Annual Return</th>
                  <th className="px-6 py-3 font-medium">Next Filing</th>
                  <th className="px-6 py-3 font-medium">Next GST</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(company => (
                  <tr key={company.id} className="hover:bg-slate-50 transition-colors">
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
                        {company.has_gst ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">{formatDate(company.next_annual_return_date)}</span>
                        {company.next_annual_return_date && getStatusBadge(company.next_annual_return_date) && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(company.next_annual_return_date)!.color}`}>
                            {getStatusBadge(company.next_annual_return_date)!.text}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">{formatDate(company.next_filing_date)}</span>
                        {company.next_filing_date && getStatusBadge(company.next_filing_date) && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(company.next_filing_date)!.color}`}>
                            {getStatusBadge(company.next_filing_date)!.text}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">{formatDate(company.next_gst_return_date)}</span>
                        {company.has_gst && company.next_gst_return_date && getStatusBadge(company.next_gst_return_date) && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(company.next_gst_return_date)!.color}`}>
                            {getStatusBadge(company.next_gst_return_date)!.text}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/companies/${company.id}`}
                        className="text-teal-600 hover:text-teal-700"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
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
