export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Company {
  id: number;
  user_id: number;
  cnpj: string;
  name: string;
}

export interface Client {
  id: number;
  company_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  balance?: number; // Calculated field: total sales - total payments
}

export interface Transaction {
  id: number;
  company_id: number;
  client_id: number | null;
  client_name?: string;
  type: 'sale' | 'payment' | 'expense' | 'income';
  amount: number;
  description: string | null;
  date: string;
  due_date?: string;
}

export interface DashboardStats {
  totalSales: number;
  totalReceived: number;
  totalExpenses: number;
  accountsReceivable: number;
  netBalance: number;
  receivableToday: number;
  receivableMonth: number;
  receivableYear: number;
  recentTransactions: Transaction[];
}

const API_BASE = '/api';

// Helper to get token
const getToken = () => localStorage.getItem('token');
let activeCompanyId: number | null = null;

// Helper for authenticated requests
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeCompanyId ? { 'x-company-id': String(activeCompanyId) } : {}),
  } as Record<string, string>;

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });
  
  if (res.status === 401 || res.status === 403) {
    // Handle unauthorized (e.g., clear token and redirect to login)
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('auth-error'));
    throw new Error('Unauthorized');
  }
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Request failed');
  }
  
  return res.json();
}

export const api = {
  setActiveCompanyId: (id: number) => {
    activeCompanyId = id;
  },

  // Auth
  register: async (data: any): Promise<{ token: string; user: User; companies: Company[] }> => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to register');
    }
    return res.json();
  },

  login: async (data: any): Promise<{ token: string; user: User; companies: Company[] }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to login');
    }
    return res.json();
  },

  getMe: async (): Promise<{ user: User; companies: Company[] }> => {
    return fetchWithAuth(`${API_BASE}/auth/me`);
  },

  // Companies
  createCompany: async (data: Partial<Company>): Promise<Company> => {
    return fetchWithAuth(`${API_BASE}/companies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Clients
  getClients: async (): Promise<Client[]> => {
    return fetchWithAuth(`${API_BASE}/clients`);
  },
  
  getClient: async (id: number): Promise<Client> => {
    return fetchWithAuth(`${API_BASE}/clients/${id}`);
  },
  
  createClient: async (data: Partial<Client>): Promise<Client> => {
    return fetchWithAuth(`${API_BASE}/clients`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Transactions
  getTransactions: async (clientId?: number): Promise<Transaction[]> => {
    const url = clientId ? `${API_BASE}/transactions?client_id=${clientId}` : `${API_BASE}/transactions`;
    return fetchWithAuth(url);
  },
  
  createTransaction: async (data: Partial<Transaction>): Promise<Transaction> => {
    return fetchWithAuth(`${API_BASE}/transactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteTransaction: async (id: number): Promise<void> => {
    await fetchWithAuth(`${API_BASE}/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  // Stats
  getStats: async (): Promise<DashboardStats> => {
    return fetchWithAuth(`${API_BASE}/stats`);
  },
};
