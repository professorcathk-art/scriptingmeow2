import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "designermeow - AI Instagram Post Generator",
  description:
    "Turn your brand identity into consistent, on-brand IG posts in a few clicks",
  metadataBase: new URL("https://designermeow.com"),
  icons: {
    icon: "/thumnail/Gemini_Generated_Image_3skk0k3skk0k3skk.png",
    shortcut: "/thumnail/Gemini_Generated_Image_3skk0k3skk0k3skk.png",
    apple: "/thumnail/Gemini_Generated_Image_3skk0k3skk0k3skk.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
