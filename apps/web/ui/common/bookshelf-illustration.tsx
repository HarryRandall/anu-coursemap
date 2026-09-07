import styles from "./planning-illustrations.module.css";

export function BookshelfIllustration() {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 240 170"
      fill="none"
      aria-hidden="true"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <>
        <path className={styles.line} d="M45 130h150m-139 0v9m128-9v9" />
        <rect
          className={styles.surface}
          x="66"
          y="62"
          width="30"
          height="67"
          rx="5"
        />
        <path className={styles.line} d="M74 73h14m-14 6h14m-14 38h14" />
        <rect
          className={styles.surface}
          x="100"
          y="76"
          width="30"
          height="53"
          rx="5"
        />
        <path className={styles.line} d="M108 87h14m-14 6h14" />
        <g className={styles.book}>
          <rect
            className={styles.disc}
            x="141"
            y="35"
            width="31"
            rx="5"
            height="70"
          />
          <path className={styles.accent} d="M149 47h15m-15 6h15m-15 40h15" />
        </g>
        <path className={styles.dashed} d="M140 128h35" />
      </>
    </svg>
  );
}
