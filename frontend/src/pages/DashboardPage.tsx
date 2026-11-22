
import {
  useCallback,
  useEffect,
  useState
} from "react";

import { useNavigate } from "react-router";

import { apiRequest, ApiError } from "../api";
import { useAuth } from "../auth/AuthContext";

import LeadForm from "../components/LeadForm";
import LeadsTable from "../components/LeadsTable";

import type {
  Lead,
  LeadInput,
  LeadsResponse,
  SaveLeadResponse,
  DeleteLeadResponse
} from "../types/lead";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, refresh } = useAuth();

  // Lead data and fetch status
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // UI feedback
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Action loading states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // ---------- LOAD LEADS ----------

  const loadLeads = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError("");

    try {
      const data = await apiRequest<LeadsResponse>(
        "/leads",
        { signal }
      );

      if (signal?.aborted) return;

      setLeads(data.leads);
    } catch (error) {
      if (signal?.aborted) return;

      setLoadError(getErrorMessage(error));

      if (error instanceof ApiError && error.status === 401) {
        void refresh();
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [refresh]);

  useEffect(() => {
    const controller = new AbortController();

    void loadLeads(controller.signal);

    return () => controller.abort();
  }, [loadLeads]);

  // ---------- OPEN FORMS ----------

  function openAddForm() {
    setEditingLead(null);
    setShowForm(true);
    setNotice("");
    setActionError("");
  }

  function openEditForm(lead: Lead) {
    setEditingLead(lead);
    setShowForm(true);
    setNotice("");
    setActionError("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingLead(null);
  }

  // ---------- CREATE / UPDATE ----------

  async function handleSaveLead(data: LeadInput): Promise<void> {
    setNotice("");
    setActionError("");

    try {
      if (editingLead) {
        const result = await apiRequest<SaveLeadResponse>(
          `/leads/${editingLead.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(data)
          }
        );

        setLeads((previous) =>
          previous.map((lead) =>
            lead.id === result.lead.id
              ? result.lead
              : lead
          )
        );

        setNotice(`${result.lead.name} updated successfully.`);
      } else {
        const result = await apiRequest<SaveLeadResponse>(
          "/leads",
          {
            method: "POST",
            body: JSON.stringify(data)
          }
        );

        setLeads((previous) => [
          result.lead,
          ...previous
        ]);

        setNotice(`${result.lead.name} added successfully.`);
      }

      closeForm();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        void refresh();
      }

      // LeadForm will display the error and keep the data
      throw error;
    }
  }

  // ---------- DELETE ----------

  async function handleDeleteLead(lead: Lead) {
    if (deletingId !== null) return;

    const confirmed = window.confirm(
      `Delete "${lead.name}" from ${lead.company}?\n\n` +
      "This action cannot be undone."
    );

    if (!confirmed) return;

    setDeletingId(lead.id);
    setNotice("");
    setActionError("");

    try {
      const result = await apiRequest<DeleteLeadResponse>(
        `/leads/${lead.id}`,
        { method: "DELETE" }
      );

      setLeads((previous) =>
        previous.filter((item) => item.id !== result.id)
      );

      setNotice(`${lead.name} deleted successfully.`);
    } catch (error) {
      setActionError(getErrorMessage(error));

      if (error instanceof ApiError && error.status === 401) {
        void refresh();
      }
    } finally {
      setDeletingId(null);
    }
  }

  // ---------- LOGOUT ----------

  async function handleLogout() {
    setLoggingOut(true);
    setActionError("");

    try {
      await logout();

      navigate("/login", {
        replace: true,
        state: { notice: "You have logged out." }
      });
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) return null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Lead Manager</div>

        <div className="topbar-actions">
          <span className="user-greeting">
            {user.name}
          </span>

          <button
            type="button"
            className="btn-secondary"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-heading">
          <div>
            <h1>Your Leads</h1>

            <p className="muted">
              Capture, organize, and track potential customers.
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={openAddForm}
          >
            + Add Lead
          </button>
        </div>

        {notice && (
          <div className="success-banner" role="status">
            {notice}
          </div>
        )}

        {actionError && (
          <div className="error-banner" role="alert">
            {actionError}
          </div>
        )}

        {showForm && (
          <LeadForm
            key={editingLead?.id ?? "new"}
            lead={editingLead}
            onSave={handleSaveLead}
            onCancel={closeForm}
          />
        )}

        <section className="panel leads-section">
          <div className="section-heading">
            <div>
              <h2>All Leads</h2>
              <p className="muted">
                Only leads belonging to your account.
              </p>
            </div>

            {!loading && !loadError && (
              <span className="lead-count">
                {leads.length} leads
              </span>
            )}
          </div>

          {loading ? (
            <p className="muted" role="status">
              Loading your leads...
            </p>
          ) : loadError ? (
            <div>
              <p className="error-banner" role="alert">
                {loadError}
              </p>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => void loadLeads()}
              >
                Retry
              </button>
            </div>
          ) : leads.length === 0 ? (
            <div className="empty-state">
              <h3>No leads yet</h3>

              <p className="muted">
                Add your first lead to start tracking
                potential customers.
              </p>

              <button
                type="button"
                className="btn-primary"
                onClick={openAddForm}
              >
                Add First Lead
              </button>
            </div>
          ) : (
            <LeadsTable
              leads={leads}
              onEdit={openEditForm}
              onDelete={(lead) => void handleDeleteLead(lead)}
              deletingId={deletingId}
            />
          )}
        </section>
      </main>
    </div>
  );
}
