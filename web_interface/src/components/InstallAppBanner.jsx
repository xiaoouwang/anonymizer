import { useInstallPrompt } from "../hooks/useInstallPrompt.js";
import { useUiLocale } from "../context/UiLocaleContext.jsx";

export default function InstallAppBanner() {
  const { canInstall, installed, install } = useInstallPrompt();
  const { t } = useUiLocale();

  if (installed) {
    return null;
  }

  if (canInstall) {
    return (
      <section className="install-banner" aria-label="Install Incognito as an app">
        <div>
          <strong>{t("installTitle")}</strong>
          <p>{t("installBody")}</p>
        </div>
        <button type="button" className="install-banner-button" onClick={() => install()}>
          {t("installButton")}
        </button>
      </section>
    );
  }

  return (
    <section className="install-banner install-banner-hint" aria-label="Install Incognito as an app">
      <div>
        <strong>{t("installHintTitle")}</strong>
        <p>{t("installHintBody")}</p>
      </div>
    </section>
  );
}
