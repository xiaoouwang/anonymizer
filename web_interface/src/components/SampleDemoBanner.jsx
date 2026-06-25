import { useUiLocale } from "../context/UiLocaleContext.jsx";

export default function SampleDemoBanner() {
  const { t } = useUiLocale();

  return (
    <section className="demo-banner" aria-label="Sample demo">
      <p>
        <strong>{t("sampleDemoBannerTitle")}</strong> {t("sampleDemoBanner")}
      </p>
    </section>
  );
}
