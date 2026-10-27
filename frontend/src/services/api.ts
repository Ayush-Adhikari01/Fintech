const API_BASE = '/api';

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorMsg = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.error || errorJson.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

// 1. Health
export const fetchHealth = () => request<{ status: string; components: any }>('/health');

// 2. Dashboard
export const fetchDashboard = () => request<{ success: boolean; data: any }>('/dashboard');

// 3. Transactions
export const fetchTransactions = (params: Record<string, any> = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
  });
  return request<{ success: boolean; data: any[]; pagination: any }>(`/transactions?${query.toString()}`);
};

export const fetchTransactionDetail = (id: string) =>
  request<{ success: boolean; data: any }>(`/transactions/${id}`);

export const ingestTransaction = (payload: any) =>
  request<{ success: boolean; data: any }>('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// 4. Simulator
export const fetchSimulatorStatus = () => request<{ success: boolean; data: any }>('/simulator/status');
export const startSimulator = () => request<{ success: boolean; data: any }>('/simulator/start', { method: 'POST' });
export const pauseSimulator = () => request<{ success: boolean; data: any }>('/simulator/pause', { method: 'POST' });
export const resumeSimulator = () => request<{ success: boolean; data: any }>('/simulator/resume', { method: 'POST' });
export const stopSimulator = () => request<{ success: boolean; data: any }>('/simulator/stop', { method: 'POST' });
export const setSimulatorRate = (intervalMs: number) =>
  request<{ success: boolean; data: any }>('/simulator/rate', {
    method: 'POST',
    body: JSON.stringify({ intervalMs }),
  });
export const generateSimulatorBatch = (count: number = 5) =>
  request<{ success: boolean; count: number; data: any }>('/simulator/generate-batch', {
    method: 'POST',
    body: JSON.stringify({ count }),
  });
export const generateSuspiciousTx = () =>
  request<{ success: boolean; data: any }>('/simulator/generate-suspicious', { method: 'POST' });

// 5. Alerts
export const fetchAlerts = (params: Record<string, any> = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
  });
  return request<{ success: boolean; data: any[]; pagination: any }>(`/alerts?${query.toString()}`);
};

export const fetchAlertDetail = (id: string) =>
  request<{ success: boolean; data: any }>(`/alerts/${id}`);

export const updateAlertStatus = (id: string, status: string, reason: string, note?: string) =>
  request<{ success: boolean; data: any }>(`/alerts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason, note }),
  });

export const assignAlert = (id: string, assignee: string) =>
  request<{ success: boolean; data: any }>(`/alerts/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assignee }),
  });

export const addAlertNote = (id: string, note: string) =>
  request<{ success: boolean; data: any }>(`/alerts/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });

// 6. Customers
export const fetchCustomers = (params: Record<string, any> = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
  });
  return request<{ success: boolean; data: any[]; pagination: any }>(`/customers?${query.toString()}`);
};

export const fetchCustomerDetail = (id: string) =>
  request<{ success: boolean; data: any }>(`/customers/${id}`);

export const updateCustomer = (id: string, updates: any) =>
  request<{ success: boolean; data: any }>(`/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

export const createCustomer = (payload: any) =>
  request<{ success: boolean; data: any }>('/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// 7. Screening
export const fetchWatchlist = (search?: string, regime?: string) => {
  const query = new URLSearchParams();
  if (search) query.append('search', search);
  if (regime) query.append('regime', regime);
  return request<{ success: boolean; count: number; data: any[] }>(`/screening/watchlist?${query.toString()}`);
};

export const screenEntity = (payload: { name: string; threshold?: number; target_type?: string }) =>
  request<{ success: boolean; data: any }>('/screening/screen', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchScreeningHistory = (limit: number = 50) =>
  request<{ success: boolean; count: number; data: any[] }>(`/screening/history?limit=${limit}`);

export const updateScreeningStatus = (id: string, status: string, reason: string) =>
  request<{ success: boolean; data: any }>(`/screening/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });

// 8. Counterparties
export const fetchCounterparties = () => request<{ success: boolean; data: any }>('/counterparties');
export const fetchCounterpartyDetail = (id: string) =>
  request<{ success: boolean; data: any }>(`/counterparties/${id}`);

// 9. Stress Testing
export const fetchStressScenarios = () => request<{ success: boolean; data: any[] }>('/stress-testing/scenarios');
export const runStressTest = (payload: any) =>
  request<{ success: boolean; data: any }>('/stress-testing/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// 10. Reports
export const fetchReport = (type: string, params: Record<string, any> = {}) => {
  const query = new URLSearchParams({ type, format: 'json', ...params });
  return request<{ success: boolean; data: any }>(`/reports/generate?${query.toString()}`);
};

export const downloadReportCsvUrl = (type: string, params: Record<string, any> = {}) => {
  const query = new URLSearchParams({ type, format: 'csv', ...params });
  return `${API_BASE}/reports/generate?${query.toString()}`;
};

// 11. Audit
export const fetchAuditEvents = (params: Record<string, any> = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
  });
  return request<{ success: boolean; data: any[]; pagination: any }>(`/audit?${query.toString()}`);
};

// 12. Rules
export const fetchRules = () => request<{ success: boolean; data: any[] }>('/rules');
export const updateRule = (id: string, updates: any) =>
  request<{ success: boolean; data: any }>(`/rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

// 13. Settings
export const resetDemoDataset = () =>
  request<{ success: boolean; message: string; data: any }>('/settings/reset-demo', {
    method: 'POST',
    body: JSON.stringify({ actor: 'demo.analyst@sentinel.internal' }),
  });
