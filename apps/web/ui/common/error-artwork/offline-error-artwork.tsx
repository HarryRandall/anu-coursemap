import s from "./error-artwork.module.css";

export function OfflineErrorArtwork() {
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
          x="70"
          y="109"
          width="100"
          height="29"
          rx="8"
        />
        <path className={s.line} d="M82 109V77m76 32V77m-61 48h.1m8 0h.1" />
        <circle className={`${s.dot} ${s.breathe}`} cx="149" cy="124" r="3" />
        <path className={`${s.accent} ${s.waveOne}`} d="M108 86q12-10 24 0" />
        <path className={`${s.accent} ${s.waveTwo}`} d="M94 70 q26-22 52 0" />
        <path className={`${s.accent} ${s.waveThree}`} d="M80 55q40-34 80 0" />
        <circle className={s.dot} cx="120" cy="98" r="3" />{" "}
      </>
    </svg>
  );
}
