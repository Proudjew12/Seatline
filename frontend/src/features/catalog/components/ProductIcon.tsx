import { DEFAULT_PRODUCT_ICON, findProductIcon } from "../icons/productIcons";
import type { ProductIconDefinition } from "../icons/productIcons";
import { classNames } from "@/shared/utils/classNames";
import styles from "./ProductIcon.module.scss";

export function ProductIcon({ id }: { id: string }) {
  const icon: ProductIconDefinition = findProductIcon(id) ?? DEFAULT_PRODUCT_ICON;
  return <span className={classNames(styles.icon, icon.wordmark && styles.wordmark)} data-product-icon={icon.id} aria-hidden="true"
    style={{ maskImage: `url("${icon.src}")` }} />;
}
