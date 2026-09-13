import { useId } from "react";

import { Icon } from "@/components/ui/Icon";
import { calculateLine, formatMoney, getLineError, parseMarkupBasisPoints, parsePriceCents, parseQuantity } from "@/features/quotes/calculations";
import { BillingSelect } from "./BillingSelect";
import type { QuoteLine } from "@/features/quotes/types";
import { useI18n } from "@/shared/i18n/context";
import styles from "@/features/quotes/components/QuoteLineEditor.module.scss";

interface Props {
  line: QuoteLine;
  onChange: (patch: Partial<Pick<QuoteLine, "quantity" | "unitPrice" | "billing" | "markupPercent">>) => void;
  onRemove: () => void;
}

export function QuoteLineEditor({ line, onChange, onRemove }: Props) {
  const { t } = useI18n();
  const errorId = useId();
  const priceLabelId = useId();
  const priceUnitId = useId();
  const markupLabelId = useId();
  const total = calculateLine(line);
  const error = getLineError(line);
  const yearly = line.billing === "annual-upfront";
  const markup = line.markupPercent ?? "0";
  const showError = error && (line.unitPrice !== "" || line.quantity !== "1" || markup !== "0");
  const basePrice = total.valid ? formatMoney(total.baseUnitCents) : "—";
  const profit = total.valid ? formatMoney(total.markupUnitCents) : "—";
  const formula = total.valid ? `${basePrice} × ${Number(markup)}% =` : "—";

  return (
    <fieldset className={styles.item} aria-label={line.licenseName} data-testid="quote-line">
      <div className={styles.heading}>
        <h2>
          <strong className={styles.productName}><bdi dir="ltr">{line.productName}</bdi></strong>{" "}
          <span className={styles.licenseName}><bdi dir="ltr">{line.licenseName}</bdi></span>
        </h2>
        <button type="button" className={styles.remove} aria-label={t("Remove {name}", { name: line.licenseName })} onClick={onRemove}>
          <Icon name="close" />
        </button>
      </div>
      <div className={styles.fields}>
        <div className={styles.terms}>
          <label><span>{t("Billing Option")}</span>
            <BillingSelect value={line.billing} onChange={(billing) => onChange({ billing })} />
          </label>
          <label><span id={markupLabelId}>{t("Profit rate")}</span>
            <span className={styles.percentage} dir="ltr">
              <input type="text" inputMode="decimal" value={markup} maxLength={8} size={Math.max(1, markup.length)}
                aria-labelledby={markupLabelId}
                aria-invalid={parseMarkupBasisPoints(markup) === null}
                aria-describedby={showError ? errorId : undefined}
                onChange={(event) => onChange({ markupPercent: event.target.value })} />
              <span aria-hidden="true">%</span>
            </span>
          </label>
        </div>
        <div className={styles.amounts}>
          <label><span>{t("Quantity")}</span>
            <input type="text" inputMode="numeric" dir="ltr" value={line.quantity} maxLength={5} size={Math.max(1, line.quantity.length)}
              aria-invalid={parseQuantity(line.quantity) === null}
              aria-describedby={showError ? errorId : undefined}
              onChange={(event) => onChange({ quantity: event.target.value })} />
          </label>
          <label><span id={priceLabelId}>{t("Price")}</span>
            <span className={styles.price} dir="ltr"><span aria-hidden="true">$</span>
              <input type="text" inputMode="decimal" placeholder="0.00" value={line.unitPrice} maxLength={12} size={Math.max(1, (line.unitPrice || "0.00").length)}
                aria-labelledby={priceLabelId}
                aria-invalid={Boolean(line.unitPrice && parsePriceCents(line.unitPrice) === null)}
                aria-describedby={`${priceUnitId}${showError ? ` ${errorId}` : ""}`}
                onChange={(event) => onChange({ unitPrice: event.target.value })} />
            </span>
          </label>
        </div>
        <div className={styles.pricing} dir="ltr" role="group" aria-label={t("Internal price calculation")}
          data-compact={formula.length + profit.length > 30}>
          <span>{formula}</span>
          <output aria-label={t("{name} profit per license", { name: line.licenseName })}>{profit}</output>
        </div>
        <div className={styles.total}>
          <output dir="ltr" aria-label={t("{name} line total", { name: line.licenseName })}>{total.valid ? formatMoney(total.subtotalCents) : "—"}</output>
          <small id={priceUnitId}>{t(yearly ? "per year" : "per month")}</small>
        </div>
      </div>
      {showError ? <p className={styles.error} id={errorId}>{t(error)}</p> : null}
    </fieldset>
  );
}
