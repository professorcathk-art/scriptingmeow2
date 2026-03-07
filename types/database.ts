export type BrandType =
  | "personal-brand"
  | "ecommerce-retail"
  | "service-agency"
  | "local-business"
  | "tech-startup"
  | "community-nonprofit"
  | "other";

export type PlanTier = "free" | "basic" | "pro";

export type PostType = "single-image" | "carousel";

export type PostFormat = 
  | "square" // 1:1
  | "portrait" // 4:5
  | "story" // 9:16
  | "reel-cover" // 9:16
  | "custom";

export type PostStatus = "draft" | "generated" | "saved";

export type LogoPlacement =
  | "none"
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface BrandSpace {
  id: string;
  user_id: string;
  name: string;
  brand_type: BrandType;
  avatar_url?: string;
  logo_url?: string | null;
  logo_placement?: LogoPlacement | null;
  style_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface Brandbook {
  id: string;
  brand_space_id: string;
  brand_name: string;
  brand_type: BrandType;
  target_audiences: string[];
  audience_pain_points: string[];
  desired_outcomes: string[];
  value_proposition: string;
  brand_personality: string;
  tone_of_voice: string;
  visual_style: {
    colors?: string[];
    image_style?: string;
    imageStyle?: string;
    imageGenerationPrompt?: string;
    layout_tendencies?: string;
    typographySpec?: string;
    layoutStyleDetail?: string;
    colorDescriptionDetailed?: string;
    visualAura?: string;
    lineStyle?: string;
  };
  caption_structure: {
    hook_patterns: string[];
    body_patterns: string[];
    cta_patterns: string[];
    hashtag_style: string;
  };
  dos_and_donts: {
    dos: string[];
    donts: string[];
  };
  custom_rules?: string[];
  created_at: string;
  updated_at: string;
}

export interface BrandReferenceImage {
  id: string;
  brand_space_id: string;
  image_url: string;
  uploaded_at: string;
}

export type DraftData =
  | { visualAdvice: string; imageTextOnImage: string }
  | { carouselPages: Array<{ pageIndex: number; header: string; imageTextOnImage: string; visualAdvice: string }> };

export interface GeneratedPost {
  id: string;
  brand_space_id: string;
  post_type: PostType;
  format: PostFormat;
  language: string;
  content_idea: string;
  visual_url?: string;
  carousel_urls?: string[];
  is_public_gallery?: boolean;
  draft_data?: DraftData | null;
  caption:
    | { igCaption: string }
    | { hook: string; body: string; cta: string; hashtags: string[] };
  status: PostStatus;
  tags?: string[];
  credits_used: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  plan_tier: PlanTier;
  credits_remaining: number;
  credits_reset_date: string;
  instagram_handle?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number; // negative for usage, positive for grants
  description: string;
  created_at: string;
}

export interface PlanLimits {
  brand_spaces: number;
  monthly_credits: number;
  rss_feeds: number;
  storage_mb: number;
  priority_support: boolean;
  batch_generation: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    brand_spaces: 2,
    monthly_credits: 5,
    rss_feeds: 0,
    storage_mb: 20,
    priority_support: false,
    batch_generation: false,
  },
  basic: {
    brand_spaces: 5,
    monthly_credits: 50,
    rss_feeds: 2,
    storage_mb: 100,
    priority_support: false,
    batch_generation: false,
  },
  pro: {
    brand_spaces: 15,
    monthly_credits: 200,
    rss_feeds: 5,
    storage_mb: 500,
    priority_support: true,
    batch_generation: true,
  },
};

export const PLAN_PRICES: Record<Exclude<PlanTier, "free">, { monthly_price_cents: number; stripe_price_id?: string }> = {
  basic: { monthly_price_cents: 990 },
  pro: { monthly_price_cents: 1999 },
};
