import { ACRONIS_EXAMPLE, DEFAULT_PRODUCTS } from "./data";
import { LEGACY_CATALOG_STORAGE_KEY, LEGACY_STORED_CHARACTERS, migrateLegacyCatalog } from "./migration";
import { CATALOG_LIMITS } from "./types";
import type { CatalogSnapshot } from "./types";
import { copyCatalog, isCatalogSnapshot } from "./validation";

export const CATALOG_STORAGE_KEY = "seatline.catalog.v2";
// Migration-only identifier: keep the previous app's saved catalog recoverable.
const PREVIOUS_CATALOG_STORAGE_KEY = "saleprice.catalog.v2";
const UNSAVED_WARNING = "Your catalog is available for this visit, but could not be saved on this device.";

interface CatalogState {
  catalog: CatalogSnapshot;
  warning: string | null;
}

function fallbackCatalog(warning: string | null): CatalogState {
  return { catalog: copyCatalog(DEFAULT_PRODUCTS), warning };
}

function applyAcronisExample(snapshot: CatalogSnapshot): CatalogState {
  let catalog = copyCatalog(snapshot.products);
  let warning: string | null = null;
  const conflicts = catalog.products.some((product) =>
    product.id === ACRONIS_EXAMPLE.id || product.name.toLowerCase() === ACRONIS_EXAMPLE.name.toLowerCase() ||
    product.licenses.some((license) => ACRONIS_EXAMPLE.licenses.some((example) => example.id === license.id)));
  if (!conflicts) {
    const expanded = copyCatalog([...catalog.products, ACRONIS_EXAMPLE]);
    if (isCatalogSnapshot(expanded)) catalog = expanded;
    else warning = "The Acronis example could not be added because the catalog is full.";
  }
  // Record this one-time update even when an existing entry or capacity prevents insertion.
  const saved = saveCatalog(catalog);
  return { catalog, warning: saved ? warning : [warning, UNSAVED_WARNING].filter(Boolean).join(" ") };
}

export function loadCatalog(): CatalogState {
  try {
    const current = localStorage.getItem(CATALOG_STORAGE_KEY);
    const stored = current ?? localStorage.getItem(PREVIOUS_CATALOG_STORAGE_KEY);
    if (stored !== null) {
      if (stored.length <= CATALOG_LIMITS.storedCharacters) {
        const parsed: unknown = JSON.parse(stored);
        if (isCatalogSnapshot(parsed)) {
          if (parsed.seedRevision !== 1) return applyAcronisExample(parsed);
          const catalog = copyCatalog(parsed.products);
          const needsDefaults = parsed.products.some((product, index) =>
            product.markupPercent === undefined || product.icon !== catalog.products[index]?.icon);
          const saved = (current !== null && !needsDefaults) || saveCatalog(catalog);
          return { catalog, warning: saved ? null : UNSAVED_WARNING };
        }
      }
      return fallbackCatalog("Saved products could not be read. The default catalog is available.");
    }

    const legacy = localStorage.getItem(LEGACY_CATALOG_STORAGE_KEY);
    if (legacy === null) return fallbackCatalog(null);
    if (legacy.length <= LEGACY_STORED_CHARACTERS) {
      const parsed: unknown = JSON.parse(legacy);
      const catalog = migrateLegacyCatalog(parsed);
      if (catalog) {
        // Keep the v1 source intact for recovery. A saved v2 snapshot takes precedence on later visits.
        return applyAcronisExample(catalog);
      }
    }
    return fallbackCatalog("Saved products could not be read. The default catalog is available.");
  } catch {
    return fallbackCatalog("Saved products are unavailable. Catalog changes may not be kept after you leave.");
  }
}

export function saveCatalog(catalog: CatalogSnapshot): boolean {
  if (!isCatalogSnapshot(catalog)) return false;
  try {
    const serialized = JSON.stringify(copyCatalog(catalog.products));
    if (serialized.length > CATALOG_LIMITS.storedCharacters) return false;
    localStorage.setItem(CATALOG_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}
