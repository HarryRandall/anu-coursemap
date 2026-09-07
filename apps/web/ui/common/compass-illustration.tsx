import styles from "./planning-illustrations.module.css";

export function CompassIllustration() {
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
        <circle className={styles.dashed} cx="120" cy="88" r="64" />
        <circle className={styles.surface} cx="120" cy="88" r="48" />
        <path
          className={styles.line}
          d="M120 46v7m0 70v7M78 88h7m70 0h7m-71-29 5 5m48 48 5 5m-58 0 5-5m48-48 5-5"
        />
        <path className={styles.accent} d="M115 14v10m0-10 10 10V14" />
        <g className={styles.needle}>
          <path className={styles.disc} d="m120 57 11 31-11 31-11-31Z" />
          <path className={styles.purple} d="m120 57 11 31h-22Z" />
        </g>
        <circle className={styles.surface} cx="120" cy="88" r="4" />
      </>
    </svg>
  );
}
