export const API_URL: string;
export const HAS_BACKEND: boolean;

export function getToken(): string | null;
export function setToken(token: string | null): void;
export function clearToken(): void;

export const http: import("axios").AxiosInstance;

export interface LoginResponse {
  access_token: string;
  token_type: string;
  must_change_password: boolean;
  user: any;
}

export const authApi: {
  login: (email: string, password: string) => Promise<LoginResponse>;
  changePassword: (current_password: string, new_password: string) => Promise<any>;
  me: () => Promise<any>;
};

export const dbApi: { get: () => Promise<any> };

export const licensesApi: {
  create: (payload: any) => Promise<any>;
  update: (id: string, payload: any) => Promise<any>;
  remove: (id: string) => Promise<any>;
  renew: (id: string, days: number) => Promise<any>;
  setStatus: (id: string, status: string) => Promise<any>;
  resetDevices: (id: string) => Promise<any>;
};

export const customersApi: {
  create: (payload: any) => Promise<any>;
  update: (id: string, payload: any) => Promise<any>;
  remove: (id: string) => Promise<any>;
};

export const plansApi: {
  create: (payload: any) => Promise<any>;
  update: (id: string, payload: any) => Promise<any>;
  remove: (id: string) => Promise<any>;
};

export const deviceApi: {
  activate: (license_key: string, machine_id: string, machine_name: string, software_version: string) => Promise<any>;
  validate: (license_key: string, machine_id: string) => Promise<any>;
  heartbeat: (license_key: string, machine_id: string, software_version: string) => Promise<any>;
  usage: (license_key: string, machine_id: string, event_type: string, event_count: number) => Promise<any>;
};

export const settingsApi: { get: () => Promise<any>; update: (data: any) => Promise<any> };

export const adminApi: { reset: () => Promise<any> };

export const updatesApi: {
  list: () => Promise<any>;
  create: (payload: any) => Promise<any>;
  update: (id: string, payload: any) => Promise<any>;
  remove: (id: string) => Promise<any>;
  publish: (id: string) => Promise<any>;
  archive: (id: string) => Promise<any>;
};
