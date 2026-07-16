const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type Party = {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  firm_name?: string | null;
  contact_person?: string | null;
  gst_number?: string | null;
  balance: number;
  last_transaction_at?: string | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  party_id: string;
  type: "gave" | "got";
  amount: number;
  note?: string | null;
  date: string;
  created_at: string;
};

export type Summary = {
  total_receivable: number;
  total_payable: number;
  net: number;
  party_count: number;
  transaction_count: number;
};

export type MonthlyReport = {
  year: number;
  month: number;
  rows: Array<{
    date: string;
    party_name: string;
    type: "gave" | "got";
    amount: number;
    note: string;
  }>;
  total_gave: number;
  total_got: number;
  net: number;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : null;
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export const api = {
  authStatus: () =>
    request<{ pin_set: boolean }>("/auth/status"),

  setupPin: (pin: string) =>
    request<{ ok: boolean }>("/auth/setup-pin", {
      method: "POST",
      body: JSON.stringify({ pin }),
    }),

  verifyPin: (pin: string) =>
    request<{ ok: boolean }>("/auth/verify-pin", {
      method: "POST",
      body: JSON.stringify({ pin }),
    }),

  changePin: (current_pin: string, new_pin: string) =>
    request<{ ok: boolean }>("/auth/change-pin", {
      method: "POST",
      body: JSON.stringify({ current_pin, new_pin }),
    }),


      resetPin: () =>
    request<{ ok: boolean }>("/auth/reset-pin", {
      method: "POST",
    }),
    
  listParties: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<Party[]>(`/parties${q}`);
  },
  createParty: (body: {
    name: string;
    phone?: string;
    address?: string;
    firm_name?: string;
    contact_person?: string;
    gst_number?: string;
    opening_balance?: number;
  }) => request<Party>("/parties", { method: "POST", body: JSON.stringify(body) }),
  getParty: (id: string) => request<Party>(`/parties/${id}`),
  updateParty: (id: string, body: Partial<{ name: string; phone: string; address: string; firm_name: string; contact_person: string; gst_number: string }>) =>
    request<Party>(`/parties/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteParty: (id: string) => request<{ ok: boolean }>(`/parties/${id}`, { method: "DELETE" }),

  listTransactions: (partyId: string) =>
    request<Transaction[]>(`/parties/${partyId}/transactions`),
  createTransaction: (body: {
    party_id: string;
    type: "gave" | "got";
    amount: number;
    note?: string;
    date?: string;
  }) => request<Transaction>("/transactions", { method: "POST", body: JSON.stringify(body) }),
  deleteTransaction: (id: string) =>
    request<{ ok: boolean }>(`/transactions/${id}`, { method: "DELETE" }),

  getSummary: () => request<Summary>("/summary"),
  getReminders: () => request<Party[]>("/reminders"),
  monthlyReport: (year: number, month: number) =>
    request<MonthlyReport>(`/report/monthly?year=${year}&month=${month}`),
}
  
  

