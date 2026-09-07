"use client";

/**
 * Root-level failure page. It replaces the entire root layout, so it must
 * render its own html and body and stay dependency-free: the design system,
 * theme provider and app state may be the very thing that crashed.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#fafafa",
          color: "#18181b",
        }}
      >
        <main style={{ padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#52525b", fontSize: "0.875rem" }}>
            An unexpected error stopped this page from loading.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #d4d4d8",
              background: "#ffffff",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
