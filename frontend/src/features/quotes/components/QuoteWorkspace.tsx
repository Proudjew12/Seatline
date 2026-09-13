import { DragDropProvider } from "@dnd-kit/react";
import { useState } from "react";

import { CatalogDialog } from "@/features/catalog/components/CatalogDialog";
import type { CatalogDialogTarget, CatalogEditorInput } from "@/features/catalog/components/CatalogDialog";
import { CatalogPanel } from "@/features/catalog/components/CatalogPanel";
import { ProductRail } from "@/features/catalog/components/ProductRail";
import { useCatalog } from "@/features/catalog/hooks/useCatalog";
import type { CatalogLicense, CatalogProduct } from "@/features/catalog/types";
import { SettingsControl } from "@/features/display/SettingsControl";
import { QuoteCanvas } from "@/features/quotes/components/QuoteCanvas";
import { useQuoteDraft } from "@/features/quotes/useQuoteDraft";
import { useI18n } from "@/shared/i18n/context";
import styles from "@/features/quotes/components/QuoteWorkspace.module.scss";

const initialBilling = "annual-monthly";

export function QuoteWorkspace() {
  const { t, locale } = useI18n();
  const catalog = useCatalog();
  const quote = useQuoteDraft(catalog.products);
  const [selectedId, setSelectedId] = useState("microsoft-365");
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<CatalogDialogTarget | null>(null);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const product = catalog.products.find((item) => item.id === selectedId) ?? catalog.products[0];

  function addLicense(selectedProduct: CatalogProduct, license: CatalogLicense) {
    const added = quote.addLine(selectedProduct.id, selectedProduct.name, license.name, initialBilling, license.prices?.[initialBilling] ?? "", license.id);
    setMessage(added ? t("{name} added to your quote.", { name: license.name }) : t("A quote can contain up to 100 license lines."));
    setExportError("");
  }

  async function exportPdf() {
    setExporting(true);
    setExportError("");
    try {
      const { exportQuotePdf } = await import("@/features/quotes/exportPdf");
      await exportQuotePdf(quote.draft, locale);
      setMessage(t("Your PDF quote has been downloaded."));
    } catch {
      setExportError("The PDF could not be created. Your quote is still here. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  function newOrder() {
    if (quote.hasWork && !window.confirm(t("Start a new order? Export your current order first if you want to keep it."))) return;
    if (!quote.reset()) return;
    setMessage(t("New order started.")); setExportError("");
  }

  function submitCatalog(input: CatalogEditorInput): string | null {
    if (!dialog || !editing) return t("Switch to Edit Mode to change your catalog.");
    const { name, shortName, icon, prices, markupPercent } = input;
    const result = dialog.kind === "add-product" ? catalog.addProduct(name, shortName, icon)
      : dialog.kind === "edit-product" ? catalog.updateProduct(dialog.product.id, name, shortName, markupPercent, icon)
      : dialog.kind === "add-license" ? catalog.addLicense(dialog.product.id, name, prices, markupPercent)
      : catalog.updateLicense(dialog.product.id, dialog.license.id, name, prices, markupPercent);
    if (!result.ok) return t(result.message);
    setSelectedId(result.productId); setDialog(null);
    setMessage(t("Catalog updated."));
    return null;
  }

  function deleteCatalog(): string | null {
    if (!editing || !dialog || (dialog.kind !== "edit-product" && dialog.kind !== "edit-license")) return t("Select an item to delete.");
    const name = dialog.kind === "edit-product" ? dialog.product.name : dialog.license.name;
    if (!window.confirm(t("Delete {name} from your catalog? Existing order items will be kept.", { name }))) return null;
    const result = dialog.kind === "edit-product" ? catalog.removeProduct(dialog.product.id)
      : catalog.removeLicense(dialog.product.id, dialog.license.id);
    if (!result.ok) return t(result.message);
    setDialog(null); setMessage(t("Item removed from the catalog."));
    return null;
  }

  return (
    <div className={styles.workspace}>
      <a className={styles.skip} href="#quote-content" onClick={(event) => {
        event.preventDefault(); document.getElementById("quote-content")?.focus();
      }}>{t("Skip to main content")}</a>
      <header className={styles.header}>
        <div className={styles.brand} dir="ltr">Seatline</div>
        <div className={styles.toolbar}>
          <SettingsControl editing={editing} onEditingChange={setEditing} />
        </div>
      </header>
      <DragDropProvider onDragEnd={(event) => {
        if (editing || event.canceled || event.operation.target?.id !== "quote-items") return;
        const licenseId = event.operation.source?.id;
        for (const item of catalog.products) {
          const license = item.licenses.find((candidate) => candidate.id === licenseId);
          if (license) { addLicense(item, license); break; }
        }
      }}>
        <div className={styles.body}>
          <ProductRail products={catalog.products} selectedId={product?.id ?? ""} onSelect={setSelectedId} editing={editing} onAddProduct={() => setDialog({ kind: "add-product" })} />
          {product ? <CatalogPanel key={product.id} product={product} onAdd={addLicense} editing={editing}
            onAddLicense={() => setDialog({ kind: "add-license", product })} onEditProduct={() => setDialog({ kind: "edit-product", product })}
            onEditLicense={(license) => setDialog({ kind: "edit-license", product, license })} />
            : <section className={styles.emptyCatalog} aria-label={t("Licenses")}><h2>{t("No products yet")}</h2><p>{t(editing ? "Use + on the left to add your first product." : "Switch to Edit Mode to add a product.")}</p></section>}
          <QuoteCanvas quote={quote} exporting={exporting} onExport={() => { void exportPdf(); }}
            catalogWarning={catalog.warning} exportError={exportError} onNewOrder={newOrder} editing={editing} />
        </div>
      </DragDropProvider>
      <div className={styles.announcement} role="status" aria-live="polite" aria-atomic="true">{message}</div>
      {dialog ? <CatalogDialog target={dialog} onClose={() => setDialog(null)} onSubmit={submitCatalog} onDelete={deleteCatalog} /> : null}
    </div>
  );
}
