import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastContainer } from "@/components/ui/Toast";
import { env } from "@/config/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteDescription =
  "Vendora is a multi-vendor marketplace — shop physical and digital products from independent sellers, or open your own store.";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: "Vendora — Multi-Vendor Marketplace",
    template: "%s | Vendora",
  },
  description: siteDescription,
  openGraph: {
    siteName: "Vendora",
    title: "Vendora — Multi-Vendor Marketplace",
    description: siteDescription,
    type: "website",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vendora — Multi-Vendor Marketplace",
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
        <ToastContainer />
      </body>
    </html>
  );
}
