"use client";

import { createContext, useRef } from "react";
import type { ReactNode, RefObject } from "react";

type LoadingProgress = { transform: string; capturedAt: number } | null;

export const LoadingProgressContext =
  createContext<RefObject<LoadingProgress> | null>(null);

export function LoadingProgressProvider({ children }: { children: ReactNode }) {
  const progress = useRef<LoadingProgress>(null);
  return (
    <LoadingProgressContext.Provider value={progress}>
      {children}
    </LoadingProgressContext.Provider>
  );
}
