import { useUiLocale } from "../context/UiLocaleContext.jsx";

export default function AuditReportWindow({ report, onClose, onCopy, onDownload }) {
  const { t } = useUiLocale();

  return (
    <div className="report-backdrop" role="presentation">
      <section className="report-window" role="dialog" aria-modal="true" aria-label="Audit report">
        <div className="report-header">
          <div>
            <p className="eyebrow">{t("auditEyebrow")}</p>
            <h2>{t("auditTitle")}</h2>
          </div>
          <div className="report-actions">
            <button onClick={onCopy}>{t("auditCopy")}</button>
            <button onClick={onDownload}>{t("auditDownload")}</button>
            <button className="secondary" onClick={onClose}>
              {t("close")}
            </button>
          </div>
        </div>
        <pre className="report-body">{report}</pre>
      </section>
    </div>
  );
}
