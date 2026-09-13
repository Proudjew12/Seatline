import { Icon } from "@/components/ui/Icon";
import { calculateLine, calculateQuote, formatMoney } from "@/features/quotes/calculations";
import type { QuoteDraft } from "@/features/quotes/types";
import { useI18n } from "@/shared/i18n/context";
import styles from "@/features/quotes/components/QuoteSummary.module.scss";

interface Props {
  draft: QuoteDraft;
  exporting: boolean;
  onExport: () => void;
}

export function QuoteSummary({ draft, exporting, onExport }: Props) {
  const { t } = useI18n();
  const totals = calculateQuote(draft.lines);
  const monthlyValid = draft.lines.filter((line) => line.billing !== "annual-upfront").every((line) => calculateLine(line).valid);
  const annualValid = draft.lines.filter((line) => line.billing === "annual-upfront").every((line) => calculateLine(line).valid);
  const ready = totals.valid && Boolean(draft.customer.trim() && draft.reference.trim());
  let hint = "Your quote is ready to download.";
  if (draft.lines.length === 0) hint = "Add a license to start your quote.";
  else if (!totals.valid) hint = "Enter a valid quantity, price, and profit rate for each license.";
  else if (!draft.customer.trim()) hint = "Add a customer to export this quote.";
  else if (!draft.reference.trim()) hint = "Add a sales proposal number to export.";

  return (
    <footer className={styles.summary}>
      <div className={styles.metrics}>
        <div><span>{t("Monthly payments")}</span><output dir="ltr" aria-label={t("Monthly payments")}>{monthlyValid ? formatMoney(totals.monthlyCents) : "—"}</output></div>
        <div><span>{t("Yearly payments")}</span><output dir="ltr" aria-label={t("Yearly payments")}>{annualValid ? formatMoney(totals.annualUpfrontCents) : "—"}</output></div>
        <div><span>{t("Due at start")}</span><output dir="ltr" aria-label={t("Due at start")}>{monthlyValid && annualValid ? formatMoney(totals.dueNowCents) : "—"}</output></div>
      </div>
      <div className={styles.action}>
        <p id="export-hint">{t(hint)}</p>
        <button type="button" onClick={onExport} disabled={!ready || exporting} aria-describedby="export-hint">
          <Icon name="download" size={18} /> {t(exporting ? "Creating PDF…" : "Export PDF")}
        </button>
      </div>
      <div className={styles.caption}>
        <span>{t("12-month estimate")} <output dir="ltr" aria-label={t("12-month estimate")}>{monthlyValid && annualValid ? formatMoney(totals.yearEstimateCents) : "—"}</output></span>
      </div>
      {draft.lines.some((line) => line.billing === "monthly") ?
        <p className={styles.assumption}>{t("The estimate assumes monthly subscriptions continue for 12 months.")}</p> : null}
    </footer>
  );
}
