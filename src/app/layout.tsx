import type { Metadata } from "next";
import { Jost, Karla } from "next/font/google";
import "./globals.css";
import "./werkstatt.css";

const display = Jost({
  variable: "--font-jost",
  weight: "700",
  subsets: ["latin"],
});

const body = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Football strategist — Football strategy analysis",
  description:
    "Review football match clips, explore tactical patterns, and build a focused analyst review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
