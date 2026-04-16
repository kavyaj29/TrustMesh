// API Service for Expense Tracker
// Connects to the FastAPI backend

const API_BASE_URL = 'http://localhost:8001'; // Local backend runs on port 8001 on this machine

export const api = {
  // Parse SMS and save as transaction
  parseSMS: async (sms, category = 'Other', merchant = null, ledger_id = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/parse-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sms, category, merchant, ledger_id }),
      });
      if (!response.ok) {
        const error = await response.json();
        // Extract detailed error message
        const errorMsg = error.detail?.message || error.detail ||
          'Could not extract transaction details. Make sure the SMS contains amount and transaction type.';
        throw new Error(errorMsg);
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Get all transactions
  getTransactions: async (limit = 100, offset = 0) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/transactions?limit=${limit}&offset=${offset}`
      );
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Get spending summary
  getSummary: async (period = 'daily') => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/transactions/summary?period=${period}`
      );
      if (!response.ok) throw new Error('Failed to fetch summary');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Delete a transaction
  deleteTransaction: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete transaction');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Extract entities only (without saving)
  extractEntities: async (sms) => {
    try {
      const response = await fetch(`${API_BASE_URL}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sms }),
      });
      if (!response.ok) throw new Error('Failed to extract entities');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // ============ LEDGER FUNCTIONS ============

  // Create a new ledger
  createLedger: async (name, description = null, icon = '📒', color = '#3B82F6') => {
    try {
      const response = await fetch(`${API_BASE_URL}/ledgers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, icon, color }),
      });
      if (!response.ok) throw new Error('Failed to create ledger');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Get all ledgers
  getLedgers: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ledgers`);
      if (!response.ok) throw new Error('Failed to fetch ledgers');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Get a ledger with transactions
  getLedger: async (ledgerId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ledgers/${ledgerId}`);
      if (!response.ok) throw new Error('Failed to fetch ledger');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Delete a ledger
  deleteLedger: async (ledgerId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ledgers/${ledgerId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete ledger');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Create a manual transaction
  createManualTransaction: async ({ amount, txn_type, txn_date, ledger_id, category, note, account }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, txn_type, txn_date, ledger_id, category, note, account }),
      });
      if (!response.ok) throw new Error('Failed to create transaction');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Get unlinked transactions
  getUnlinkedTransactions: async (limit = 50) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/unlinked?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Link transaction to ledger
  linkTransactionToLedger: async (transactionId, ledgerId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/link-to-ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: transactionId, ledger_id: ledgerId }),
      });
      if (!response.ok) throw new Error('Failed to link transaction');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // ============ CHART FUNCTIONS ============

  // Get chart data for visualizations
  getChartData: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/chart-data`);
      if (!response.ok) throw new Error('Failed to fetch chart data');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // ============ MESH FUNCTIONS (Phase 4) ============

  // Register this device in the mesh
  registerDevice: async (deviceUuid, alias) => {
    try {
      const response = await fetch(`${API_BASE_URL}/mesh/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_uuid: deviceUuid, alias }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to register device');
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Get all registered devices
  getDevices: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/mesh/devices`);
      if (!response.ok) throw new Error('Failed to fetch devices');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Update device location (telemetry)
  updateTelemetry: async (deviceId, latitude, longitude, accuracy = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/mesh/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, latitude, longitude, accuracy }),
      });
      if (!response.ok) throw new Error('Failed to update location');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Get all active device locations
  getMeshLocations: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/mesh/locations`);
      if (!response.ok) throw new Error('Failed to fetch mesh locations');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Auto-verify a transaction
  autoVerify: async (txnId, thresholdMeters = 200) => {
    try {
      const response = await fetch(`${API_BASE_URL}/mesh/auto-verify/${txnId}?threshold_meters=${thresholdMeters}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Failed to verify transaction');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // ============ BUDGET FUNCTIONS ============

  createBudget: async (category, monthlyLimit) => {
    try {
      const response = await fetch(`${API_BASE_URL}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, monthly_limit: monthlyLimit }),
      });
      if (!response.ok) throw new Error('Failed to create budget');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  getBudgets: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/budgets`);
      if (!response.ok) throw new Error('Failed to fetch budgets');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  getBudgetAlerts: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/budgets/alerts`);
      if (!response.ok) throw new Error('Failed to fetch budget alerts');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  deleteBudget: async (budgetId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/budgets/${budgetId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete budget');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // ============ RECURRING FUNCTIONS ============

  detectRecurring: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/recurring/detect`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to detect recurring');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  getRecurring: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/recurring`);
      if (!response.ok) throw new Error('Failed to fetch recurring');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // ============ EXPORT FUNCTIONS ============

  getExportUrl: (format = 'csv', startDate = null, endDate = null) => {
    let url = `${API_BASE_URL}/transactions/export?format=${format}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return url;
  },
};

export default api;

