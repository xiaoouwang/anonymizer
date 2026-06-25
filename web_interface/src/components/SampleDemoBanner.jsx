export default function SampleDemoBanner({ onRestore }) {
  return (
    <section className="demo-banner" aria-label="Sample demo">
      <p>
        <strong>Sample demo loaded.</strong> This interview is already annotated so you can explore
        category toggles, exclusions, manual edits, and exports — no model download needed yet.
        Paste your own text or click <strong>Run Anonymization</strong> when you are ready (first
        run downloads the detection model).
      </p>
      {onRestore ? (
        <button type="button" className="demo-banner-button secondary" onClick={onRestore}>
          Restore sample demo
        </button>
      ) : null}
    </section>
  );
}
