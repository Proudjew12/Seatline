import { useI18n } from "@/shared/i18n/context";

import { BILLING_OPTIONS } from "../types";
import type { BillingOption } from "../types";
import styles from "./BillingSelect.module.scss";

interface BillingSelectProps {
  id?: string;
  value: BillingOption;
  onChange: (value: BillingOption) => void;
}

export function BillingSelect({ id, value, onChange }: BillingSelectProps) {
  const { t } = useI18n();
  return (
    <select id={id} className={styles.select} value={value} onChange={(event) => {
      const option = BILLING_OPTIONS.find((candidate) => candidate.id === event.target.value);
      if (option) onChange(option.id);
    }}>
      {BILLING_OPTIONS.map((option) => <option key={option.id} value={option.id}>{t(option.label)}</option>)}
    </select>
  );
}
