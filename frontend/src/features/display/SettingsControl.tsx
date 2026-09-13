import { useContext, useId, useLayoutEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/shared/i18n/context";

import { DisplayPreferencesContext } from "./context";
import { isTheme } from "./preferences";
import { getTheme } from "./themes";
import { ThemeGallery } from "./ThemeGallery";
import { TextSizeControl } from "./TextSizeControl";
import styles from "./SettingsControl.module.scss";

interface SettingsControlProps {
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}

interface SettingsDialogProps extends SettingsControlProps {
  onClose: () => void;
}

function SettingsDialog({ editing, onEditingChange, onClose }: SettingsDialogProps) {
  const preferences = useContext(DisplayPreferencesContext);
  const { t, dir } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const editMode = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const editHelpId = useId();
  const themeId = useId();
  const localeId = useId();
  const [galleryOpen, setGalleryOpen] = useState(false);

  useLayoutEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element?.showModal();
    editMode.current?.focus();
    return () => {
      element?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  if (!preferences) throw new Error("SettingsControl requires DisplayPreferencesProvider.");

  return (
    <dialog ref={dialog} dir={dir} className={styles.dialog} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <header className={styles.header}>
        <h2 id={titleId}>{t("Settings")}</h2>
        <button type="button" className={styles.close} aria-label={t("Close settings")} onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <div className={styles.settings}>
        <div className={styles.editSetting}>
          <label className={styles.row}>
            <span>{t("Edit Mode")}</span>
            <input ref={editMode} type="checkbox" role="switch" checked={editing}
              aria-describedby={editHelpId} onChange={(event) => onEditingChange(event.target.checked)} />
          </label>
          <p id={editHelpId} className={styles.description}>{t("Manage products and licenses in your catalog.")}</p>
        </div>
        <TextSizeControl />
        <div className={styles.row}>
          <span>{t("Theme")}</span>
          <button type="button" className={styles.browseThemes} aria-label={t("Browse themes")} aria-haspopup="dialog"
            aria-expanded={galleryOpen} onClick={() => setGalleryOpen(true)}>
            <span className={styles.swatches} data-theme={preferences.themeId === "default" ? preferences.theme : preferences.themeId} aria-hidden="true"><i /><i /><i /></span>
            {t(getTheme(preferences.themeId).name)}<Icon name="grid" size={16} />
          </button>
        </div>
        {preferences.themeId === "default" ? <div className={styles.row}>
          <label htmlFor={themeId}>{t("Appearance")}</label>
          <select id={themeId} value={preferences.theme} onChange={(event) => {
            if (isTheme(event.target.value)) preferences.changeTheme(event.target.value);
          }}>
            <option value="light">{t("Light")}</option>
            <option value="dark">{t("Dark")}</option>
          </select>
        </div> : null}
        <div className={styles.row}>
          <label htmlFor={localeId}>{t("Language")}</label>
          <select id={localeId} value={preferences.locale} onChange={(event) => {
            const locale = event.target.value;
            if (locale === "en" || locale === "he") preferences.changeLocale(locale);
          }}>
            <option value="en" lang="en">English</option>
            <option value="he" lang="he">עברית</option>
          </select>
        </div>
      </div>
      {preferences.saveFailed ? <p className={styles.notice} role="status">
        {t("Your preferences apply for this visit, but could not be saved.")}
      </p> : null}
      {galleryOpen ? <ThemeGallery onClose={() => setGalleryOpen(false)} /> : null}
    </dialog>
  );
}

export function SettingsControl({ editing, onEditingChange }: SettingsControlProps) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <button type="button" className={styles.trigger} aria-label={t("Settings")} title={t("Settings")}
        aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <Icon name="settings" />
      </button>
      {open ? <SettingsDialog editing={editing} onEditingChange={onEditingChange} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
