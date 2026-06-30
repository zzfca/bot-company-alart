const API_BASE = '';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const auth = {
  login: (email: string, password: string) =>
    api<{ user: { id: number; email: string; role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  me: () => api<{ user: { id: number; email: string; role: string } } | null>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api('/auth/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

export interface Company {
  id: number;
  name: string;
  registration_number: string | null;
  address: string | null;
  registration_date: string;
  has_gst: boolean;
  gst_number: string | null;
  gst_period: string | null;
  last_filing_date: string | null;
  last_annual_return_date: string | null;
  last_gst_return_date: string | null;
  next_filing_date: string | null;
  next_annual_return_date: string | null;
  next_gst_return_date: string | null;
  annual_return_paused?: number;
  filing_paused?: number;
  gst_return_paused?: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  filing_history?: FilingHistoryItem[];
}

export interface FilingHistoryItem {
  id: number;
  company_id: number;
  type: 'annual_return' | 'filing' | 'gst_return';
  filed_date: string;
  recorded_at: string;
}

export const companies = {
  list: () => api<Company[]>('/companies'),
  get: (id: number) => api<Company>(`/companies/${id}`),
  create: (data: Partial<Company>) =>
    api<Company>('/companies', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Company>) =>
    api<Company>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => api(`/companies/${id}`, { method: 'DELETE' }),
  recalculate: (id: number) => api<Company>(`/companies/${id}/recalculate`, { method: 'POST' }),
  togglePause: (id: number, type: 'annual_return' | 'filing' | 'gst_return') =>
    api<Company>(`/companies/${id}/toggle-pause`, { method: 'POST', body: JSON.stringify({ type }) }),
};

export interface Settings {
  id: number;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_from: string;
  email: string;
}

export const settings = {
  get: () => api<Settings>('/settings'),
  update: (data: Partial<Settings>) =>
    api<Settings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  sendTestEmail: () => api<{ success: boolean }>('/settings/test-email', { method: 'POST' }),
};
