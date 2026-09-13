import { useContext, useId, useLayoutEffect, useRef } from "react";

import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/shared/i18n/context";

import { DisplayPreferencesContext } from "./context";
import { THEME_GROUPS, THEMES } from "./themes";
import { ThemePreview } from "./ThemePreview";
import styles from "./ThemeGallery.module.scss";

interface ThemeGalleryProps { onClose: () => void; }

export function ThemeGallery({ onClose }: ThemeGalleryProps) {
  const preferences = useContext(DisplayPreferencesContext);
  const { t, dir } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const selectedButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useLayoutEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element?.showModal();
    selectedButton.current?.focus({ preventScroll: true });
    selectedButton.current?.scrollIntoView({ block: "nearest" });
    return () => {
      element?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  if (!preferences) throw new Error("ThemeGallery requires DisplayPreferencesProvider.");

  return (
    <dialog ref={dialog} dir={dir} className={styles.dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
      <header className={styles.header}>
        <div><h2 id={titleId}>{t("Choose your theme")}</h2><p id={descriptionId}>{t("A workspace that feels like you.")}</p></div>
        <button type="button" className={styles.close} aria-label={t("Close theme gallery")} onClick={onClose}><Icon name="close" /></button>
      </header>
      <div className={styles.choices}>
        {THEME_GROUPS.map((group) => (
          <section key={group.id} className={`${styles.group} ${group.id === "default" ? styles.defaultGroup : ""}`}
            aria-labelledby={`${titleId}-${group.id}`}>
            <h3 className={styles.groupHeading} id={`${titleId}-${group.id}`}>{t(group.name)}</h3>
            <div className={styles.grid}>
              {THEMES.filter((theme) => theme.group === group.id).map((theme) => {
                const selected = preferences.themeId === theme.id;
                return (
                  <button type="button" className={styles.card} key={theme.id} ref={selected ? selectedButton : undefined}
                    aria-label={t(theme.name)} aria-pressed={selected} aria-describedby={`${descriptionId}-${theme.id}`}
                    onClick={() => preferences.changeThemeId(theme.id)}>
                    <ThemePreview palette={theme.id === "default" ? preferences.theme : theme.id} />
                    <span className={styles.caption}>
                      <span className={styles.name}>{t(theme.name)}<span className={styles.check}>{selected ? <Icon name="check" size={14} /> : null}</span></span>
                      <span className={styles.description} id={`${descriptionId}-${theme.id}`}>{t(theme.description)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <footer className={styles.footer}>
        <p role="status">{t(preferences.saveFailed ? "Your preferences apply for this visit, but could not be saved." : "Choose a theme to apply it instantly.")}</p>
        <button type="button" className={styles.done} onClick={onClose}>{t("Done")}</button>
      </footer>
    </dialog>
  );
}
