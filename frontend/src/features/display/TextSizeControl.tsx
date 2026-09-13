import { useContext, useId } from "react";

import { useI18n } from "@/shared/i18n/context";

import { DisplayPreferencesContext } from "./context";
import { isTextSize, TEXT_SIZES } from "./preferences";
import styles from "./TextSizeControl.module.scss";

export function TextSizeControl() {
  const preferences = useContext(DisplayPreferencesContext);
  const { t } = useI18n();
  const id = useId();
  if (!preferences) throw new Error("TextSizeControl requires DisplayPreferencesProvider.");

  return (
    <div className={styles.control}>
      <label htmlFor={id}>{t("Text size")}</label>
      <select id={id} title={t("Text size")} value={preferences.textSize} onChange={(event) => {
        const size = Number(event.target.value);
        if (isTextSize(size)) preferences.changeTextSize(size);
      }}>
        {TEXT_SIZES.map((size) => <option key={size} value={size}>{size}%</option>)}
      </select>
    </div>
  );
}
