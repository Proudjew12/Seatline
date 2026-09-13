import { useId, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/shared/i18n/context";
import { DEFAULT_PRODUCT_ICON, findProductIcon, PRODUCT_ICONS } from "../icons/productIcons";
import { ProductIcon } from "./ProductIcon";
import styles from "./ProductIconPicker.module.scss";

interface ProductIconPickerProps {
  value: string;
  onChange: (id: string) => void;
}

export function ProductIconPicker({ value, onChange }: ProductIconPickerProps) {
  const { t } = useI18n();
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const selected = findProductIcon(value) ?? DEFAULT_PRODUCT_ICON;
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const icons = PRODUCT_ICONS.filter((icon) => {
    const searchable = `${icon.name} ${icon.keywords} ${t(icon.name)}`.toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  });

  return <fieldset className={styles.picker}>
    <legend>{t("Product icon")}</legend>
    <button type="button" className={styles.toggle} aria-label={t("Choose icon")}
      aria-describedby={`${id}-selected`} aria-expanded={expanded} aria-controls={`${id}-panel`}
      onClick={() => setExpanded(!expanded)}>
      <ProductIcon id={selected.id} />
      <span id={`${id}-selected`} className={styles.selectedName}><bdi dir="auto">{t(selected.name)}</bdi></span>
      <Icon name="chevron" size={16} />
    </button>
    {expanded ? <div id={`${id}-panel`} className={styles.panel}>
      <label className={styles.search}>
        <span>{t("Search icons")}</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
          placeholder={t("Microsoft 365, Acronis, Adobe…")} autoComplete="off" maxLength={80} dir="auto" />
      </label>
      <div className={styles.grid} role="group" aria-label={t("Available icons")}>
        {icons.map((icon) => <label key={icon.id} className={styles.choice}>
          <input type="radio" name="product-icon-choice" value={icon.id}
            checked={selected.id === icon.id} onChange={() => onChange(icon.id)} />
          <ProductIcon id={icon.id} />
          <span className={styles.name}><bdi dir="auto">{t(icon.name)}</bdi></span>
          {selected.id === icon.id ? <span className={styles.check}><Icon name="check" size={12} /></span> : null}
        </label>)}
      </div>
      {icons.length === 0 ? <p className={styles.empty} role="status">{t("No icons found. Try another name.")}</p> : null}
    </div> : null}
  </fieldset>;
}
