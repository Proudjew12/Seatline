import { PointerActivationConstraints } from "@dnd-kit/dom";
import { PointerSensor, useDraggable } from "@dnd-kit/react";
import { useId } from "react";

import { Icon } from "@/components/ui/Icon";
import { formatMoney, parsePriceCents } from "@/features/quotes/calculations";
import { classNames } from "@/shared/utils/classNames";
import { useI18n } from "@/shared/i18n/context";
import type { CatalogLicense, CatalogProduct } from "../types";
import styles from "./LicenseCard.module.scss";

interface LicenseCardProps {
  product: CatalogProduct;
  license: CatalogLicense;
  onAdd: (product: CatalogProduct, license: CatalogLicense) => void;
  editing: boolean;
  onEdit: () => void;
}

const PRICE_OPTIONS = [
  { id: "monthly", label: "Monthly", unit: "/ mo" },
  { id: "annual-monthly", label: "Annual · Monthly", unit: "/ mo" },
  { id: "annual-upfront", label: "Annual · Yearly", unit: "/ yr" },
] as const;

const cardPointerSensor = PointerSensor.configure({
  activationConstraints(event, source) {
    // A little movement distinguishes touch dragging from tapping, without a hold delay.
    if (event.pointerType === "touch") return [new PointerActivationConstraints.Distance({ value: 4 })];
    const defaults = PointerSensor.defaults.activationConstraints;
    return typeof defaults === "function" ? defaults(event, source) : defaults;
  },
});

export function LicenseCard({ product, license, onAdd, editing, onEdit }: LicenseCardProps) {
  const { t } = useI18n();
  const { ref, isDragging, isDropping } = useDraggable({ id: license.id, type: "license", sensors: [cardPointerSensor], disabled: editing });
  const pricesId = useId();
  const rates = PRICE_OPTIONS.map((option) => {
    const price = parsePriceCents(license.prices?.[option.id] ?? "");
    return { ...option, amount: price === null ? null : formatMoney(price) };
  });
  // Long currency values need the full card width so their digits stay together.
  const hasLongPrices = rates.some(({ amount }) => amount !== null && amount.length > 9);

  return (
    <article className={classNames(styles.card, hasLongPrices && styles.widePrices)} aria-label={license.name}>
      <button ref={ref} type="button"
        className={classNames(styles.content, isDragging && styles.dragging, editing && styles.readOnly)}
        aria-label={t("Add {name} to quote", { name: license.name })}
        aria-describedby={pricesId}
        onClick={(event) => {
          // Pointer gestures add by dropping only; native keyboard/assistive activation stays available.
          if (event.defaultPrevented || event.detail !== 0 || isDragging || isDropping) return;
          onAdd(product, license);
        }}>
        <span className={classNames(styles.name, editing && styles.editableName)}><bdi dir="ltr">{license.name}</bdi></span>
        <span id={pricesId} className={styles.prices}>
          {rates.map(({ id, label, unit, amount }) => (
            <span key={id} className={styles.rate}>
              <span className={styles.rateLabel}>{t(label)}</span>
              <span className={classNames(styles.price, amount === null && styles.unpriced)}>
                {amount === null ? t("Not set") : <><bdi dir="ltr">{amount}</bdi><span className={styles.unit}>{t(unit)}</span></>}
              </span>
            </span>
          ))}
        </span>
      </button>
      {editing ? <button type="button" className={styles.edit} aria-label={t("Edit {name}", { name: license.name })} title={t("Edit license")} onClick={onEdit}><Icon name="edit" size={17} /></button> : null}
    </article>
  );
}
