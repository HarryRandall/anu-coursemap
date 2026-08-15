import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { getAuthContext } from "@/lib/auth/viewer";
import { getCanonicalSiteOrigin, isDemoMode } from "@/lib/supabase/config";
import "./globals.css";
import { AppProvider } from "./providers";

export async function generateMetadata(): Promise<Metadata> {
  const origin = getCanonicalSiteOrigin() ?? "http://localhost:3000";

  return {
    title: "Coursemap · Your ANU degree, mapped",
    description:
      "A clear, modern degree roadmap for courses, prerequisites, majors and approvals.",
    manifest: "/site.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.svg?v=3", type: "image/svg+xml" },
        { url: "/favicon.ico?v=3", sizes: "32x32", type: "image/x-icon" },
        { url: "/icon-32.png?v=3", sizes: "32x32", type: "image/png" },
      ],
      shortcut: "/favicon.ico?v=3",
      apple: [
        {
          url: "/apple-touch-icon.png?v=3",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    openGraph: {
      title: "Coursemap · Your ANU degree, mapped",
      description:
        "See what counts, what unlocks next and where every course fits.",
      type: "website",
      images: [
        {
          url: `${origin}/og.png`,
          width: 1536,
          height: 896,
          alt: "Coursemap degree roadmap preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Coursemap · Your ANU degree, mapped",
      description:
        "See what counts, what unlocks next and where every course fits.",
      images: [`${origin}/og.png`],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const demoMode = isDemoMode();
  const { viewer, canAccessAdmin } = await getAuthContext();

  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <AppProvider
          demoMode={demoMode}
          viewer={viewer}
          canAccessAdmin={canAccessAdmin}
        >
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
