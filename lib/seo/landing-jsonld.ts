import { FAQ_ITEMS } from "@/lib/faq-data";

const SITE = "https://designermeow.com";
const LOGO_URL = `${SITE}/thumnail/Gemini_Generated_Image_3skk0k3skk0k3skk.png`;

export const organizationJsonLd = {
  "@type": "Organization",
  name: "designermeow",
  url: SITE,
  logo: {
    "@type": "ImageObject",
    url: LOGO_URL,
  },
  description:
    "designermeow is a web-based AI Instagram post generator for creators and brands—brandbook-driven design, Nano Banana image generation, and on-brand social content.",
};

export const softwareApplicationJsonLd = {
  "@type": "SoftwareApplication",
  name: "designermeow",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  url: SITE,
  description:
    "AI Instagram post generator: create on-brand square, portrait, story, and carousel posts from your brand DNA, prompts, and style references. Includes brandbook, RSS-to-post pipeline, and library.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier with monthly credits; paid plans for Starter and Creator.",
  },
  featureList: [
    "AI Instagram image generation",
    "Brand Space and brandbook",
    "Single-image and carousel posts",
    "Style gallery and Nano Banana visuals",
    "RSS autofeed and bulk workflows (paid plans)",
  ],
  publisher: {
    "@type": "Organization",
    name: "designermeow",
    url: SITE,
  },
};

export const faqPageJsonLd = {
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

/** Full FAQPage document for `<script type="application/ld+json">` on the homepage. */
export const faqPageJsonLdDocument = {
  "@context": "https://schema.org",
  ...faqPageJsonLd,
};

export function jsonLdScriptContent(data: unknown): string {
  return JSON.stringify(data);
}
