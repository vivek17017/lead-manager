
import type { Lead } from "../types/lead";

type LeadsTableProps = {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  deletingId: string | null;
};

export default function LeadsTable({
  leads,
  onEdit,
  onDelete,
  deletingId
}: LeadsTableProps) {
  return (
    <div className="lead-table-scroll">
      <table className="leads-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Contact</th>
            <th>Source</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>
                <strong>{lead.name}</strong>
              </td>

              <td>{lead.company}</td>

              <td>
                <div className="contact-cell">
                  <a href={`mailto:${lead.email}`}>
                    {lead.email}
                  </a>

                  <a href={`tel:${lead.phone}`}>
                    {lead.phone}
                  </a>
                </div>
              </td>

              <td>{lead.source}</td>

              <td>
                <span
                  className={
                    `status-badge status-${lead.status.toLowerCase()}`
                  }
                >
                  {lead.status}
                </span>
              </td>

              <td>
                <time dateTime={lead.created_at}>
                  {new Date(
                    lead.created_at
                  ).toLocaleDateString()}
                </time>
              </td>

              <td>
                <div className="table-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    disabled={deletingId !== null}
                    onClick={() => onEdit(lead)}
                    aria-label={`Edit ${lead.name}`}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="btn-danger btn-small"
                    disabled={deletingId !== null}
                    onClick={() => onDelete(lead)}
                    aria-label={`Delete ${lead.name}`}
                  >
                    {deletingId === lead.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
