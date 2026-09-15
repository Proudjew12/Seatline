import { useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/shared/i18n/context";
import { DEFAULT_PRODUCT_ICON, findProductIcon, PRODUCT_ICONS } from "../icons/productIcons";
import { PRODUCT_ICON_CATEGORIES } from "../icons/productIconCategories";
import type { ProductIconCategoryId } from "../icons/productIconCategories";
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
  const [category, setCategory] = useState<ProductIconCategoryId | "all">("all");
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const selected = findProductIcon(value) ?? DEFAULT_PRODUCT_ICON;
  const terms = query.normalize("NFKC").toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const groups = PRODUCT_ICON_CATEGORIES.filter((group) => category === "all" || category === group.id)
    .map((group) => ({
      ...group,
      icons: PRODUCT_ICONS.filter((icon) => {
        if (icon.category !== group.id) return false;
        const searchable = `${icon.name} ${icon.keywords} ${t(icon.name)} ${group.name} ${t(group.name)} ${group.keywords}`
          .normalize("NFKC").toLocaleLowerCase();
        return terms.every((term) => searchable.includes(term));
      }).sort((a, b) => group.id === "general" ? 0 : a.name.localeCompare(b.name, "en")),
    })).filter((group) => group.icons.length > 0);
  const count = groups.reduce((total, group) => total + group.icons.length, 0);
  const filtered = category !== "all" || query.length > 0;

  function resetScroll() {
    if (resultsRef.current) resultsRef.current.scrollTop = 0;
  }

  function clearFilters() {
    setCategory("all");
    setQuery("");
    resetScroll();
    searchRef.current?.focus();
  }

  return <fieldset className={styles.picker}>
    <legend>{t("Product icon")}</legend>
    <button type="button" className={styles.toggle} aria-label={t("Choose icon")}
      aria-describedby={`${id}-selected`} aria-expanded={expanded} aria-controls={`${id}-panel`}
      onClick={() => setExpanded((open) => !open)}>
      <ProductIcon id={selected.id} />
      <span id={`${id}-selected`} className={styles.selectedName}>
        <bdi dir={selected.category === "general" ? "auto" : "ltr"}>{t(selected.name)}</bdi>
      </span>
      <Icon name="chevron" size={16} />
    </button>
    {expanded ? <div id={`${id}-panel`} className={styles.panel}>
      <div className={styles.filters}>
        <label className={styles.search}>
          <span>{t("Search icons")}</span>
          <input ref={searchRef} type="search" value={query}
            onChange={(event) => { setQuery(event.target.value); resetScroll(); }}
            onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
            placeholder={t("Brand or category…")} autoComplete="off" maxLength={80} dir="auto" />
        </label>
        <label className={styles.categoryFilter}>
          <span>{t("Icon category")}</span>
          <select value={category} onChange={(event) => {
            setCategory(PRODUCT_ICON_CATEGORIES.find((group) => group.id === event.target.value)?.id ?? "all");
            resetScroll();
          }}>
            <option value="all">{t("All categories")}</option>
            {PRODUCT_ICON_CATEGORIES.map((group) => <option key={group.id} value={group.id}>{t(group.name)}</option>)}
          </select>
        </label>
      </div>
      <div className={styles.resultSummary}>
        <span role="status">{t(count === 1 ? "1 icon" : "{count} icons", { count })}</span>
        {filtered ? <button type="button" className={styles.clear} onClick={clearFilters}>{t("Clear filters")}</button> : null}
      </div>
      <div ref={resultsRef} className={styles.results} role="group" aria-label={t("Available icons")}>
        {groups.map((group) => <section key={group.id} className={styles.category} aria-labelledby={`${id}-${group.id}`}>
          <div className={styles.categoryHeader}>
            <h3 id={`${id}-${group.id}`}>{t(group.name)}</h3>
            <span aria-hidden="true">{group.icons.length}</span>
          </div>
          <div className={styles.grid}>
            {group.icons.map((icon) => <label key={icon.id} className={styles.choice}>
              <input type="radio" name={`${id}-choice`} value={icon.id}
                checked={selected.id === icon.id} onChange={() => onChange(icon.id)} />
              <ProductIcon id={icon.id} />
              <span className={styles.name}><bdi dir={icon.category === "general" ? "auto" : "ltr"}>{t(icon.name)}</bdi></span>
              {selected.id === icon.id ? <span className={styles.check}><Icon name="check" size={12} /></span> : null}
            </label>)}
          </div>
        </section>)}
        {count === 0 ? <p className={styles.empty}>{t("No icons found. Try another name.")}</p> : null}
      </div>
    </div> : null}
  </fieldset>;
}
