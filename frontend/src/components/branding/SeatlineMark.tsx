import styles from "./SeatlineMark.module.scss";

const mark = `${import.meta.env.BASE_URL}branding/seatline-mark.svg`;

export function SeatlineMark() {
  return <span className={styles.mark} aria-hidden="true" style={{ maskImage: `url("${mark}")` }} />;
}
