import type { MetadataRoute } from "next";

const disallow = ["/api/", "/auth/", "/billing"];

/** Default crawl + explicit allows for AI / LLM crawlers (AEO). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "CCBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
    ],
    sitemap: "https://designermeow.com/sitemap.xml",
    host: "https://designermeow.com",
  };
}
