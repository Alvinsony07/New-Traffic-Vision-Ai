/**
 * Traffic Vision AI — API Client
 * Wraps fetch with JWT token management for the FastAPI backend.
 */

const API_BASE = '/api';

// ── Token Storage ──
export function getToken() {
    return localStorage.getItem('tv_token');
}

export function setToken(token) {
    localStorage.setItem('tv_token', token);
}

export function clearToken() {
    localStorage.removeItem('tv_token');
}

export function isAuthenticated() {
    return !!getToken();
}

// ── Core Fetch Wrapper ──
async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    // Auto-logout on 401
    if (res.status === 401) {
        clearToken();
        window.location.href = '/login';
        throw new Error('Session expired');
    }

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `API Error ${res.status}`);
    }

    // Handle CSV / non-JSON responses
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/csv')) {
        return res.blob();
    }

    return res.json();
}

// ── Auth ──
export const auth = {
    login: (username, password) =>
        request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),

    register: (data) =>
        request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    me: () => request('/auth/me'),
};

// ── Dashboard ──
export const dashboard = {
    status: () => request('/status'),
    override: (lane_id) =>
        request('/override', {
            method: 'POST',
            body: JSON.stringify({ lane_id }),
        }),
    setupStreams: (formData) => {
        const token = getToken();
        return fetch(`${API_BASE}/setup_streams`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData, // do NOT stringify FormData
        }).then(res => {
            if (!res.ok) throw new Error('Failed to setup streams');
            return res.json();
        });
    }
};

// ── Analytics ──
export const analytics = {
    stats: () => request('/stats'),
    reportsData: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/reports_data?${qs}`);
    },
    exportCsv: () => request('/export_stats'),
    predictions: () => request('/predictions'),
    cityMap: () => request('/city_map_data'),
};

// ── Dispatch ──
export const dispatch = {
    create: (data) =>
        request('/dispatch', { method: 'POST', body: JSON.stringify(data) }),
    active: () => request('/dispatch/active'),
    accept: (id) => request(`/dispatch/${id}/accept`, { method: 'POST' }),
    decline: (id) => request(`/dispatch/${id}/decline`, { method: 'POST' }),
    updateStatus: (id, status) =>
        request(`/dispatch/${id}/status`, {
            method: 'POST',
            body: JSON.stringify({ status }),
        }),
};

// ── Reports ──
export const reports = {
    list: () => request('/reports'),
    create: (data) =>
        request('/reports', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Settings ──
export const settingsApi = {
    get: () => request('/settings'),
    update: (data) =>
        request('/settings', { method: 'POST', body: JSON.stringify(data) }),
    auditTrail: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/audit_trail?${qs}`);
    },
    purgeData: () => request('/purge_data', { method: 'POST' }),
};

// ── Health ──
export const health = () => request('/health');
