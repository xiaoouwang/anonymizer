import { useUiLocale } from "../context/UiLocaleContext.jsx";

export default function LanguageToggle() {
  const { locale, toggleLocale, t } = useUiLocale();
  const nextIsFrench = locale !== "fr";

  return (
    <button
      type="button"
      className="language-toggle"
      onClick={toggleLocale}
      aria-label={nextIsFrench ? t("languageSwitchToFr") : t("languageSwitchToEn")}
      title={nextIsFrench ? t("languageSwitchToFr") : t("languageSwitchToEn")}
    >
      <span className="language-toggle-flag" aria-hidden="true">
        {nextIsFrench ? "🇫🇷" : "🇬🇧"}
      </span>
      <span className="language-toggle-hint">
        {nextIsFrench ? t("languageToggleHintFr") : t("languageToggleHintEn")}
      </span>
    </button>
  );
}
