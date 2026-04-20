// src/utils/api.js
// Centralised API client — all backend calls go through here.

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('compass_token');
}

async function request(method, path, body, isForm = false) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : (body ? JSON.stringify(body) : undefined),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { const err = await res.json(); detail = err.detail || detail; } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => request('POST', '/auth/register', data),
  login: (data) => request('POST', '/auth/login', data),
  me: () => request('GET', '/auth/me'),
};

// ── User / Profile ────────────────────────────────────────────
export const userAPI = {
  updateProfile: (data) => request('PUT', '/users/me', data),
  deleteAccount: () => request('DELETE', '/users/me'),
  uploadCV: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('POST', '/users/me/cv', fd, true);
  },
  saveJob: (jobId) => request('POST', '/users/me/save-job', { job_id: jobId }),
  unsaveJob: (jobId) => request('DELETE', `/users/me/save-job/${jobId}`),
  applyJob: (jobId, coverLetter) => request('POST', '/users/me/apply', { job_id: jobId, cover_letter: coverLetter }),
};

// ── Recommender ────────────────────────────────────────────────
export const recommenderAPI = {
  recommend: (skills, topN = 5) => request('POST', '/recommend', { skills, top_n: topN }),
  missingSkills: (skills, domain, topN = 8) => request('POST', '/missing-skills', { skills, domain, top_n: topN }),
  domains: () => request('GET', '/domains'),
  parseText: (text) => request('POST', '/parse-text', { text }),
  parseCV: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('POST', '/parse-cv', fd, true);
  },
};
