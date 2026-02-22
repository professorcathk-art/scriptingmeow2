import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScriptingMeow - AI Instagram Post Generator",
  description: "Turn your brand identity into consistent, on-brand IG posts in a few clicks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
