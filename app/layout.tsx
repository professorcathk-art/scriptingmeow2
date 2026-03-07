import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://designermeow.com"),
  title: "designermeow - AI Instagram Post Generator | Turn Your Brand Into Viral Posts",
  description:
    "Create consistent, on-brand Instagram posts in minutes. AI-powered design for creators and brands. Steal winning aesthetics, define your brand once, and generate viral content.",
  keywords: ["Instagram post generator", "AI Instagram", "brand content", "social media design", "Instagram design tool"],
  openGraph: {
    title: "designermeow - AI Instagram Post Generator",
    description: "Turn your brand identity into consistent, on-brand IG posts in a few clicks",
    url: "https://designermeow.com",
    siteName: "designermeow",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "designermeow - AI Instagram Post Generator",
    description: "Turn your brand identity into consistent, on-brand IG posts in a few clicks",
  },
  robots: {
    index: true,
    follow: true,
  },
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
