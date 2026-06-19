import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { companies, type Company } from '../lib/api';
import {
  Building2,
  Save,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

export default function CompanyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState<Partial<Company>>({
    name: '',
    registration_number: '',
    address: '',
    registration_date: '',
    has_gst: false,
    gst_number: '',
    gst_period: '',
    last_filing_date: '',
    last_annual_return_date: '',
    last_gst_return_date: '',
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    companies.get(Number(id))
      .then(c => setForm(c))
      .catch(() => setError('Failed to load company'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        ...form,
        has_gst: form.has_gst ? true : false,
        gst_number: form.has_gst ? form.gst_number : null,
        gst_period: form.has_gst ? form.gst_period : null,
      };

      if (isEdit) {
        await companies.update(Number(id), payload);
      } else {
        await companies.create(payload);
      }
      navigate('/companies');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
      setSaving(false);
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
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/companies')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Companies
      </button>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <Building2 className="w-5 h-5 text-slate-500" />
          <h1 className="text-lg font-semibold text-slate-900">
            {isEdit ? 'Edit Company' : 'New Company'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name || ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>

            {/* Registration Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Registration Number</label>
              <input
                type="text"
                value={form.registration_number || ''}
                onChange={e => setForm({ ...form, registration_number: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            {/* Registration Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Registration Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.registration_date || ''}
                onChange={e => setForm({ ...form, registration_date: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
              <input
                type="text"
                value={form.address || ''}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            {/* GST Toggle */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="has_gst"
                  checked={form.has_gst || false}
                  onChange={e => setForm({ ...form, has_gst: e.target.checked, gst_number: e.target.checked ? form.gst_number : '', gst_period: e.target.checked ? form.gst_period : '' })}
                  className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="has_gst" className="text-sm font-medium text-slate-700">
                  Registered for GST
                </label>
              </div>
            </div>

            {/* GST Number */}
            {form.has_gst && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">GST Number</label>
                <input
                  type="text"
                  value={form.gst_number || ''}
                  onChange={e => setForm({ ...form, gst_number: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            )}

            {/* GST Period */}
            {form.has_gst && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">GST Period</label>
                <select
                  value={form.gst_period || ''}
                  onChange={e => setForm({ ...form, gst_period: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Select period</option>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            )}

            {/* Last Annual Return */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Annual Return</label>
              <input
                type="date"
                value={form.last_annual_return_date || ''}
                onChange={e => setForm({ ...form, last_annual_return_date: e.target.value || null })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            {/* Last Filing */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Annual Filing</label>
              <input
                type="date"
                value={form.last_filing_date || ''}
                onChange={e => setForm({ ...form, last_filing_date: e.target.value || null })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            {/* Last GST Return */}
            {form.has_gst && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Last GST Return</label>
                <input
                  type="date"
                  value={form.last_gst_return_date || ''}
                  onChange={e => setForm({ ...form, last_gst_return_date: e.target.value || null })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
              <textarea
                value={form.notes || ''}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/companies')}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
