# AI Data Flow

## 1. Brandbook Generation
**Input:** Brand info (name, type, targetAudiences, painPoints, desiredOutcomes, valueProposition) + reference images (sample posts)
**Source:** `app/api/brandbooks/generate/route.ts` → `lib/ai/gemini.ts` generateBrandbook()
**Output:** brand_personality, tone_of_voice, visual_style, caption_structure, dos_and_donts

## 2. Draft Generation
**Input:** Brandbook (all fields) + contentIdea, language, postType, format, postStyle, contentFramework
**Source:** `app/api/posts/draft/route.ts` → `lib/ai/gemini.ts` generatePost()
**Output:** imageTextOnImage, visualAdvice, igCaption

## 3. Image Generation
**Input:** Draft (visualAdvice, imageTextOnImage) + brandbook (visual_style) + contentIdea + optional: selected sample photos (up to 3), brand logo
**Source:** `app/api/posts/generate/route.ts` → `lib/ai/build-image-prompt.ts` + `lib/ai/nano-banana.ts`
**Output:** Generated image
