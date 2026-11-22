
import { Navigate, Outlet } from "react-router";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute() {
  const { status, error, refresh } = useAuth();

  if (status === "loading") {
    return (
      <main className="center-screen">
        <p>Checking your session...</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="center-screen">
        <div className="auth-card">
          <h2>Unable to verify your session</h2>

          <p className="error-banner" role="alert">
            {error}
          </p>

          <button
            className="btn-primary"
            onClick={() => void refresh()}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
