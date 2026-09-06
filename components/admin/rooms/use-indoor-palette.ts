"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  DEFAULT_INDOOR_PALETTE,
  INDOOR_PALETTE_KEYS,
  INDOOR_SPACE_FILL_KEYS,
  type IndoorPalette,
} from "@/lib/rooms/indoor-palette";

function kebab(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Turns any CSS colour the browser understands, including the oklch values the
 * design tokens use, into the rgba form MapLibre can parse. A 1x1 canvas is
 * the only conversion path that follows the browser's own colour maths.
 */
function createColourConverter() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  return (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    context.clearRect(0, 0, 1, 1);
    // An unparseable colour leaves the previous fill in place, so a sentinel
    // nobody would use as a token tells the two apart.
    context.fillStyle = "#010203";
    context.fillStyle = trimmed;
    if (
      context.fillStyle === "#010203" &&
      trimmed.toLowerCase() !== "#010203"
    ) {
      return null;
    }
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
    return `rgba(${red}, ${green}, ${blue}, ${(alpha / 255).toFixed(3)})`;
  };
}

/** Reads the `--indoor-*` roles from an element carrying the editor theme class. */
export function resolveIndoorPalette(element: HTMLElement): IndoorPalette {
  const converter = createColourConverter();
  if (!converter) return DEFAULT_INDOOR_PALETTE;
  const convert = converter;
  const styles = getComputedStyle(element);

  function role(name: string, fallback: string) {
    return convert(styles.getPropertyValue(`--indoor-${name}`)) ?? fallback;
  }

  const palette: Record<string, unknown> = {};
  for (const key of INDOOR_PALETTE_KEYS) {
    palette[key] = role(kebab(key), DEFAULT_INDOOR_PALETTE[key]);
  }
  const spaceFills: Record<string, string> = {};
  for (const key of INDOOR_SPACE_FILL_KEYS) {
    spaceFills[key] = role(
      `space-${key}`,
      DEFAULT_INDOOR_PALETTE.spaceFills[key] ??
        DEFAULT_INDOOR_PALETTE.spaceFallback,
    );
  }
  return { ...palette, spaceFills } as IndoorPalette;
}

/**
 * The palette for the current theme, refreshed when the theme class on the
 * document changes. `next-themes` toggles that class without a reload, so the
 * map has to be told rather than left painted for the previous theme.
 */
export function useIndoorPalette(rootRef: RefObject<HTMLElement | null>) {
  const [palette, setPalette] = useState<IndoorPalette>(DEFAULT_INDOOR_PALETTE);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let frame = 0;
    function refresh() {
      window.cancelAnimationFrame(frame);
      // Wait a frame so the new theme's custom properties have been computed.
      frame = window.requestAnimationFrame(() => {
        if (rootRef.current) setPalette(resolveIndoorPalette(rootRef.current));
      });
    }

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [rootRef]);

  return palette;
}
