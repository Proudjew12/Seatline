import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/shared/i18n/context";

import styles from "./ThemePreview.module.scss";

interface ThemePreviewProps { palette: string; }

// A small, non-interactive version of the workspace, using the actual theme tokens.
export function ThemePreview({ palette }: ThemePreviewProps) {
  const { t, dir } = useI18n();
  return (
    <span className={styles.preview} data-theme={palette} dir={dir} aria-hidden="true">
      <span className={styles.frame}>
        <span className={styles.header} dir="ltr">Seatline<Icon name="settings" size={11} /></span>
        <span className={styles.body}>
          <span className={styles.rail}><span className={styles.active}><Icon name="grid" size={12} /></span><Icon name="monitor" size={11} /><Icon name="documentPlus" size={11} /></span>
          <span className={styles.catalog}>
            <strong dir="ltr">Microsoft 365</strong>
            <span className={styles.search}><Icon name="search" size={9} /><span /></span>
            {["Business Basic", "Business Standard", "Business Premium"].map((name) => <span className={styles.license} key={name} dir="ltr">{name}<span className={styles.lines}><i /><i /><i /></span></span>)}
          </span>
          <span className={styles.quote}>
            <span className={styles.details}><span /><span /></span>
            <span className={styles.item}>
              <strong dir="ltr">Business Basic</strong>
              <span className={styles.billing} />
              <span className={styles.fields}><span>1</span><span>$25</span><span>17%</span></span>
              <span className={styles.total} dir="ltr"><span>$25 × 17% =</span><b>$4.25</b></span>
            </span>
            <span className={styles.notes}><i /><i /></span>
            <span className={styles.action}>{t("Export PDF")}</span>
          </span>
        </span>
      </span>
    </span>
  );
}
