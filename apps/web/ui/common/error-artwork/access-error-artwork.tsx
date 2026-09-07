import s from "./error-artwork.module.css";

export function AccessErrorArtwork() {
  return (
    <svg
      className={s.art}
      viewBox="0 0 240 170"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <>
        {" "}
        <path className={s.line} d="M101 39V25a19 19 0 0 1 38 0v14" />
        <g className={s.pass}>
          <rect
            className={s.surface}
            x="75"
            y="38"
            width="90"
            height="109"
            rx="10"
          />
          <path className={s.line} d="M107 49h26" />
          <circle className={s.accent} cx="120" cy="80" r="12" />
          <path className={s.accent} d="M100 110a20 20 0 0 1 40 0" />
          <path className={s.line} d="M105 127h30" />
        </g>
        <circle className={s.paper} cx="169" cy="122" r="19" />
        <path className={s.accent} d="M159 122h20" />{" "}
      </>
    </svg>
  );
}
