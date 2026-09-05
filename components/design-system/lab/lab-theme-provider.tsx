"use client";

import type { ReactNode } from "react";
import Script from "next/script";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export type ThemeChoice = "light" | "dark" | "system";

export const REUI_PREVIEW_THEME_MESSAGE = "coursemap-reui-preview-theme";
export const REUI_PREVIEW_BACKGROUND_PROPERTY =
  "--coursemap-reui-preview-background";
export const REUI_PREVIEW_BACKGROUNDS = {
  light: "oklch(1 0 0)",
  dark: "oklch(0.145 0 0)",
} as const;

const STORAGE_KEY = "coursemap.untitled-lab.theme";
const CHANGE_EVENT = "coursemap-lab-theme";

const THEME_BOOTSTRAP_SCRIPT = `(() => {
  try {
    const root = document.documentElement;
    const preview = location.pathname.startsWith("/design-system/reui/preview/") ||
      location.pathname.startsWith("/design-system/review/preview/") ||
      location.pathname.startsWith("/design-system/shortlist/preview/");
    const forced = preview ? new URLSearchParams(location.search).get("theme") : null;
    const stored = localStorage.getItem("${STORAGE_KEY}");
    const choice = forced === "light" || forced === "dark"
      ? forced
      : stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    const resolved = choice === "system"
      ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : choice;
    root.classList.toggle("dark-mode", resolved === "dark");
    root.style.colorScheme = resolved;
    root.style.setProperty(
      "${REUI_PREVIEW_BACKGROUND_PROPERTY}",
      resolved === "dark"
        ? "${REUI_PREVIEW_BACKGROUNDS.dark}"
        : "${REUI_PREVIEW_BACKGROUNDS.light}",
    );
  } catch {}
})();`;

function readStoredTheme(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Private browsing or blocked storage. Fall through to the default.
  }
  return "system";
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readForcedPreviewTheme(): "light" | "dark" | null {
  if (
    !window.location.pathname.startsWith("/design-system/reui/preview/") &&
    !window.location.pathname.startsWith("/design-system/review/preview/") &&
    !window.location.pathname.startsWith("/design-system/shortlist/preview/")
  ) {
    return null;
  }

  const theme = new URLSearchParams(window.location.search).get("theme");
  return theme === "light" || theme === "dark" ? theme : null;
}

type PreviewThemeMessage = {
  type: typeof REUI_PREVIEW_THEME_MESSAGE;
  theme: "light" | "dark";
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
    finished: Promise<void>;
  };
};

function isPreviewThemeMessage(value: unknown): value is PreviewThemeMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<PreviewThemeMessage>;
  return (
    message.type === REUI_PREVIEW_THEME_MESSAGE &&
    (message.theme === "light" || message.theme === "dark")
  );
}

function applyDocumentTheme(
  root: HTMLElement,
  next: "light" | "dark",
  animate: boolean,
) {
  const update = () => {
    root.classList.toggle("dark-mode", next === "dark");
    root.style.colorScheme = next;
    root.style.setProperty(
      REUI_PREVIEW_BACKGROUND_PROPERTY,
      REUI_PREVIEW_BACKGROUNDS[next],
    );
  };
  const themeChanged =
    root.classList.contains("dark-mode") !== (next === "dark");
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const transitionDocument = document as ViewTransitionDocument;

  if (
    !animate ||
    !themeChanged ||
    reduceMotion ||
    !transitionDocument.startViewTransition
  ) {
    update();
    return;
  }

  try {
    const transition = transitionDocument.startViewTransition(update);
    void transition.ready.catch(() => {});
    void transition.updateCallbackDone.catch(() => {});
    void transition.finished.catch(() => {});
  } catch {
    update();
  }
}

type ThemeContextValue = {
  theme: ThemeChoice;
  resolved: "light" | "dark";
  setTheme: (theme: ThemeChoice) => void;
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useLabTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value)
    throw new Error("useLabTheme must be used inside LabThemeProvider");
  return value;
}

/**
 * Untitled UI's dark mode is a `dark-mode` class, declared as a custom variant
 * in app/design-system/design-system.css.
 *
 * The class goes on the document element rather than a laboratory container
 * because React Aria portals its overlays (popovers, menus, modals, tooltips)
 * to document.body. Scoping it to a container left every overlay rendering in
 * light mode over a dark page.
 *
 * The stored choice is read through useSyncExternalStore so the server snapshot
 * ("system") is what hydration compares against, and it is removed on unmount so
 * navigating out of this development-only route does not leave the rest of the
 * application themed.
 */
export function LabThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribe,
    readStoredTheme,
    () => "system" as const,
  );
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const [previewThemeOverride, setPreviewThemeOverride] = useState<
    "light" | "dark" | null
  >(null);
  const hasAppliedTheme = useRef(false);

  useEffect(() => {
    if (
      !window.location.pathname.startsWith("/design-system/reui/preview/") &&
      !window.location.pathname.startsWith("/design-system/review/preview/") &&
      !window.location.pathname.startsWith("/design-system/shortlist/preview/")
    ) {
      return;
    }

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin === window.location.origin &&
        event.source === window.parent &&
        isPreviewThemeMessage(event.data)
      ) {
        setPreviewThemeOverride(event.data.theme);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const query = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const forcedPreviewTheme =
        previewThemeOverride ?? readForcedPreviewTheme();
      const next = forcedPreviewTheme
        ? forcedPreviewTheme
        : theme === "system"
          ? query.matches
            ? "dark"
            : "light"
          : theme;
      setResolved(next);
      setMounted(true);
      applyDocumentTheme(root, next, hasAppliedTheme.current);
      hasAppliedTheme.current = true;
    };

    apply();
    query.addEventListener("change", apply);

    return () => {
      query.removeEventListener("change", apply);
    };
  }, [previewThemeOverride, theme]);

  useEffect(() => {
    const root = document.documentElement;
    return () => {
      root.classList.remove("dark-mode");
      root.style.colorScheme = "";
      root.style.removeProperty(REUI_PREVIEW_BACKGROUND_PROPERTY);
    };
  }, []);

  const setTheme = useCallback((next: ThemeChoice) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage is unavailable. Still notify so the choice applies to this view.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({ theme, resolved, setTheme, mounted }),
    [theme, resolved, setTheme, mounted],
  );

  return (
    <>
      <Script
        id="coursemap-lab-theme"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
      />
      <ThemeContext.Provider value={value}>
        <div className="uui-lab">{children}</div>
      </ThemeContext.Provider>
    </>
  );
}
