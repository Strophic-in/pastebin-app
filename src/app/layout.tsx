import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { siteDescription, siteName, siteUrl } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pastebin — Free Encrypted Text, Link & Image Sharing",
    template: "%s · Pastebin",
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: "Strophic" }],
  creator: "Strophic",
  keywords: [
    "pastebin",
    "encrypted pastebin",
    "secure pastebin",
    "private pastebin",
    "share text online",
    "share code snippets",
    "self-destructing notes",
    "burn after reading",
    "password protected paste",
    "end-to-end encryption",
    "zero-knowledge encryption",
    "share images anonymously",
    "temporary file sharing",
    "expiring links",
  ],
  category: "technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: "Pastebin — Free Encrypted Text, Link & Image Sharing",
    description: siteDescription,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pastebin — Free Encrypted Text, Link & Image Sharing",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
