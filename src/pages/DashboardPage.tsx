import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { companies, type Company } from '../lib/api';
import {
  Building2,
  AlertTriangle,
  CalendarDays,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { getDaysUntil } from '../lib/dates';

function getStatusBadge(date: string | null) {
  if (!date) return null;
  const days = getDaysUntil(date);
  if (days < 0) return { text: 'Overdue', color: 'bg-red-100 text-red-700' };
  if (days <= 7) return { text: `${days}d`, color: 'bg-red-100 text-red-700' };
  if (days <= 30) return { text: `${days}d`, color: 'bg-amber-100 text-amber-700' };
  return { text: `${days}d`, color: 'bg-green-100 text-green-700' };
}

function getUrgencyPriority(date: string | null): number {
  if (!date) return Infinity;
  const days = getDaysUntil(date);
  if (days < 0) return -1;
  if (days <= 7) return 1;
  if (days <= 30) return 2;
  return 3;
}

export default function DashboardPage() {
  const [data, setData] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companies.list()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total = data.length;
  const overdue = data.filter(c =>
    (c.next_annual_return_date && getDaysUntil(c.next_annual_return_date) < 0) ||
    (c.next_filing_date && getDaysUntil(c.next_filing_date) < 0) ||
    (c.has_gst && c.next_gst_return_date && getDaysUntil(c.next_gst_return_date) < 0)
  ).length;
  const warning = data.filter(c =>
    (c.next_annual_return_date && getDaysUntil(c.next_annual_return_date) >= 0 && getDaysUntil(c.next_annual_return_date) <= 30) ||
    (c.next_filing_date && getDaysUntil(c.next_filing_date) >= 0 && getDaysUntil(c.next_filing_date) <= 30) ||
    (c.has_gst && c.next_gst_return_date && getDaysUntil(c.next_gst_return_date) >= 0 && getDaysUntil(c.next_gst_return_date) <= 30)
  ).length;

  const upcomingItems = data.flatMap(c => {
    const items: { company: Company; type: string; label: string; date: string; days: number }[] = [];
    if (c.next_annual_return_date) {
      const days = getDaysUntil(c.next_annual_return_date);
      if (days <= 30) items.push({ company: c, type: 'annual_return', label: 'Annual Return', date: c.next_annual_return_date, days });
    }
    if (c.next_filing_date) {
      const days = getDaysUntil(c.next_filing_date);
      if (days <= 30) items.push({ company: c, type: 'filing', label: 'Annual Filing', date: c.next_filing_date, days });
    }
    if (c.has_gst && c.next_gst_return_date) {
      const days = getDaysUntil(c.next_gst_return_date);
      if (days <= 30) items.push({ company: c, type: 'gst_return', label: 'GST Return', date: c.next_gst_return_date, days });
    }
    return items;
  }).sort((a, b) => {
    const pa = getUrgencyPriority(a.date);
    const pb = getUrgencyPriority(b.date);
    if (pa !== pb) return pa - pb;
    return a.days - b.days;
  }).slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of your company compliance status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/companies" className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-teal-200 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{total}</p>
              <p className="text-sm text-slate-500">Total Companies</p>
            </div>
          </div>
        </Link>
        <Link to="/companies" className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-red-200 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{overdue}</p>
              <p className="text-sm text-slate-500">Overdue</p>
            </div>
          </div>
        </Link>
        <Link to="/companies" className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-amber-200 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{warning}</p>
              <p className="text-sm text-slate-500">Due in 30 Days</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Upcoming deadlines */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Upcoming Deadlines</h2>
          </div>
          <Link to="/companies" className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {upcomingItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-slate-400 text-sm">No upcoming deadlines in the next 30 days</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcomingItems.map((item, i) => {
              const badge = getStatusBadge(item.date);
              return (
                <Link key={i} to={`/companies/${item.company.id}`} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${
                      item.days < 0 ? 'bg-red-500' : item.days <= 7 ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <div>
                      <p className="font-medium text-slate-900">{item.company.name}</p>
                      <p className="text-sm text-slate-500">{item.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600">{item.date}</span>
                    {badge && (
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.color}`}>
                        {badge.text}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
