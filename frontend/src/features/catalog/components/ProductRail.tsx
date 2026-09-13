import { useI18n } from "@/shared/i18n/context";
import { Icon } from "@/components/ui/Icon";
import { classNames } from "@/shared/utils/classNames";
import type { CatalogProduct } from "../types";
import { resolveProductIcon } from "../productIcon";
import { ProductIcon } from "./ProductIcon";
import styles from "./ProductRail.module.scss";

interface ProductRailProps {
  products: CatalogProduct[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddProduct: () => void;
  editing: boolean;
}

export function ProductRail({ products, selectedId, onSelect, onAddProduct, editing }: ProductRailProps) {
  const { t } = useI18n();
  return (
    <nav className={styles.rail} aria-label={t("Products")}>
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          className={classNames(styles.product, product.id === selectedId && styles.selected)}
          aria-label={product.name}
          aria-pressed={product.id === selectedId}
          title={product.name}
          onClick={() => onSelect(product.id)}
        >
          <ProductIcon id={resolveProductIcon(product)} />
          <span><bdi dir="ltr">{product.shortName}</bdi></span>
        </button>
      ))}
      {editing ? <button type="button" className={styles.add} onClick={onAddProduct} aria-label={t("Add product")} title={t("Add product")}>
        <Icon name="plus" />
      </button> : null}
    </nav>
  );
}
