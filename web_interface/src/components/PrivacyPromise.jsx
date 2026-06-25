import { useUiLocale } from "../context/UiLocaleContext.jsx";

export function PrivacyDetailsLink({ onOpen }) {
  const { t } = useUiLocale();

  return (
    <button type="button" className="privacy-details-link" onClick={onOpen}>
      {t("privacyDetailsLink")}
    </button>
  );
}

export function PrivacyPromise({ onOpenDetails, className = "privacy-promise" }) {
  const { t } = useUiLocale();

  return (
    <p className={className}>
      {t("privacyPromise")}{" "}
      <PrivacyDetailsLink onOpen={onOpenDetails} />
    </p>
  );
}
