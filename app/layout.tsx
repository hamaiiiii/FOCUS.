import type { Metadata, Viewport } from "next";
import { Inter, Inria_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const inriaSans= Inria_Sans({
  weight:["300","400","700"],
  variable:"--font-inria-sans",
  subsets:["latin"],
});

export const metadata: Metadata = {
  title: "FOCUS.",
  description: "勉強だけに集中するためのアプリ",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${inriaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
