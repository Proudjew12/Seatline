import { useLayoutEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { useI18n } from "@/shared/i18n/context";
import { Icon } from "@/components/ui/Icon";
import { CATALOG_LIMITS } from "../types";
import type { CatalogLicense, CatalogProduct, LicensePrices } from "../types";
import { suggestProductIcon } from "../icons/productIcons";
import { resolveProductIcon } from "../productIcon";
import { ProductIconPicker } from "./ProductIconPicker";
import styles from "./CatalogDialog.module.scss";

export type CatalogDialogTarget =
  | { kind: "add-product" }
  | { kind: "edit-product"; product: CatalogProduct }
  | { kind: "add-license"; product: CatalogProduct }
  | { kind: "edit-license"; product: CatalogProduct; license: CatalogLicense };

export interface CatalogEditorInput {
  name: string;
  shortName: string;
  icon: string;
  prices: LicensePrices;
  markupPercent: string;
}

interface CatalogDialogProps {
  target: CatalogDialogTarget;
  onClose: () => void;
  onSubmit: (input: CatalogEditorInput) => string | null;
  onDelete?: () => string | null;
}

const PRICE_FIELDS = [
  { id: "monthly", label: "Monthly price", unit: "per license / month" },
  { id: "annual-monthly", label: "Annual paid monthly price", unit: "per license / month" },
  { id: "annual-upfront", label: "Annual paid yearly price", unit: "per license / year" },
] as const;

function readText(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

interface ProfitRateFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  inheritedRate?: string;
}

function ProfitRateField({ name, label, value, onChange, inheritedRate }: ProfitRateFieldProps) {
  const { t } = useI18n();
  const id = `catalog-${name}`;
  return <div className={styles.field}>
    <label htmlFor={id}>{t(label)}</label>
    <div className={styles.profitInput} dir="ltr">
      <input id={id} name={name} type="text" inputMode="decimal" dir="ltr"
        value={value} onChange={(event) => onChange(event.target.value)}
        required={inheritedRate === undefined} maxLength={32} autoComplete="off"
        placeholder={inheritedRate} aria-describedby={`${id}-help`} />
      <span aria-hidden="true">%</span>
    </div>
    <p id={`${id}-help`} className={styles.hint}>
      {inheritedRate === undefined
        ? t("Applied to new quote items. Existing items keep their rates.")
        : <>{t("Leave blank to use the product rate:")} <bdi dir="ltr">{inheritedRate}%</bdi></>}
    </p>
  </div>;
}

export function CatalogDialog({ target, onClose, onSubmit, onDelete }: CatalogDialogProps) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const firstInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const isProduct = target.kind === "add-product" || target.kind === "edit-product";
  const isEditing = target.kind === "edit-product" || target.kind === "edit-license";
  const existingProduct = target.kind === "edit-product" ? target.product : undefined;
  const existingLicense = target.kind === "edit-license" ? target.license : undefined;
  const [name, setName] = useState(existingProduct?.name ?? existingLicense?.name ?? "");
  const [chosenIcon, setChosenIcon] = useState<string | null>(existingProduct ? resolveProductIcon(existingProduct) : null);
  const icon = chosenIcon ?? suggestProductIcon(name);
  const [markupPercent, setMarkupPercent] = useState(isProduct
    ? existingProduct?.markupPercent ?? "0" : existingLicense?.markupPercent ?? "");
  const title = t(isProduct ? isEditing ? "Edit product" : "Add product" : isEditing ? "Edit license" : "Add license");
  const description = isProduct
    ? t(isEditing ? "Update this product in your catalog." : "Create a product. Add its licenses afterward.")
    : t("Manage a license for {name}.", { name: target.product.name });

  useLayoutEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element?.showModal();
    firstInput.current?.focus();
    return () => {
      // Close before React removes the dialog so keyboard focus can return to its trigger.
      element?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(onSubmit({
      name: readText(form, "name"),
      shortName: readText(form, "shortName"),
      icon,
      markupPercent: readText(form, "markupPercent"),
      prices: {
        monthly: readText(form, "monthly"),
        "annual-monthly": readText(form, "annual-monthly"),
        "annual-upfront": readText(form, "annual-upfront"),
      },
    }));
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="catalog-dialog-title"
      aria-describedby="catalog-dialog-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
    >
      <div className={styles.header}>
        <h2 id="catalog-dialog-title">{title}</h2>
        <button type="button" className={styles.close} aria-label={t("Close dialog")} onClick={onClose}><Icon name="close" /></button>
      </div>
      <p id="catalog-dialog-description" className={styles.description}>{description}</p>
      <form onSubmit={submit} onInvalid={(event) => {
        const input = event.target;
        if (input instanceof HTMLInputElement && input.validity.valueMissing) {
          input.setCustomValidity(t("Please complete this field."));
        }
      }} onInput={(event) => {
        if (event.target instanceof HTMLInputElement) event.target.setCustomValidity("");
      }}>
        <div className={styles.field}>
          <label htmlFor="catalog-name">{t(isProduct ? "Product name" : "License name")}</label>
          <input
            ref={firstInput}
            id="catalog-name"
            name="name"
            type="text" dir="ltr"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={CATALOG_LIMITS.name}
            autoComplete="off"
          />
        </div>
        {isProduct ? <div className={styles.field}>
          <label htmlFor="catalog-short-name">{t("Short label")}</label>
          <input
            id="catalog-short-name"
            name="shortName"
            type="text" dir="ltr"
            defaultValue={existingProduct?.shortName ?? ""}
            required={isEditing}
            maxLength={4}
            placeholder={t("Up to 4 characters")}
            autoComplete="off"
            aria-describedby="catalog-short-name-help"
          />
          <p id="catalog-short-name-help" className={styles.hint}>{t("Shown below the product icon.")} {isEditing ? "" : t("Leave blank to use initials.")}</p>
        </div> : null}
        {isProduct ? <ProductIconPicker value={icon} onChange={setChosenIcon} /> : null}
        {target.kind !== "add-product" ? <ProfitRateField name="markupPercent" label="Profit rate" value={markupPercent}
          onChange={setMarkupPercent} inheritedRate={target.kind === "edit-product" ? undefined : target.product.markupPercent ?? "0"} /> : null}
        {!isProduct ? <fieldset className={styles.prices}>
          <legend>{t("Default prices · USD")}</legend>
          <p className={styles.priceHelp}>{t("Leave a price blank to enter it in each order.")}</p>
          {PRICE_FIELDS.map(({ id, label, unit }) => <div key={id} className={styles.priceField}>
            <div>
              <label htmlFor={`catalog-price-${id}`}>{t(label)}</label>
              <p id={`catalog-price-${id}-unit`} className={styles.hint}>{t(unit)}</p>
            </div>
            <div className={styles.priceInput} dir="ltr">
              <span aria-hidden="true">$</span>
              <input
                id={`catalog-price-${id}`}
                name={id}
                type="text" dir="ltr"
                inputMode="decimal"
                defaultValue={existingLicense?.prices?.[id] ?? ""}
                maxLength={32}
                placeholder={t("Not set")}
                autoComplete="off"
                aria-describedby={`catalog-price-${id}-unit`}
              />
            </div>
          </div>)}
        </fieldset> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.actions}>
          {isEditing && onDelete ? <button
            type="button"
            className={styles.delete}
            onClick={() => { setError(onDelete()); }}
          >{t(isProduct ? "Delete product" : "Delete license")}</button> : null}
          <button type="button" onClick={onClose}>{t("Cancel")}</button>
          <button type="submit" className={styles.submit}>{isEditing ? t("Save changes") : title}</button>
        </div>
      </form>
    </dialog>
  );
}
