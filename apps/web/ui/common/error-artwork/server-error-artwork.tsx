import s from "./error-artwork.module.css";

export function ServerErrorArtwork() {
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
        <rect
          className={s.surface}
          x="65"
          y="34"
          width="110"
          height="32"
          rx="8"
        />
        <rect
          className={s.surface}
          x="65"
          y="104"
          width="110"
          height="32"
          rx="8"
        />
        <path className={s.line} d="M81 50h29m-29 70h29" />
        <circle className={s.dot} cx="157" cy="50" r="3" />
        <circle className={`${s.dot} ${s.breathe}`} cx="157" cy="120" r="3" />
        <path className={s.dashed} d="M120 66v38" />
        <g className={s.slideLeft}>
          <path className={s.accent} d="M84 84h23m0-7v14m-3-11h6m-6 8h6" />
        </g>
        <g className={s.slideRight}>
          <path className={s.accent} d="M156 84h-23m0-7v14m-6-10h6m-6 6h6" />
        </g>{" "}
      </>
    </svg>
  );
}
