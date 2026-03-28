import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { jsonLdScriptContent, organizationJsonLd, softwareApplicationJsonLd } from "@/lib/seo/landing-jsonld";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const SITE = "https://designermeow.com";
const OG_IMAGE = `${SITE}/thumnail/Gemini_Generated_Image_3skk0k3skk0k3skk.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "designermeow — AI Instagram Post Generator for Creators & Brands",
    template: "%s | designermeow",
  },
  description:
    "designermeow.com is an AI Instagram post generator: define your brand DNA in a Brand Space, prompt the AI studio for single or carousel posts, and generate on-brand visuals (including Nano Banana). Web app for content creators, agencies, and brands.",
  keywords: [
    "AI Instagram post generator",
    "designermeow",
    "Nano Banana",
    "content creator",
    "AI IG posts",
    "Instagram carousel AI",
    "brandbook Instagram",
    "social media design AI",
  ],
  authors: [{ name: "designermeow", url: SITE }],
  creator: "designermeow",
  publisher: "designermeow",
  openGraph: {
    title: "designermeow — AI Instagram Post Generator (Web App)",
    description:
      "Generate on-brand Instagram posts and carousels from your brandbook and prompts. AI design tool for creators—designermeow.com.",
    url: SITE,
    siteName: "designermeow",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "designermeow AI Instagram post generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "designermeow — AI Instagram Post Generator",
    description:
      "Web-based AI tool to create on-brand Instagram posts and carousels. Brand Space, prompts, Nano Banana visuals.",
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: { canonical: SITE },
  other: {
    "ai-content-declaration":
      "designermeow helps users create Instagram posts with AI-assisted design and image generation; disclose AI use per platform rules.",
  },
  icons: {
    icon: "/thumnail/Gemini_Generated_Image_3skk0k3skk0k3skk.png",
    shortcut: "/thumnail/Gemini_Generated_Image_3skk0k3skk0k3skk.png",
    apple: "/thumnail/Gemini_Generated_Image_3skk0k3skk0k3skk.png",
  },
};

const rootGraphJsonLd = {
  "@context": "https://schema.org",
  "@graph": [organizationJsonLd, softwareApplicationJsonLd],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(rootGraphJsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
