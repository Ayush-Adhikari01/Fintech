import { mockEngine } from './mockEngine';

const API_BASE = 'https://regtech-backend-q7wj.onrender.com/api';

// Tracks whether the browser has switched to in-memory demo engine
let useMockEngine = false;

export function isUsingMockEngine(): boolean {
  return useMockEngine;
}

export function setUseMockEngine(val: boolean): void {
  useMockEngine = val;
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);

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
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function withFallback<T>(apiFn: () => Promise<T>, fallbackFn: () => T | Promise<T>): Promise<T> {
  if (useMockEngine) {
    return Promise.resolve(fallbackFn());
  }
  try {
    const res = await apiFn();
    return res;
  } catch (err) {
    console.warn('[API] Live backend unavailable, activating Interactive Cloud Demo Engine:', err);
    useMockEngine = true;
    return Promise.resolve(fallbackFn());
  }
}

// 1. Health
export const fetchHealth = () =>
  withFallback(
    () => request<{ status: string; components: any }>('/health'),
    () => ({
      status: 'healthy',
      components: {
        database: 'HEALTHY',
        mlService: 'HEALTHY',
        ruleEngine: 'HEALTHY',
        simulator: 'RUNNING',
      },
    })
  );

// 2. Dashboard
export const fetchDashboard = () =>
  withFallback(
    () => request<{ success: boolean; data: any }>('/dashboard'),
    () => mockEngine.getDashboard()
  );

// 3. Transactions
export const fetchTransactions = (params: Record<string, any> = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
  });
  return withFallback(
    () => request<{ success: boolean; data: any[]; pagination: any }>(`/transactions?${query.toString()}`),
    () => mockEngine.getTransactions(params)
  );
};

export const fetchTransactionDetail = (id: string) =>
  withFallback(
    () => request<{ success: boolean; data: any }>(`/transactions/${id}`),
    () => mockEngine.getTransactionDetail(id)
  );

export const ingestTransaction = (payload: any) =>
  withFallback(
    () =>
      request<{ success: boolean; data: any }>('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    () => ({ success: true, data: mockEngine.generateSingleTransaction(payload) })
  );

// 4. Simulator
export const fetchSimulatorStatus = () =>
  withFallback(
    () => request<{ success: boolean; data: any }>('/simulator/status'),
    () => ({ success: true, data: mockEngine.getSimulatorStatus() })
  );

export const startSimulator = () =>
  withFallback(
    () => request<{ success: boolean; data: any }>('/simulator/start', { method: 'POST' }),
    () => {
      mockEngine.startSimulator();
      return { success: true, data: mockEngine.getSimulatorStatus() };
    }
  );

export const pauseSimulator = () =>
  withFallback(
    () => request<{ success: boolean; data: any }>('/simulator/pause', { method: 'POST' }),
    () => {
      mockEngine.pauseSimulator();
      return { success: true, data: mockEngine.getSimulatorStatus() };
    }
  );

export const resumeSimulator = () =>
  withFallback(
    () => request<{ success: boolean; data: any }>('/simulator/resume', { method: 'POST' }),
    () => {
      mockEngine.resumeSimulator();
      return { success: true, data: mockEngine.getSimulatorStatus() };
    }
  );

export const stopSimulator = () =>
  withFallback(
    () => request<{ success: boolean; data: any }>('/simulator/stop', { method: 'POST' }),
    () => {
      mockEngine.stopSimulator();
      return { success: true, data: mockEngine.getSimulatorStatus() };
    }
  );

export const setSimulatorRate = (intervalMs: number) =>
  withFallback(
    () =>
      request<{ success: boolean; data: any }>('/simulator/rate', {
        method: 'POST',
        body: JSON.stringify({ intervalMs }),
      }),
    () => {
      mockEngine.setSimulatorRate(intervalMs);
      return { success: true, data: mockEngine.getSimulatorStatus() };
    }
  );

export const generateSimulatorBatch = (count: number = 5) =>
  withFallback(
    () =>
      request<{ success: boolean; count: number; data: any }>('/simulator/generate-batch', {
        method: 'POST',
        body: JSON.stringify({ count }),
      }),
    () => {
      const results = mockEngine.generateBatch(count);
      return { success: true, count: results.length, data: results };
    }
  );

export const generateSuspiciousTx = () =>
  withFallback(
    () => request<{ success: boolean; data: any }>('/simulator/generate-suspicious', { method: 'POST' }),
    () => ({ success: true, data: mockEngine.generateSuspiciousTx() })
  );

// 5. Alerts
export const fetchAlerts = (params: Record<string, any> = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
  });
  return withFallback(
    () => request<{ success: boolean; data: any[]; pagination: any }>(`/alerts?${query.toString()}`),
    () => mockEngine.getAlerts(params)
  );
};

export const fetchAlertDetail = (id: string) =>
  withFallback(
    () => request<{ success: boolean; data: any }>(`/alerts/${id}`),
    () => mockEngine.getAlertDetail(id)
  );

export const updateAlertStatus = (id: string, status: string, reason: string, note?: string) =>
  withFallback(
    () =>
      request<{ success: boolean; data: any }>(`/alerts/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason, note }),
      }),
    () => mockEngine.updateAlertStatus(id, status as any, reason, note)
  );

export const assignAlert = (id: string, assignee: string) =>
  withFallback(
    () =>
      request<{ success: boolean; data: any }>(`/alerts/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignee }),
      }),
    () => mockEngine.assignAlert(id, assignee)
  );

