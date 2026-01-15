import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import Sales from "./pages/Sales";
import Users from "./pages/Users";
import Login from "./pages/Login";
import { AuthProvider, useAuth } from "./auth/AuthContext";

function Protected({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="p-6 text-muted">Carregando...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <Protected>
              <AppShell>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/pipeline" element={<Pipeline />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/users" element={<Users />} />
                </Routes>
              </AppShell>
            </Protected>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
