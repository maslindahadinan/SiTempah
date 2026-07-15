import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SiTempah | ADTEC JTM Kampus Batu Pahat",
  description: "Sistem Tempahan Fasiliti Gunasama - ADTEC JTM Kampus Batu Pahat. Platform dalam talian untuk tempahan bilik mesyuarat, dewan, makmal komputer dan bilik seminar.",
  keywords: ["SiTempah", "ADTEC", "JTM", "tempahan fasiliti", "booking system", "kampus batu pahat"],
  authors: [{ name: "ADTEC JTM Kampus Batu Pahat" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}
