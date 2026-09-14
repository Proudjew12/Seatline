import { classNames } from "@/shared/utils/classNames";
import styles from "./SeatlineWordmark.module.scss";

interface SeatlineWordmarkProps {
  size?: "header" | "preview";
}

const wordmark = `${import.meta.env.BASE_URL}branding/seatline-wordmark.svg`;
const accent = `${import.meta.env.BASE_URL}branding/seatline-wordmark-accent.svg`;

export function SeatlineWordmark({ size = "header" }: SeatlineWordmarkProps) {
  return (
    <span className={classNames(styles.wordmark, size === "preview" && styles.preview)} role="img" aria-label="Seatline" dir="ltr">
      <span className={styles.lettering} aria-hidden="true" style={{ maskImage: `url("${wordmark}")` }} />
      <span className={styles.accent} aria-hidden="true" style={{ maskImage: `url("${accent}")` }} />
    </span>
  );
}
