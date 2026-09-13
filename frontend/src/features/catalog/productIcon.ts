import { DEFAULT_PRODUCT_ICON, findProductIcon, suggestProductIcon } from "./icons/productIcons";
import type { CatalogProduct } from "./types";

const STARTER_NAMES: Readonly<Record<string, string>> = {
  "microsoft-365": "Microsoft 365",
  "google-workspace": "Google Workspace",
  "adobe-acrobat": "Adobe Acrobat",
  "zoom-workplace": "Zoom",
  acronis: "Acronis",
};

export function resolveProductIcon(product: Pick<CatalogProduct, "id" | "name" | "icon">): string {
  if (product.icon !== undefined) return findProductIcon(product.icon)?.id ?? DEFAULT_PRODUCT_ICON.id;
  return suggestProductIcon(STARTER_NAMES[product.id] ?? product.name);
}
