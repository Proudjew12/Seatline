import { useCallback, useRef, useState } from "react";

import type { CatalogProduct } from "@/features/catalog/types";
import { parseMarkupBasisPoints, parsePriceCents } from "@/features/quotes/calculations";
import { createDraft, formatQuoteReference, loadDraft, saveDraft } from "@/features/quotes/storage";
import type { BillingOption, QuoteDraft, QuoteLine } from "@/features/quotes/types";
import { createId } from "@/shared/utils/createId";

export function useQuoteDraft(products: readonly CatalogProduct[]) {
  const [state, setState] = useState(() => ({ ...loadDraft(), saveFailed: false }));
  const current = useRef(state.draft);

  const commit = useCallback((update: (previous: QuoteDraft) => QuoteDraft) => {
    const next = update(current.current);
    current.current = next;
    const saved = saveDraft(next);
    setState((previous) => ({ ...previous, draft: next, saveFailed: !saved }));
  }, []);

  function addLine(
    productId: string, productName: string, licenseName: string,
    billing: BillingOption, initialPrice = "", licenseId?: string,
  ) {
    if (current.current.lines.length >= 100) return false;
    const product = products.find((entry) => entry.id === productId);
    const license = product?.licenses.find((entry) => entry.id === licenseId);
    // Defaults are copied only when adding a line; saved lines retain their own profit rate.
    const markup = license?.markupPercent ?? product?.markupPercent ?? "0";
    commit((draft) => ({ ...draft, lines: [...draft.lines, {
      id: createId(), productId, productName, licenseName, billing,
      ...(licenseId === undefined ? {} : { licenseId }),
      quantity: "1", unitPrice: parsePriceCents(initialPrice) === null ? "" : initialPrice,
      markupPercent: parseMarkupBasisPoints(markup) === null ? "0" : markup,
    }] }));
    return true;
  }

  function editLine(id: string, patch: Partial<Pick<QuoteLine, "quantity" | "unitPrice" | "billing" | "markupPercent">>) {
    commit((draft) => ({ ...draft, lines: draft.lines.map((line) => {
      if (line.id !== id) return line;
      let price = line.unitPrice;
      if (patch.billing && patch.billing !== line.billing) {
        // Match stable IDs only; renamed or removed entries must not inherit another license's rate.
        const license = line.licenseId === undefined ? undefined : products
          .find((product) => product.id === line.productId)?.licenses
          .find((entry) => entry.id === line.licenseId);
        const savedPrice = license?.prices?.[patch.billing] ?? "";
        price = parsePriceCents(savedPrice) === null ? "" : savedPrice;
      }
      return { ...line, unitPrice: price, ...patch };
    }) }));
  }

  function reset(): boolean {
    const sequence = (current.current.sequence ?? 0) + 1;
    if (!Number.isSafeInteger(sequence)) {
      setState((previous) => ({
        ...previous, warning: "The order number cannot be increased. Your current order has been kept.",
      }));
      return false;
    }
    commit(() => createDraft(sequence));
    return true;
  }

  return {
    ...state, addLine, editLine, reset,
    hasWork: Boolean(state.draft.lines.length || state.draft.customer.trim() || state.draft.notes.trim() ||
      state.draft.sequence === undefined || state.draft.reference !== formatQuoteReference(state.draft.sequence)),
    editDetails: (patch: Partial<Pick<QuoteDraft, "customer" | "reference" | "notes">>) =>
      commit((draft) => ({ ...draft, ...patch })),
    removeLine: (id: string) => commit((draft) => ({
      ...draft, lines: draft.lines.filter((line) => line.id !== id),
    })),
    dismissWarning: () => setState((previous) => ({ ...previous, warning: null })),
  };
}
