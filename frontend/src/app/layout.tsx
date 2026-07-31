import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "🍋 LeMonaide — Autonomous EvidenceOps",
  description: "Autonomous ML failure discovery, causal experiment compilation, and evidence graph platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#0b0d13] text-[#f0f4f8]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
