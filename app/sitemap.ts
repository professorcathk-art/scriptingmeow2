import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://designermeow.com";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/create-post`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/discover`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/try-style`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/features`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
