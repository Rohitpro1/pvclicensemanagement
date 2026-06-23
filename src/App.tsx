import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider, useStore } from "./lib/store";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Licenses from "./pages/Licenses";
import Activations from "./pages/Activations";
import Customers from "./pages/Customers";
import Analytics from "./pages/Analytics";
import Plans from "./pages/Plans";
import ApiDocs from "./pages/ApiDocs";
import Deployment from "./pages/Deployment";
import Settings from "./pages/Settings";

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Public({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Public><Login /></Public>} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/licenses"    element={<Licenses />} />
            <Route path="/activations" element={<Activations />} />
            <Route path="/customers"   element={<Customers />} />
            <Route path="/analytics"   element={<Analytics />} />
            <Route path="/plans"       element={<Plans />} />
            <Route path="/api-docs"    element={<ApiDocs />} />
            <Route path="/deployment"  element={<Deployment />} />
            <Route path="/settings"    element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
