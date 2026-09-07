import s from "./error-artwork.module.css";

export function SigninErrorArtwork() {
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
        <g className={s.ticket}>
          <path
            className={s.surface}
            d="M57 48h126v24a13 13 0 0 0 0 26v24H57V98a13 13 0 0 0 0-26Z"
          />
          <path className={s.dashed} d="M145 50v70" />
          <path className={s.line} d="M77 68h45m-45 10h32m-32 25h20" />
        </g>
        <circle className={s.paper} cx="160" cy="116" r="24" />
        <path className={s.accent} d="M160 100v16l10 5" />
        <circle
          className={`${s.dot} ${s.breathe}`}
          cx="160"
          cy="116"
          r="2"
        />{" "}
      </>
    </svg>
  );
}
