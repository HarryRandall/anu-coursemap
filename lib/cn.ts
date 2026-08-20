import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type { ClassValue };

/** Combine conditional classes and resolve conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
