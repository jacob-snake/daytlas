import { brand } from "@/lib/brand-config";
import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.PUBLIC_SITE_URL ??
      process.env.DAYTLAS_PUBLIC_URL ??
      (process.env.NODE_ENV === "production"
        ? brand.publicUrl
        : "http://localhost:3001"),
  ),
  applicationName: brand.name,
  icons: {
    apple: { url: brand.assets.icon(180), type: "image/png", sizes: "180x180" },
    icon: { url: brand.assets.favicon, type: "image/x-icon", sizes: "any" },
  },
  appleWebApp: {
    capable: true,
    title: brand.name,
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: brand.title,
    description:
      "A thoughtful home for your Oura history. Explore long-term patterns with analysis on your device.",
  },
  twitter: { card: "summary_large_image" },
  title: brand.title,
  description:
    "Explore sleep, readiness and activity over time. An independent, open-source Oura dashboard with analysis on your device.",
};

export const viewport: Viewport = {
  themeColor: "#f8f8f5",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Providers>{children}</Providers>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
