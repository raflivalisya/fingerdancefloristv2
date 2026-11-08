import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finger Dance Florist V2 | Flowers, Moments & Memories",
  description: "Katalog Finger Dance Florist V2 — temukan rangkaian bunga dan hadiah spesial.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
