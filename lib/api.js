'use client';

import axios from 'axios';
import Cookies from 'js-cookie';

// All requests go to /api/* — Next.js proxies them to the backend (next.config.mjs rewrites).
// Backend URL is configured via BACKEND_URL in .env.local (server-side only, never exposed to browser).
const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('gym_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('gym_token');
      Cookies.remove('gym_role');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (phone, pin) => api.post('/public/login', { phone, pin }),
  register: (data) => api.post('/public/register-gym', data),
  submitCredentials: (data) => api.post('/public/submit-credentials', data),
};

// ── Admin (X-Admin-Key required — set per-call via headers) ─────────────────
export const adminApi = {
  globalHealth: () =>
    api.get('/admin/global-health', { headers: adminHeaders() }),

  listGyms: () =>
    api.get('/admin/gyms', { headers: adminHeaders() }),

  gymDeepHealth: (gymId) =>
    api.get(`/admin/gym/${gymId}/deep-health`, { headers: adminHeaders() }),

  updateSubscription: (gymId, data) =>
    api.patch(`/admin/gym/${gymId}/subscription`, data, { headers: adminHeaders() }),

  forecast: (gymId) =>
    api.get(`/admin/gym/${gymId}/forecast`, { headers: adminHeaders() }),

  ltvReport: (gymId) =>
    api.get(`/admin/gym/${gymId}/ltv-report`, { headers: adminHeaders() }),

  planReport: (gymId) =>
    api.get(`/admin/gym/${gymId}/plan-report`, { headers: adminHeaders() }),

  recoveryStats: (gymId) =>
    api.get(`/admin/gym/${gymId}/recovery-stats`, { headers: adminHeaders() }),

  reactivationStats: (gymId) =>
    api.get(`/admin/gym/${gymId}/reactivation-stats`, { headers: adminHeaders() }),

  leadStats: (gymId) =>
    api.get(`/admin/gym/${gymId}/lead-stats`, { headers: adminHeaders() }),
};

function adminHeaders() {
  const key = Cookies.get('admin_key') || '';
  return { 'X-Admin-Key': key };
}

// ── Owner ────────────────────────────────────────────────────────────────────
export const memberApi = {
  list:    (params) => api.get('/owner/members', { params }),
  summary: ()       => api.get('/owner/members/summary'),
  atRisk:  ()       => api.get('/owner/members/at-risk'),
  get:     (id)     => api.get(`/owner/members/${id}`),
  create:  (data)   => api.post('/owner/members', data),
  update:  (id, data) => api.patch(`/owner/members/${id}`, data),
  remove:  (id)     => api.delete(`/owner/members/${id}`),
  setEnrollment: (memberId, enrollmentId) =>
    api.patch(`/owner/members/${memberId}/enrollment`, { enrollment_id: enrollmentId }),
};

export const planApi = {
  list:    (params) => api.get('/owner/plans', { params }),
  summary: ()       => api.get('/owner/plans/summary'),
  create:  (data)   => api.post('/owner/plans', data),
  update:  (id, data) => api.patch(`/owner/plans/${id}`, data),
  remove:  (id)     => api.delete(`/owner/plans/${id}`),
};

export const invoiceApi = {
  summary:  ()          => api.get('/owner/invoices/summary'),
  list:     (params)    => api.get('/owner/invoices', { params }),
  download: (renewalId) => api.get(`/owner/invoices/${renewalId}/download`, { responseType: 'blob' }),
};

export const renewalApi = {
  list: (params) => api.get('/owner/renewals', { params }),
};

export const leadApi = {
  create: (data) => api.post('/owner/leads', data),
  list: (params) => api.get('/owner/leads', { params }),
  funnel: () => api.get('/owner/leads/funnel'),
  updateStage: (leadId, data) => api.patch(`/owner/leads/${leadId}/stage`, data),
};

export const ownerApi = {
  health: () => api.get('/owner/health'),
  sync: () => api.post('/owner/sync'),
  updateCredentials: (data) => api.patch('/owner/credentials', data),
};

export const ownerAnalyticsApi = {
  forecast: (days = 30) => api.get('/owner/analytics/forecast', { params: { days } }),
  ltvReport: () => api.get('/owner/analytics/ltv'),
  planReport: () => api.get('/owner/analytics/plans'),
};

export default api;
