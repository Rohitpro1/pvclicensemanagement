import axios from "axios";

// ============================================================
// Axios API layer — talks to the FastAPI backend.
// Configure the backend URL via VITE_API_URL (see .env.example).
// When VITE_API_URL is empty the app runs in offline demo mode.
// ============================================================

export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const HAS_BACKEND = !!API_URL;

const TOKEN_KEY = "pvc_jwt_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export const http = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on token expiry / 401
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearToken();
      window.dispatchEvent(new CustomEvent("pvc:unauthorized"));
    }
    return Promise.reject(err);
  },
);

const unwrap = (p) => p.then((r) => r.data);

export const authApi = {
  login: (email, password) => unwrap(http.post("/auth/login", { email, password })),
  changePassword: (current_password, new_password) =>
    unwrap(http.post("/auth/change-password", { current_password, new_password })),
  me: () => unwrap(http.get("/auth/me")),
};

export const dbApi = {
  get: () => unwrap(http.get("/db")),
};

export const licensesApi = {
  create: (payload) => unwrap(http.post("/licenses", payload)),
  update: (id, payload) => unwrap(http.put(`/licenses/${id}`, payload)),
  remove: (id) => unwrap(http.delete(`/licenses/${id}`)),
  renew: (id, days) => unwrap(http.post(`/licenses/${id}/renew`, { days })),
  setStatus: (id, status) => unwrap(http.post(`/licenses/${id}/status`, { status })),
  resetDevices: (id) => unwrap(http.post(`/licenses/${id}/reset-devices`)),
};

export const customersApi = {
  create: (payload) => unwrap(http.post("/customers", payload)),
  update: (id, payload) => unwrap(http.put(`/customers/${id}`, payload)),
  remove: (id) => unwrap(http.delete(`/customers/${id}`)),
};

export const plansApi = {
  create: (payload) => unwrap(http.post("/plans", payload)),
  update: (id, payload) => unwrap(http.put(`/plans/${id}`, payload)),
  remove: (id) => unwrap(http.delete(`/plans/${id}`)),
};

export const deviceApi = {
  activate: (license_key, machine_id, machine_name, software_version) =>
    unwrap(http.post("/activate", { license_key, machine_id, machine_name, software_version })),
  validate: (license_key, machine_id) => unwrap(http.post("/validate", { license_key, machine_id })),
  heartbeat: (license_key, machine_id, software_version) =>
    unwrap(http.post("/heartbeat", { license_key, machine_id, software_version })),
  usage: (license_key, machine_id, event_type, event_count) =>
    unwrap(http.post("/usage", { license_key, machine_id, event_type, event_count })),
};

export const settingsApi = {
  get: () => unwrap(http.get("/settings")),
  update: (data) => unwrap(http.put("/settings", { data })),
};

export const adminApi = {
  reset: () => unwrap(http.post("/admin/reset")),
};
