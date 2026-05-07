// src/utils/api.js
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
  login:    (data) => request('POST', '/auth/login', data),
  me:       ()     => request('GET',  '/auth/me'),
};

// ── User / Profile ────────────────────────────────────────────
export const userAPI = {
  updateProfile: (data)  => request('PUT',    '/users/me', data),
  deleteAccount: ()      => request('DELETE', '/users/me'),
  uploadCV: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('POST', '/users/me/cv', fd, true);
  },
  saveJob:   (jobId)               => request('POST',   '/users/me/save-job', { job_id: String(jobId) }),
  unsaveJob: (jobId)               => request('DELETE', `/users/me/save-job/${jobId}`),
  applyJob: (jobId, coverLetter, autoGenerate = false) =>
    request('POST', '/users/me/apply', {
      job_id: String(jobId),
      cover_letter: coverLetter || '',
      auto_generate: autoGenerate,
    }),
};

// ── Jobs Browse ────────────────────────────────────────────────
export const jobsAPI = {
  list: ({ search = '', domain = '', freshness = '', page = 1, perPage = 20, semanticQuery = '' } = {}) => {
    const params = new URLSearchParams();
    if (search)        params.set('search',        search);
    if (domain)        params.set('domain',         domain);
    if (freshness)     params.set('freshness',      freshness);
    if (semanticQuery) params.set('semantic_query', semanticQuery);
    params.set('page',     String(page));
    params.set('per_page', String(perPage));
    return request('GET', `/jobs?${params}`);
  },
  get: (id) => request('GET', `/jobs/${id}`),
};

// ── Cover Letter ───────────────────────────────────────────────
export const coverLetterAPI = {
  generate: (jobId, userSkills = null) =>
    request('POST', '/cover-letter/generate', {
      job_id: String(jobId),
      user_skills: userSkills,
    }),

  // Returns an EventSource for streaming
  stream: (jobId, userSkills = null) => {
    const token = getToken();
    // POST body via fetch + ReadableStream
    return fetch(`${BASE}/cover-letter/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ job_id: String(jobId), user_skills: userSkills }),
    });
  },
};

// ── Recommender ────────────────────────────────────────────────
export const recommenderAPI = {
  recommend: (skills, topN = 6, extra = {}) =>
    request('POST', '/recommend', { skills, top_n: topN, ...extra }),
  missingSkills: (skills, domain, topN = 10)  => request('POST', '/missing-skills', { skills, domain, top_n: topN }),
  domains:       ()                           => request('GET',  '/domains'),
  parseText: (text) => request('POST', '/parse-text', { text }),
  parseCV: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('POST', '/parse-cv', fd, true);
  },
};

// ── Stats ──────────────────────────────────────────────────────
export const statsAPI = {
  market: () => request('GET', '/stats/market'),
};
