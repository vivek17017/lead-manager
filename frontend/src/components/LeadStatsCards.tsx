
import type { LeadStats } from "../types/lead";

type LeadStatsCardsProps = {
  stats: LeadStats | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
};

type StatKey = keyof LeadStats;

const STAT_CARDS: {
  key: StatKey;
  label: string;
}[] = [
  { key: "total", label: "Total Leads" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "lost", label: "Lost" }
];

export default function LeadStatsCards({
  stats,
  loading,
  error,
  onRetry
}: LeadStatsCardsProps) {
  return (
    <section
      className="stats-section"
      aria-labelledby="stats-heading"
    >
      <div className="stats-heading">
        <div>
          <h2 id="stats-heading">Lead Overview</h2>

          <p className="muted">
            All leads across your account, regardless
            of the selected filters.
          </p>
        </div>
      </div>

      {loading ? (
        <div
          className="stats-loading"
          role="status"
          aria-live="polite"
        >
          Loading dashboard statistics...
        </div>
      ) : error ? (
        <div className="stats-error">
          <p className="error-banner" role="alert">
            {error}
          </p>

          <button
            type="button"
            className="btn-secondary"
            onClick={onRetry}
          >
            Retry statistics
          </button>
        </div>
      ) : stats ? (
        <div className="stats-grid">
          {STAT_CARDS.map((card) => {
            const value = stats[card.key];

            const percentage =
              stats.total === 0
                ? 0
                : Math.round(
                    (value / stats.total) * 100
                  );

            return (
              <article
                key={card.key}
                className={`stat-card stat-${card.key}`}
              >
                <div className="stat-card-header">
                  <span className="stat-label">
                    {card.label}
                  </span>

                  <span
                    className="stat-indicator"
                    aria-hidden="true"
                  />
                </div>

                <strong className="stat-number">
                  {value.toLocaleString()}
                </strong>

                {card.key === "total" ? (
                  <p className="stat-description">
                    All your sales leads
                  </p>
                ) : (
                  <>
                    <p className="stat-description">
                      {percentage}% of total leads
                    </p>

                    <div
                      className="stat-progress"
                      aria-hidden="true"
                    >
                      <div
                        className="stat-progress-fill"
                        style={{
                          width: `${percentage}%`
                        }}
                      />
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
