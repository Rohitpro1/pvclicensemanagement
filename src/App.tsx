import { useEffect, useState } from "react";
import { Layout, type Page } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Licenses } from "./pages/Licenses";
import { Activations } from "./pages/Activations";
import { Customers } from "./pages/Customers";
import { Analytics } from "./pages/Analytics";
import { Plans } from "./pages/Plans";
import { Simulator } from "./pages/Simulator";
import { Settings } from "./pages/Settings";
import { hasSession, logout, restoreSession } from "./lib/session";

export default function App() {
  const [authed, setAuthed] = useState(() => hasSession());
  const [page, setPage] = useState<Page>("dashboard");

  // Restore data when a JWT session already exists (e.g. after refresh)
  useEffect(() => {
    if (authed) restoreSession();
  }, [authed]);

  // Auto-logout when the API reports an expired / invalid token
  useEffect(() => {
    const handler = () => setAuthed(false);
    window.addEventListener("pvc:unauthorized", handler);
    return () => window.removeEventListener("pvc:unauthorized", handler);
  }, []);

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />;
  }

  return (
    <Layout
      page={page}
      setPage={setPage}
      onLogout={() => {
        logout();
        setAuthed(false);
      }}
    >
      {page === "dashboard" && <Dashboard go={setPage} />}
      {page === "licenses" && <Licenses />}
      {page === "activations" && <Activations />}
      {page === "customers" && <Customers />}
      {page === "analytics" && <Analytics />}
      {page === "plans" && <Plans />}
      {page === "simulator" && <Simulator />}
      {page === "settings" && <Settings />}
    </Layout>
  );
}
