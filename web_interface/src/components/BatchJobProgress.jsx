const PHASE_LABELS = {
  loading: "Loading documents",
  detecting: "Detecting entities in batch",
};

export default function BatchJobProgress({ progress }) {
  if (!progress) {
    return null;
  }

  const total = progress.total || 0;
  const completed = progress.current || 0;
  const percent = total > 0 ? Math.min(100, (completed / total) * 100) : null;
  const isIndeterminate = percent === null;
  const isWorking = total > 0 && completed < total;
  const activeFileNumber = Math.min(completed + 1, total);
  const showIndeterminate = isIndeterminate || (isWorking && percent === 0);
  const title = PHASE_LABELS[progress.phase] || "Processing batch";

  return (
    <section className="panel model-progress-panel batch-job-progress-panel" aria-live="polite" aria-busy="true">
      <div className="model-progress-summary">
        <div className="model-progress-summary-header">
          <div>
            <h2>{title}</h2>
            <p className="model-progress-summary-note">
              {progress.fileName && isWorking
                ? `Processing: ${progress.fileName}`
                : progress.fileName
                  ? `Finished: ${progress.fileName}`
                  : "Preparing your selected documents…"}
            </p>
          </div>
          <div className="model-progress-overall-value" aria-hidden="true">
            {isIndeterminate ? "…" : `${Math.round(percent)}%`}
          </div>
        </div>

        <div
          className={`model-progress-bar-track model-progress-bar-track-lg${
            showIndeterminate ? " is-indeterminate" : ""
          }`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={isIndeterminate ? undefined : Math.round(percent)}
          aria-label={`${title} progress`}
        >
          {showIndeterminate ? (
            <div className="model-progress-bar-indeterminate" />
          ) : (
            <div
              className="model-progress-bar-fill"
              style={{ width: `${Math.max(2, percent)}%` }}
            />
          )}
        </div>

        {total > 0 ? (
          <p className="batch-job-progress-count">
            {isWorking
              ? `Processing file ${activeFileNumber} of ${total}`
              : `Completed ${total} of ${total}`}
          </p>
        ) : null}
      </div>
    </section>
  );
}