export const addAlertNote = (id: string, note: string) =>
  withFallback(
    () =>
      request<{ success: boolean; data: any }>(`/alerts/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      }),
    () => mockEngine.addAlertNote(id, note)
  );

// 6. Customers
export const fetchCustomers = (params: Record<string, any> = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
  });
  return withFallback(
    () => request<{ success: boolean; data: any[]; pagination: any }>(`/customers?${query.toString()}`),
    () => mockEngine.getCustomers(params)
  );
};

export const fetchCustomerDetail = (id: string) =>
  withFallback(
    () => request<{ success: boolean; data: any }>(`/customers/${id}`),
    () => mockEngine.getCustomerDetail(id)
  );

export const updateCustomer = (id: string, updates: any) =>
  withFallback(
    () =>
      request<{ success: boolean; data: any }>(`/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    () => {
      const c = mockEngine.customers.find((cust) => cust.id === id);
      if (c) Object.assign(c, updates);
      return { success: true, data: c };
    }
  );

export const createCustomer = (payload: any) =>
  withFallback(
    () =>
      request<{ success: boolean; data: any }>('/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    () => {
      const newCust = {
        ...payload,
        id: `CUST-${Math.floor(2000 + Math.random() * 8000)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockEngine.customers.unshift(newCust);
      return { success: true, data: newCust };
    }
  );

// 7. Screening
export const fetchWatchlist = (search?: string, regime?: string) => {
  const query = new URLSearchParams();
  if (search) query.append('search', search);
  if (regime) query.append('regime', regime);
  return withFallback(
    () => request<{ success: boolean; count: number; data: any[] }>(`/screening/watchlist?${query.toString()}`),
    () => mockEngine.getWatchlist(search, regime)
  );
};

export const screenEntity = (payload: { name: string; threshold?: number; target_type?: string }) =>
  withFallback(
    () =>
      request<{ success: boolean; data: any }>('/screening/screen', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    () => mockEngine.screenEntity(payload)
  );

export const fetchScreeningHistory = (limit: number = 50) =>
  withFallback(
    () => request<{ success: boolean; count: number; data: any[] }>(`/screening/history?limit=${limit}`),
    () => mockEngine.getScreeningHistory(limit)
  );

export const updateScreeningStatus = (id: string, status: string, reason: string) =>
  withFallback(
    () =>
      request<{ success: boolean; data: any }>(`/screening/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }),
    () => mockEngine.updateScreeningStatus(id, status as any, reason)
  );

// 8. Counterparties
export const fetchCounterparties = () =>
  withFallback(
    () => request<{ success: boolean; data: any }>('/counterparties'),
    () => mockEngine.getCounterparties()
  );

export const fetchCounterpartyDetail = (id: string) =>
  withFallback(
    () => request<{ success: boolean; data: any }>(`/counterparties/${id}`),
    () => mockEngine.getCounterpartyDetail(id)
  );

// 9. Stress Testing
export const fetchStressScenarios = () =>
  withFallback(
    () => request<{ success: boolean; data: any[] }>('/stress-testing/scenarios'),
    () => mockEngine.getStressScenarios()
  );

export const runStressTest = (payload: any) =>
  withFallback(
    () =>
      request<{ success: boolean; data: any }>('/stress-testing/run', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    () => mockEngine.runStressTest(payload)
  );

// 10. Reports
export const fetchReport = (type: string, params: Record<string, any> = {}) => {
  const query = new URLSearchParams({ type, format: 'json', ...params });
  return withFallback(
    () => request<{ success: boolean; data: any }>(`/reports/generate?${query.toString()}`),
    () => mockEngine.generateReport(type, params)
  );
};

export const downloadReportCsvUrl = (type: string, params: Record<string, any> = {}) => {
  if (useMockEngine) {
    const rep = mockEngine.generateReport(type, params);
    return `data:text/csv;charset=utf-8,${encodeURIComponent(rep.data.csv)}`;
  }
  const query = new URLSearchParams({ type, format: 'csv', ...params });
  return `${API_BASE}/reports/generate?${query.toString()}`;
};

// 11. Audit
export const fetchAuditEvents = (params: Record<string, any> = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
  });
  return withFallback(
    () => request<{ success: boolean; data: any[]; pagination: any }>(`/audit?${query.toString()}`),
    () => mockEngine.getAuditEvents(params)
  );
};

// 12. Rules
export const fetchRules = () =>
  withFallback(
    () => request<{ success: boolean; data: any[] }>('/rules'),
    () => mockEngine.getRules()
  );

export const updateRule = (id: string, updates: any) =>
  withFallback(
    () =>
      request<{ success: boolean; data: any }>(`/rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    () => mockEngine.updateRule(id, updates)
  );

// 13. Settings
export const resetDemoDataset = () =>
  withFallback(
    () =>
      request<{ success: boolean; message: string; data: any }>('/settings/reset-demo', {
        method: 'POST',
        body: JSON.stringify({ actor: 'demo.analyst@sentinel.internal' }),
      }),
    () => mockEngine.resetDemo()
  );
