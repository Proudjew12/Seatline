import { useRef, useState } from "react";

import { createId } from "@/shared/utils/createId";
import { findProductIcon } from "../icons/productIcons";

import { loadCatalog, saveCatalog } from "../storage";
import { CATALOG_LIMITS } from "../types";
import type { CatalogChangeResult, CatalogProduct, LicensePrices } from "../types";
import { copyCatalog, isLicensePrices, validCatalogName, validMarkupPercent, validShortName } from "../validation";

function normalizedPrices(prices: LicensePrices): LicensePrices {
  return {
    monthly: prices.monthly.trim(),
    "annual-monthly": prices["annual-monthly"].trim(),
    "annual-upfront": prices["annual-upfront"].trim(),
  };
}

const PRICE_ERROR = "Enter USD prices from 0 to 1,000,000 with up to two decimal places, or leave them blank.";
const PROFIT_ERROR = "Enter a profit rate from 0 to 100% with up to two decimal places.";
const OPTIONAL_PROFIT_ERROR = "Enter a profit rate from 0 to 100% with up to two decimal places, or leave it blank.";

export function useCatalog() {
  const [state, setState] = useState(loadCatalog);
  const current = useRef(state.catalog);

  function commit(products: CatalogProduct[]): void {
    const catalog = copyCatalog(products);
    current.current = catalog;
    const saved = saveCatalog(catalog);
    setState({
      catalog,
      warning: saved ? null : "Your catalog is available for this visit, but could not be saved on this device.",
    });
  }

  function licenseLimitReached(product?: CatalogProduct): boolean {
    return (product !== undefined && product.licenses.length >= CATALOG_LIMITS.licensesPerProduct) ||
      current.current.products.reduce((total, entry) => total + entry.licenses.length, 0) >= CATALOG_LIMITS.licenses;
  }

  function addProduct(name: string, shortName: string, icon: string): CatalogChangeResult {
    const productName = name.trim();
    const label = shortName.trim() ||
      [...productName.replace(/\s+/g, "").toUpperCase()].slice(0, 2).join("");
    if (!validCatalogName(productName)) return { ok: false, message: "Enter a product name up to 80 characters." };
    if (!validShortName(label)) {
      return { ok: false, message: "Enter a short label from 1 to 4 characters." };
    }
    if (!findProductIcon(icon)) return { ok: false, message: "Choose an icon from the library." };
    const products = current.current.products;
    if (products.length >= CATALOG_LIMITS.products) {
      return { ok: false, message: "The catalog supports up to 50 products on this device." };
    }
    if (products.some((product) => product.name.toLowerCase() === productName.toLowerCase())) {
      return { ok: false, message: "A product with this name already exists." };
    }
    const product: CatalogProduct = {
      id: `custom-${createId()}`,
      name: productName,
      shortName: label,
      icon,
      markupPercent: "0",
      licenses: [],
    };
    commit([...products, product]);
    return { ok: true, productId: product.id };
  }

  function addLicense(productId: string, name: string, prices?: LicensePrices, markupPercent = ""): CatalogChangeResult {
    const licenseName = name.trim();
    const products = current.current.products;
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return { ok: false, message: "Select a product before adding a license." };
    if (!validCatalogName(licenseName)) return { ok: false, message: "Enter a license name up to 80 characters." };
    if (product.licenses.some((license) => license.name.toLowerCase() === licenseName.toLowerCase())) {
      return { ok: false, message: "This product already has a license with that name." };
    }
    if (licenseLimitReached(product)) {
      return { ok: false, message: "The catalog supports 100 licenses per product and 2,000 licenses in total." };
    }
    const defaults = prices === undefined ? undefined : normalizedPrices(prices);
    if (defaults !== undefined && !isLicensePrices(defaults)) return { ok: false, message: PRICE_ERROR };
    const markup = markupPercent.trim();
    if (markup !== "" && !validMarkupPercent(markup)) return { ok: false, message: OPTIONAL_PROFIT_ERROR };
    const license = {
      id: `custom-${createId()}`,
      name: licenseName,
      ...(defaults === undefined ? {} : { prices: defaults }),
      ...(markup === "" ? {} : { markupPercent: markup }),
    };
    commit(products.map((entry) => entry.id === productId
      ? { ...entry, licenses: [...entry.licenses, license] } : entry));
    return { ok: true, productId };
  }

  function updateProduct(productId: string, name: string, shortName: string, markupPercent: string, icon: string): CatalogChangeResult {
    const productName = name.trim();
    const label = shortName.trim();
    const products = current.current.products;
    if (!products.some((product) => product.id === productId)) {
      return { ok: false, message: "This product is no longer in the catalog." };
    }
    if (!validCatalogName(productName)) return { ok: false, message: "Enter a product name up to 80 characters." };
    if (!validShortName(label)) return { ok: false, message: "Enter a short label from 1 to 4 characters." };
    if (!findProductIcon(icon)) return { ok: false, message: "Choose an icon from the library." };
    const markup = markupPercent.trim();
    if (!validMarkupPercent(markup)) return { ok: false, message: PROFIT_ERROR };
    if (products.some((product) => product.id !== productId &&
      product.name.toLowerCase() === productName.toLowerCase())) {
      return { ok: false, message: "A product with this name already exists." };
    }
    commit(products.map((product) => product.id === productId
      ? { ...product, name: productName, shortName: label, markupPercent: markup, icon } : product));
    return { ok: true, productId };
  }

  function updateLicense(
    productId: string, licenseId: string, name: string, prices: LicensePrices, markupPercent = "",
  ): CatalogChangeResult {
    const licenseName = name.trim();
    const products = current.current.products;
    const product = products.find((entry) => entry.id === productId);
    if (!product?.licenses.some((license) => license.id === licenseId)) {
      return { ok: false, message: "This license is no longer in the catalog." };
    }
    if (!validCatalogName(licenseName)) return { ok: false, message: "Enter a license name up to 80 characters." };
    if (product.licenses.some((license) => license.id !== licenseId &&
      license.name.toLowerCase() === licenseName.toLowerCase())) {
      return { ok: false, message: "This product already has a license with that name." };
    }
    const defaults = normalizedPrices(prices);
    if (!isLicensePrices(defaults)) return { ok: false, message: PRICE_ERROR };
    const markup = markupPercent.trim();
    if (markup !== "" && !validMarkupPercent(markup)) return { ok: false, message: OPTIONAL_PROFIT_ERROR };
    commit(products.map((entry) => entry.id === productId ? {
      ...entry,
      licenses: entry.licenses.map((license) => license.id === licenseId
        ? { ...license, name: licenseName, prices: defaults, markupPercent: markup || undefined } : license),
    } : entry));
    return { ok: true, productId };
  }

  function removeProduct(productId: string): CatalogChangeResult {
    const products = current.current.products;
    if (!products.some((product) => product.id === productId)) {
      return { ok: false, message: "This product is no longer in the catalog." };
    }
    commit(products.filter((product) => product.id !== productId));
    return { ok: true, productId };
  }

  function removeLicense(productId: string, licenseId: string): CatalogChangeResult {
    const products = current.current.products;
    const product = products.find((entry) => entry.id === productId);
    if (!product?.licenses.some((license) => license.id === licenseId)) {
      return { ok: false, message: "This license is no longer in the catalog." };
    }
    commit(products.map((entry) => entry.id === productId
      ? { ...entry, licenses: entry.licenses.filter((license) => license.id !== licenseId) } : entry));
    return { ok: true, productId };
  }

  return {
    products: state.catalog.products,
    warning: state.warning,
    addProduct, addLicense, updateProduct, updateLicense, removeProduct, removeLicense,
  };
}
