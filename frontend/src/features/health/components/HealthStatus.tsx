import { useI18n } from "@/shared/i18n/context";
import { Button } from "@/components/ui/Button";
import styles from "@/features/health/components/HealthStatus.module.scss";
import { useHealth } from "@/features/health/hooks/useHealth";
import { classNames } from "@/shared/utils/classNames";

export function HealthStatus() {
  const { t } = useI18n();
  const health = useHealth();

  if (health.status === "unconfigured") {
    return (
      <section className={styles.card} aria-live="polite">
        <span className={classNames(styles.indicator, styles.inactive)} aria-hidden="true" />
        <div>
          <h2 className={styles.title}>{t("API not configured")}</h2>
          <p className={styles.description}>
            {t("The application is available, but its API connection has not been configured.")}
          </p>
        </div>
      </section>
    );
  }

  if (health.status === "loading") {
    return (
      <section className={styles.card} aria-live="polite" aria-busy="true">
        <span className={styles.indicator} aria-hidden="true" />
        <div>
          <h2 className={styles.title}>{t("Checking the API")}</h2>
          <p className={styles.description}>{t("The web app is waiting for the service response.")}</p>
        </div>
      </section>
    );
  }

  if (health.status === "error") {
    return (
      <section className={styles.card} role="alert">
        <span className={classNames(styles.indicator, styles.error)} aria-hidden="true" />
        <div className={styles.content}>
          <h2 className={styles.title}>{t("API unavailable")}</h2>
          <p className={styles.description}>{t(health.message)}</p>
          <Button variant="secondary" onClick={health.refresh}>
            {t("Try again")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card} aria-live="polite">
      <span className={classNames(styles.indicator, styles.success)} aria-hidden="true" />
      <div>
        <h2 className={styles.title}>{t("API connected")}</h2>
        <p className={styles.description}>
          {t("{service} version {version} responded successfully.", { service: health.data.service, version: health.data.version })}
        </p>
      </div>
    </section>
  );
}
