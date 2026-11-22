
import { useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      await logout();

      navigate("/login", {
        replace: true,
        state: { notice: "You have logged out." }
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to log out. Please try again."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) return null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Lead Manager</div>

        <button
          type="button"
          className="btn-secondary"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </header>

      <main className="dashboard-content">
        <h1>Welcome, {user.name}!</h1>

        <p className="muted">
          Your sales workspace is ready.
        </p>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <section className="panel">
          <h2>Your account</h2>
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
        </section>

        <section className="panel">
          <h2>Lead management</h2>
          <p className="muted">
            Your lead table, forms, editing, and deletion
            will be added in Step 7.
          </p>
        </section>
      </main>
    </div>
  );
}
