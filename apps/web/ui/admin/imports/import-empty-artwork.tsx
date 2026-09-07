import s from "@/ui/common/error-artwork/error-artwork.module.css";

export type ImportEmptyKind =
  "database" | "source" | "preview" | "pipeline" | "model";

export function ImportEmptyArtwork({ kind }: { kind: ImportEmptyKind }) {
  return (
    <svg
      className={s.art}
      viewBox="0 0 240 170"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <ellipse className={s.dashed} cx="120" cy="145" rx="76" ry="9" />
      {kind === "database" ? (
        <>
          <path
            className={s.surface}
            d="M57 79v40c0 13 28 23 63 23s63-10 63-23V79"
          />
          <path className={s.line} d="M57 99c0 13 28 23 63 23s63-10 63-23" />
          <ellipse className={s.surface} cx="120" cy="79" rx="63" ry="23" />
          <ellipse className={s.dashed} cx="120" cy="79" rx="38" ry="12" />
          <g className={s.breathe}>
            <rect
              className={s.paper}
              x="95"
              y="25"
              width="50"
              height="35"
              rx="6"
            />
            <path
              className={s.accent}
              d="M106 37h28m-28 11h16M120 66v17m-6-6 6 6 6-6"
            />
          </g>
          <circle className={s.dot} cx="165" cy="113" r="2.5" />
        </>
      ) : kind === "source" ? (
        <>
          <path className={s.surface} d="M66 39h78l21 21v77H66z" />
          <path
            className={s.line}
            d="M144 39v21h21M81 79h42m-42 12h58m-58 12h34"
          />
          <g className={s.breathe}>
            <rect
              className={s.paper}
              x="112"
              y="86"
              width="65"
              height="45"
              rx="8"
            />
            <path
              className={s.accent}
              d="m131 99-9 9 9 9m25-18 9 9-9 9m-10-21-6 25"
            />
          </g>
          <path className={s.dashed} d="M49 62H35v55h17M184 65h18v30" />
        </>
      ) : kind === "preview" ? (
        <>
          <rect
            className={s.surface}
            x="46"
            y="34"
            width="148"
            height="106"
            rx="10"
          />
          <path className={s.line} d="M46 57h148M62 46h1m7 0h1m7 0h1" />
          <rect
            className={s.dashed}
            x="62"
            y="72"
            width="116"
            height="52"
            rx="5"
          />
          <g className={s.breathe}>
            <path className={s.paper} d="m109 80 27 18-27 18z" />
          </g>
          <path className={s.accent} d="M201 24v12m-6-6h12M33 112v8m-4-4h8" />
        </>
      ) : (
        <>
          <path className={s.dashed} d="M56 87h128" />
          <rect
            className={s.surface}
            x="32"
            y="64"
            width="46"
            height="46"
            rx="12"
          />
          <rect
            className={s.surface}
            x="162"
            y="64"
            width="46"
            height="46"
            rx="12"
          />
          <g className={s.breathe}>
            <rect
              className={s.paper}
              x="96"
              y="51"
              width="48"
              height="72"
              rx="12"
            />
            <path className={s.accent} d="M110 77h20m-20 10h20m-20 10h12" />
          </g>
          <path className={s.line} d="M46 79h18m-18 8h13m113-9h20v18h-20z" />
          <path className={s.accent} d="M120 26v10m-5-5h10" />
        </>
      )}
    </svg>
  );
}
