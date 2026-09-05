import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@fontsource-variable/inter";
import "./design-system.css";
import { LabThemeProvider } from "@/components/design-system/lab/lab-theme-provider";

export const metadata: Metadata = {
  title: "Coursemap x Untitled UI laboratory",
  description:
    "A development-only reference implementation of Untitled UI for Coursemap.",
  robots: { index: false, follow: false },
};

export default function DesignSystemLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (process.env.NODE_ENV !== "development") notFound();

  return <LabThemeProvider>{children}</LabThemeProvider>;
}
