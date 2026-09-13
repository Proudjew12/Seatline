import { parseMarkupBasisPoints, parsePriceCents } from "@/features/quotes/calculations";
import { BILLING_OPTIONS, QUOTE_LIMITS } from "@/features/quotes/types";

import { CATALOG_LIMITS } from "./types";
import { resolveProductIcon } from "./productIcon";
import type { CatalogLicense, CatalogProduct, CatalogSnapshot, LicensePrices } from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validCatalogName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value === value.trim() &&
    value.length <= CATALOG_LIMITS.name &&
    [...value].every((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code >= 32 && code !== 127;
    });
}

export function validShortName(value: unknown): value is string {
  return validCatalogName(value) && value.length <= CATALOG_LIMITS.shortName;
}

export function isLicensePrices(value: unknown): value is LicensePrices {
  return isRecord(value) && Object.keys(value).length === BILLING_OPTIONS.length &&
    BILLING_OPTIONS.every(({ id }) => {
      const price = value[id];
      return typeof price === "string" && price === price.trim() &&
        price.length <= QUOTE_LIMITS.numericInput && (price === "" || parsePriceCents(price) !== null);
    });
}

export function validMarkupPercent(value: unknown): value is string {
  return typeof value === "string" && value === value.trim() && parseMarkupBasisPoints(value) !== null;
}

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,86}$/.test(value);
}

function isLicense(value: unknown): value is CatalogLicense {
  return isRecord(value) && validId(value.id) && validCatalogName(value.name) &&
    (value.prices === undefined || isLicensePrices(value.prices)) &&
    (value.markupPercent === undefined || validMarkupPercent(value.markupPercent));
}

function isProduct(value: unknown): value is CatalogProduct {
  return isRecord(value) && validId(value.id) && validCatalogName(value.name) &&
    (value.icon === undefined || validId(value.icon)) &&
    (value.markupPercent === undefined || validMarkupPercent(value.markupPercent)) &&
    validShortName(value.shortName) && Array.isArray(value.licenses) &&
    value.licenses.length <= CATALOG_LIMITS.licensesPerProduct && value.licenses.every(isLicense);
}

export function isCatalogSnapshot(value: unknown): value is CatalogSnapshot {
  if (!isRecord(value) || value.version !== 2 ||
    (value.seedRevision !== undefined && value.seedRevision !== 1) || !Array.isArray(value.products) ||
    value.products.length > CATALOG_LIMITS.products || !value.products.every(isProduct)) {
    return false;
  }
  const products: CatalogProduct[] = value.products;
  const licenses = products.flatMap((product) => product.licenses);
  return licenses.length <= CATALOG_LIMITS.licenses &&
    new Set(products.map((product) => product.id)).size === products.length &&
    new Set(products.map((product) => product.name.toLowerCase())).size === products.length &&
    new Set(licenses.map((license) => license.id)).size === licenses.length &&
    products.every((product) =>
      new Set(product.licenses.map((license) => license.name.toLowerCase())).size === product.licenses.length);
}

// Copy only the validated fields, so stored extras never become part of the live catalog.
export function copyCatalog(products: CatalogProduct[]): CatalogSnapshot {
  return {
    version: 2,
    seedRevision: 1,
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      shortName: product.shortName,
      icon: resolveProductIcon(product),
      markupPercent: product.markupPercent ?? "0",
      licenses: product.licenses.map((license) => ({
        id: license.id,
        name: license.name,
        ...(license.prices === undefined ? {} : { prices: { ...license.prices } }),
        ...(license.markupPercent === undefined ? {} : { markupPercent: license.markupPercent }),
      })),
    })),
  };
}
