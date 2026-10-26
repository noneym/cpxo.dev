import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const jet = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jet", display: "swap" });

export const metadata: Metadata = {
  title: "cpxo",
  description: "Copy on your iPhone, paste on Windows. Drop files from any shell with one curl command. Links live for 7 days.",
  metadataBase: new URL(process.env.APP_URL ?? "https://cpxo.dev"),
  openGraph: { title: "cpxo", description: "Copy here. Paste anywhere.", siteName: "cpxo" },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${jet.variable}`}>
      <body>{children}</body>
    </html>
  );
}
