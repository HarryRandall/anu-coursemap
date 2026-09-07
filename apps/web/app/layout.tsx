import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { cookies } from "next/headers";
import Script from "next/script";
import { AppThemeProvider } from "@/ui/shell/app-theme-provider";
import { SIDEBAR_STATE_COOKIE } from "@/ui/shell/sidebar-cookie";
import { SidebarPreferenceProvider } from "@/ui/shell/sidebar-preference";
import { getAuthContext } from "@/lib/auth/viewer";
import { loadCoursemapState } from "@/lib/coursemap/state";
import type { Attempt } from "@/lib/coursemap/types";
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
      icon: [{ url: "/icon-32.png?v=3", sizes: "32x32", type: "image/png" }],
      shortcut: "/icon-32.png?v=3",
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
  const initialState =
    !demoMode && viewer ? await loadCoursemapState(viewer) : undefined;
  const demoInitialAttempts: Attempt[] | undefined = demoMode
    ? (await import("@/lib/catalogue")).initialAttempts
    : undefined;
  // The sidebar writes its open state to a cookie; reading it here keeps a
  // collapsed rail collapsed on the next server render.
  const sidebarDefaultOpen =
    (await cookies()).get(SIDEBAR_STATE_COOKIE)?.value !== "false";

  return (
    <html lang="en" suppressHydrationWarning>
      {/* style-nova activates the vendored ReUI component styles product-wide. */}
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} style-nova`}
      >
        <Script id="coursemap-theme-init" strategy="beforeInteractive">
          {`(() => {
            let theme = "system";
            try { theme = localStorage.getItem("coursemap.theme") || "system"; } catch {}
            const dark = theme === "dark" || (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
            const root = document.documentElement;
            root.classList.remove("light", "dark-mode");
            root.classList.add(dark ? "dark-mode" : "light");
            root.style.colorScheme = dark ? "dark" : "light";
          })();`}
        </Script>
        <AppThemeProvider>
          <AppProvider
            demoMode={demoMode}
            viewer={viewer}
            canAccessAdmin={canAccessAdmin}
            demoInitialAttempts={demoInitialAttempts}
            initialState={initialState}
          >
            <SidebarPreferenceProvider defaultOpen={sidebarDefaultOpen}>
              {children}
            </SidebarPreferenceProvider>
          </AppProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
