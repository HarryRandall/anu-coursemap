"use client";

import { Moon, Sun } from "lucide-react";
import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  REUI_PREVIEW_BACKGROUNDS,
  REUI_PREVIEW_BACKGROUND_PROPERTY,
  REUI_PREVIEW_THEME_MESSAGE,
  useLabTheme,
} from "@/components/design-system/lab/lab-theme-provider";

type VisibilityListener = {
  setVisible: (visible: boolean) => void;
  virtualised: boolean;
};

const previewThemeChoices = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

const visibilityListeners = new Map<Element, VisibilityListener>();
let sharedObserver: IntersectionObserver | undefined;

function subscribeToHydration() {
  return () => {};
}

function getSharedObserver() {
  sharedObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const listener = visibilityListeners.get(entry.target);
        if (!listener) continue;

        if (entry.isIntersecting) {
          listener.setVisible(true);
          if (!listener.virtualised) {
            sharedObserver?.unobserve(entry.target);
            visibilityListeners.delete(entry.target);
          }
        } else if (listener.virtualised) {
          listener.setVisible(false);
        }
      }
    },
    { rootMargin: "720px 0px" },
  );

  return sharedObserver;
}

export function IsolatedCataloguePreviewFrame({
  src,
  title,
  interactive = false,
  virtualised = false,
  themeControl = false,
  height = 300,
}: {
  src: string;
  title: string;
  interactive?: boolean;
  virtualised?: boolean;
  themeControl?: boolean;
  height?: number;
}) {
  const { resolved, mounted } = useLabTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const visibleRef = useRef(false);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [visible, setVisible] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const [frameLoadTheme, setFrameLoadTheme] = useState<"light" | "dark" | null>(
    null,
  );
  const [themeOverride, setThemeOverride] = useState<"light" | "dark" | null>(
    null,
  );
  const previewTheme =
    themeOverride ?? (hydrated && mounted ? resolved : "light");
  const previewThemeRef = useRef(previewTheme);
  const previewBackground = REUI_PREVIEW_BACKGROUNDS[previewTheme];
  const inheritedPreviewBackground = `var(${REUI_PREVIEW_BACKGROUND_PROPERTY}, ${REUI_PREVIEW_BACKGROUNDS.light})`;
  const previewSurfaceStyle = {
    height,
    backgroundColor: inheritedPreviewBackground,
    ...(mounted
      ? { [REUI_PREVIEW_BACKGROUND_PROPERTY]: previewBackground }
      : {}),
  } as CSSProperties;
  const themedSrc = `${src}${src.includes("?") ? "&" : "?"}theme=${frameLoadTheme}`;

  useEffect(() => {
    previewThemeRef.current = previewTheme;
  }, [previewTheme]);

  const setPreviewVisible = useCallback((nextVisible: boolean) => {
    if (visibleRef.current === nextVisible) return;

    visibleRef.current = nextVisible;
    setVisible(nextVisible);
    setFrameReady(false);
    setFrameLoadTheme(nextVisible ? previewThemeRef.current : null);
  }, []);

  const sendPreviewTheme = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: REUI_PREVIEW_THEME_MESSAGE,
        theme: previewTheme,
      },
      window.location.origin,
    );
  }, [previewTheme]);

  useEffect(() => {
    sendPreviewTheme();
  }, [sendPreviewTheme]);

  const handleFrameLoad = useCallback(() => {
    sendPreviewTheme();
    setFrameReady(true);
  }, [sendPreviewTheme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = getSharedObserver();
    visibilityListeners.set(container, {
      setVisible: setPreviewVisible,
      virtualised,
    });
    observer.observe(container);
    return () => {
      observer.unobserve(container);
      visibilityListeners.delete(container);
      if (visibilityListeners.size === 0) {
        observer.disconnect();
        sharedObserver = undefined;
      }
    };
  }, [setPreviewVisible, virtualised]);

  return (
    <div className="w-full bg-primary">
      {themeControl && (
        <div className="flex items-center justify-end border-b border-secondary px-3 py-2">
          <div
            role="radiogroup"
            aria-label={`${title} preview colour theme`}
            className="flex items-center gap-0.5 rounded-lg bg-secondary p-1 ring-1 ring-secondary ring-inset"
          >
            {previewThemeChoices.map(({ value, label, icon: Icon }) => {
              const selected = previewTheme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setThemeOverride(value)}
                  className={`flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-semibold outline-focus-ring transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    selected
                      ? "bg-primary text-secondary shadow-xs ring-1 ring-primary ring-inset"
                      : "text-quaternary hover:text-secondary"
                  }`}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        aria-busy={visible && !frameReady}
        className="relative w-full overflow-hidden"
        style={previewSurfaceStyle}
      >
        {(!visible || !frameReady) && (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10"
            style={{ backgroundColor: inheritedPreviewBackground }}
          />
        )}
        {visible && frameLoadTheme && (
          <iframe
            ref={iframeRef}
            title={title}
            src={themedSrc}
            loading="eager"
            onLoad={handleFrameLoad}
            style={{
              backgroundColor: inheritedPreviewBackground,
              colorScheme: previewTheme,
            }}
            className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-150 ease-out motion-reduce:transition-none ${
              frameReady ? "opacity-100" : "opacity-0"
            } ${interactive ? "" : "pointer-events-none"}`}
          />
        )}
      </div>
    </div>
  );
}

export function ReuiCataloguePreviewFrame({
  category,
  example,
  ...props
}: Omit<Parameters<typeof IsolatedCataloguePreviewFrame>[0], "src"> & {
  category: string;
  example: string;
}) {
  return (
    <IsolatedCataloguePreviewFrame
      {...props}
      src={`/design-system/reui/preview/${category}/${example}`}
    />
  );
}
