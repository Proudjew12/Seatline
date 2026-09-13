import { useI18n } from "@/shared/i18n/context";
import { Button } from "@/components/ui/Button";
import styles from "@/pages/error/AppErrorPage.module.scss";

export function AppErrorPage() {
  const { t } = useI18n();
  return (
    <div className={styles.page}>
      <section className={styles.content} role="alert">
        <p className={styles.code}>{t("Application error")}</p>
        <h1>{t("Something went wrong")}</h1>
        <p>{t("The page could not be displayed. No changes were made.")}</p>
        <Button onClick={() => window.location.reload()}>{t("Reload the page")}</Button>
      </section>
    </div>
  );
}
