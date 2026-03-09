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
  title: "designermeow - AI Instagram Post Generator | Content Creators Create IG Posts with Nano Banana",
  description:
    "Let content creators use AI to create Instagram posts with Nano Banana. designermeow helps creators and brands generate consistent, on-brand IG posts in minutes. AI-powered design, brandbook, and viral content.",
  keywords: [
    "content creator",
    "AI Instagram post",
    "Nano Banana",
    "Instagram post generator",
    "AI Instagram",
    "create IG posts with AI",
    "social media design",
    "Instagram design tool",
  ],
  openGraph: {
    title: "designermeow - Content Creators Create IG Posts with AI & Nano Banana",
    description: "Let content creators use AI to create Instagram posts with Nano Banana. Generate on-brand IG content in minutes.",
    url: "https://designermeow.com",
    siteName: "designermeow",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "designermeow - Content Creators Create IG Posts with AI & Nano Banana",
    description: "Let content creators use AI to create Instagram posts with Nano Banana. Generate on-brand IG content in minutes.",
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "ai-content-declaration": "This site helps content creators use AI to create Instagram posts with Nano Banana image generation.",
  },
  icons: {
    icon: "/thumnail/Gemini_Generated_Image_3skk0k3skk0k3skk.png",
    shortcut: "/thumnail/Gemini_Generated_Image_3skk0k3skk0k3skk.png",
    apple: "/thumnail/Gemini_Generated_Image_3skk0k3skk0k3skk.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "designermeow",
  description:
    "Let content creators use AI to create Instagram posts with Nano Banana. AI-powered Instagram post generator for creators and brands.",
  url: "https://designermeow.com",
  applicationCategory: "DesignApplication",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "AI Instagram post generation",
    "Content creator tools",
    "Nano Banana image generation",
    "Brandbook and on-brand design",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
