import { useI18n } from "@/shared/i18n/context";
import { Link } from "react-router-dom";

import styles from "@/pages/not-found/NotFoundPage.module.scss";

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <section className={styles.page}>
      <p className={styles.code}>404</p>
      <h1>{t("Page not found")}</h1>
      <p>{t("The requested route does not exist.")}</p>
      <Link to="/">{t("Return home")}</Link>
    </section>
  );
}
