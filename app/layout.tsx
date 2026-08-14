import type { Metadata } from "next";
import { headers } from "next/headers";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { AppProvider } from "./providers";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "Coursemap · Your ANU degree, mapped",
    description:
      "A clear, modern degree roadmap for courses, prerequisites, majors and approvals.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
