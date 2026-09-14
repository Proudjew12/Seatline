import { pointerIntersection } from "@dnd-kit/collision";
import { useDroppable } from "@dnd-kit/react";

import { useI18n } from "@/shared/i18n/context";
import { SeatlineMark } from "@/components/branding/SeatlineMark";
import { Icon } from "@/components/ui/Icon";
import { QuoteLineEditor } from "@/features/quotes/components/QuoteLineEditor";
import { QuoteSummary } from "@/features/quotes/components/QuoteSummary";
import type { useQuoteDraft } from "@/features/quotes/useQuoteDraft";
import { classNames } from "@/shared/utils/classNames";
import styles from "@/features/quotes/components/QuoteWorkspace.module.scss";

interface Props {
  quote: ReturnType<typeof useQuoteDraft>;
  exporting: boolean;
  onExport: () => void;
  onNewOrder: () => void;
  catalogWarning: string | null;
  exportError: string;
  editing: boolean;
}

export function QuoteCanvas({ quote, exporting, onExport, onNewOrder, catalogWarning, exportError, editing }: Props) {
  const { t, dir } = useI18n();
  const { ref, isDropTarget } = useDroppable({ id: "quote-items", accept: "license", collisionDetector: pointerIntersection, disabled: editing });
  const { draft } = quote;
  return (
    <main ref={ref} className={styles.quote} id="quote-content" aria-label={t("Order")} tabIndex={-1}>
      <div className={styles.scroll}>
        {quote.warning ? <div className={styles.warning} role="alert">{t(quote.warning)}<button type="button" onClick={quote.dismissWarning} aria-label={t("Dismiss draft warning")}><Icon name="close" size={16} /></button></div> : null}
        {catalogWarning ? <p className={styles.warning} role="alert">{t(catalogWarning)}</p> : null}
        {quote.saveFailed ? <p className={styles.warning} role="alert">{t("Changes may not be saved on this device. Export your quote before leaving.")}</p> : null}
        {exportError ? <p className={styles.warning} role="alert">{t(exportError)}</p> : null}
        <div className={styles.details}>
          <label>{t("Customer")}<input dir={draft.customer ? "auto" : dir} value={draft.customer} placeholder={t("Customer or company name")} maxLength={200} autoComplete="organization"
            size={Math.max(1, (draft.customer || t("Customer or company name")).length)}
            onChange={(event) => quote.editDetails({ customer: event.target.value })} /></label>
          <label>{t("Sales Proposal")}<input dir="ltr" value={draft.reference} maxLength={64} size={Math.max(1, draft.reference.length)}
            onChange={(event) => quote.editDetails({ reference: event.target.value })} /></label>
          <button className={styles.newOrder} type="button" onClick={onNewOrder}>{t("New Order")}</button>
        </div>
        <section aria-label={t("Quote items")} className={classNames(styles.items, isDropTarget && styles.over)}>
          {draft.lines.map((line) => <QuoteLineEditor key={line.id} line={line} onChange={(patch) => quote.editLine(line.id, patch)}
            onRemove={() => quote.removeLine(line.id)} />)}
          {draft.lines.length === 0 ? <div className={styles.empty}>
            <span className={styles.dropIcon}><SeatlineMark /></span>
            <p>{t(editing ? "Catalog editing is on. Return to Normal Mode to drag licenses." : "Drag a license card here to add it")}</p>
          </div> : null}
        </section>
      </div>
      <label className={styles.notes}>{t("Notes")}<textarea dir={draft.notes ? "auto" : dir} value={draft.notes} maxLength={4000} placeholder={t("Add any notes for this quote…")} rows={3}
        onChange={(event) => quote.editDetails({ notes: event.target.value })} /></label>
      <QuoteSummary draft={draft} exporting={exporting} onExport={onExport} />
    </main>
  );
}
