import { HAS_BACKEND, authApi, clearToken, getToken, setToken } from "./api";
import { hydrate } from "./store";

// Demo credentials used only when no VITE_API_URL backend is configured.
const DEMO_EMAIL = "admin@pvccards.com";
const DEMO_PASSWORD = "Admin@123";

export function hasSession(): boolean {
  return !!getToken();
}

export async function login(email: string, password: string): Promise<{ mustChange: boolean }> {
  if (!HAS_BACKEND) {
    if (email.trim().toLowerCase() !== DEMO_EMAIL.toLowerCase() || password !== DEMO_PASSWORD) {
      throw new Error("Invalid email or password");
    }
    setToken("demo-token");
    const changed = localStorage.getItem("pvc_demo_pwchanged") === "yes";
    await hydrate();
    return { mustChange: !changed };
  }
  const res = await authApi.login(email, password);
  setToken(res.access_token);
  await hydrate();
  return { mustChange: !!res.must_change_password };
}

export async function changePassword(current: string, next: string): Promise<void> {
  if (!HAS_BACKEND) {
    if (current !== DEMO_PASSWORD) throw new Error("Current password is incorrect");
    if (next.length < 6) throw new Error("New password must be at least 6 characters");
    localStorage.setItem("pvc_demo_pwchanged", "yes");
    return;
  }
  await authApi.changePassword(current, next);
}

export function logout(): void {
  clearToken();
}

export async function restoreSession(): Promise<void> {
  if (hasSession()) await hydrate();
}
