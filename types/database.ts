export type BrandType = 
  | "personal-brand"
  | "shop"
  | "agency"
  | "local-business"
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

export interface BrandSpace {
  id: string;
  user_id: string;
  name: string;
  brand_type: BrandType;
  avatar_url?: string;
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
    colors: string[];
    mood: string;
    image_style: string;
    layout_tendencies: string;
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

export interface GeneratedPost {
  id: string;
  brand_space_id: string;
  post_type: PostType;
  format: PostFormat;
  language: string;
  content_idea: string;
  visual_url?: string;
  caption: {
    hook: string;
    body: string;
    cta: string;
    hashtags: string[];
  };
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
  priority_support: boolean;
  batch_generation: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    brand_spaces: 1,
    monthly_credits: 10,
    priority_support: false,
    batch_generation: false,
  },
  basic: {
    brand_spaces: 3,
    monthly_credits: 100,
    priority_support: false,
    batch_generation: false,
  },
  pro: {
    brand_spaces: 10,
    monthly_credits: 500,
    priority_support: true,
    batch_generation: true,
  },
};
