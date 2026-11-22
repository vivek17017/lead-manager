
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

import {
  LEAD_STATUSES,
  type Lead,
  type LeadInput,
  type LeadStatus,
  type LeadsResponse,
  type PaginationInfo,
  type SaveLeadResponse,
  type DeleteLeadResponse
} from "../types/lead";

type SortOption =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc";

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, refresh } = useAuth();

  // ---------- LEAD DATA ----------
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] =
    useState<PaginationInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ---------- FILTER STATE ----------
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<LeadStatus | "">("");

  const [sortBy, setSortBy] =
    useState<SortOption>("newest");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Used to trigger a new server request after CRUD actions
  const [reloadKey, setReloadKey] = useState(0);

  // ---------- UI STATE ----------
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] =
    useState<Lead | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [loggingOut, setLoggingOut] = useState(false);

  // ---------- DEBOUNCE SEARCH ----------
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  // ---------- FETCH SERVER-SIDE RESULTS ----------
  const loadLeads = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setLoadError("");

      const params = new URLSearchParams({
        search: debouncedSearch,
        sort: sortBy,
        page: String(page),
        limit: String(pageSize)
      });

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      try {
        const data = await apiRequest<LeadsResponse>(
          `/leads?${params.toString()}`,
          { signal }
        );

        if (signal?.aborted) return;

        setLeads(data.leads);
        setPagination(data.pagination);
      } catch (error) {
        if (signal?.aborted) return;

        setLoadError(getErrorMessage(error));

        if (
          error instanceof ApiError &&
          error.status === 401
        ) {
          void refresh();
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [
      debouncedSearch,
      statusFilter,
      sortBy,
      page,
      pageSize,
      refresh
    ]
  );

  // Fetch whenever filters, page, or reloadKey change
  useEffect(() => {
    const controller = new AbortController();

    void loadLeads(controller.signal);

    return () => controller.abort();
  }, [loadLeads, reloadKey]);

  // ---------- FILTER HANDLERS ----------
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: LeadStatus | "") {
    setStatusFilter(value);
    setPage(1);
  }

  function handleSortChange(value: SortOption) {
    setSortBy(value);
    setPage(1);
  }

  function handlePageSizeChange(value: number) {
    setPageSize(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setSortBy("newest");
    setPage(1);
  }

  const hasFilters =
    search.trim().length > 0 ||
    statusFilter !== "" ||
    sortBy !== "newest";

  // ---------- FORM HANDLERS ----------
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

        setNotice(
          `${result.lead.name} updated successfully.`
        );
      } else {
        const result = await apiRequest<SaveLeadResponse>(
          "/leads",
          {
            method: "POST",
            body: JSON.stringify(data)
          }
        );

        setNotice(
          `${result.lead.name} added successfully.`
        );
      }

      closeForm();

      // Re-fetch the page using current filters and sorting
      setReloadKey((previous) => previous + 1);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 401
      ) {
        void refresh();
      }

      // LeadForm will display the error
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
    setActionError("");
    setNotice("");

    try {
      const result = await apiRequest<DeleteLeadResponse>(
        `/leads/${lead.id}`,
        { method: "DELETE" }
      );

      setNotice(`${lead.name} deleted successfully.`);

      // If the last row on a later page was deleted,
      // move back one page.
      if (leads.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        setReloadKey((previous) => previous + 1);
      }

      // Use the result so TypeScript validates our API contract
      console.info("Deleted lead:", result.id);
    } catch (error) {
      setActionError(getErrorMessage(error));

      if (
        error instanceof ApiError &&
        error.status === 401
      ) {
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
        state: {
          notice: "You have logged out."
        }
      });
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) return null;

  const total = pagination?.total ?? 0;

  const startRecord =
    total === 0 ? 0 : (page - 1) * pageSize + 1;

  const endRecord =
    total === 0 ? 0 : Math.min(page * pageSize, total);

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
                Search and manage your account's leads.
              </p>
            </div>

            {!loading && !loadError && (
              <span className="lead-count">
                {total} matching leads
              </span>
            )}
          </div>

          {/* ---------- SEARCH AND FILTERS ---------- */}
          <div className="filter-bar">
            <div className="filter-field filter-search">
              <label htmlFor="lead-search">
                Search by name
              </label>

              <input
                id="lead-search"
                type="search"
                placeholder="Search leads..."
                value={search}
                maxLength={100}
                onChange={(e) =>
                  handleSearchChange(e.target.value)
                }
              />
            </div>

            <div className="filter-field">
              <label htmlFor="status-filter">
                Status
              </label>

              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) =>
                  handleStatusChange(
                    e.target.value as LeadStatus | ""
                  )
                }
              >
                <option value="">All statuses</option>

                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="sort-by">
                Sort by
              </label>

              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) =>
                  handleSortChange(
                    e.target.value as SortOption
                  )
                }
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name_asc">Name A–Z</option>
                <option value="name_desc">Name Z–A</option>
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="page-size">
                Leads per page
              </label>

              <select
                id="page-size"
                value={pageSize}
                onChange={(e) =>
                  handlePageSizeChange(Number(e.target.value))
                }
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="filter-footer">
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              Clear Filters
            </button>
          </div>

          {/* ---------- RESULTS ---------- */}
          {loading ? (
            <p className="muted" role="status">
              Loading leads...
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
              <h3>
                {hasFilters
                  ? "No matching leads"
                  : "No leads yet"}
              </h3>

              <p className="muted">
                {hasFilters
                  ? "Try changing your search or filters."
                  : "Add your first lead to get started."}
              </p>

              {hasFilters ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={openAddForm}
                >
                  Add First Lead
                </button>
              )}
            </div>
          ) : (
            <>
              <LeadsTable
                leads={leads}
                onEdit={openEditForm}
                onDelete={(lead) =>
                  void handleDeleteLead(lead)
                }
                deletingId={deletingId}
              />

              {/* ---------- PAGINATION ---------- */}
              <div className="pagination-bar">
                <span className="pagination-info">
                  Showing {startRecord}–{endRecord} of {total}
                </span>

                <div className="pagination-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    disabled={
                      loading ||
                      !pagination?.hasPreviousPage
                    }
                    onClick={() =>
                      setPage((previous) =>
                        Math.max(1, previous - 1)
                      )
                    }
                  >
                    Previous
                  </button>

                  <span className="pagination-info">
                    Page {pagination?.page ?? page} of{" "}
                    {pagination?.totalPages ?? 1}
                  </span>

                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    disabled={
                      loading ||
                      !pagination?.hasNextPage
                    }
                    onClick={() =>
                      setPage((previous) => previous + 1)
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
