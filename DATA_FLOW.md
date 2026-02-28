# AI Data Flow

## 1. Brandbook Generation
**Input:** Brand info (name, **brand type**, otherBrandType when "other", targetAudiences, painPoints, desiredOutcomes, valueProposition) + reference images (sample posts)
**Source:** `app/api/brandbooks/generate/route.ts` → `lib/ai/gemini.ts` generateBrandbook()
**Output:** brand_personality, tone_of_voice, visual_style (colors, imageStyle, typographySpec, layoutStyleDetail), dos_and_donts
**Prompt uses:** Brand type for tailored output (personal-brand, ecommerce-retail, service-agency, etc.)

## 2. Draft Generation
**Input:** Brandbook + **brand type**, **content framework**, **visual layout (postStyle)** + contentIdea, language, postType, format
**Source:** `app/api/posts/draft/route.ts` → `lib/ai/gemini.ts` generatePost()
**Output:** imageTextOnImage, visualAdvice, igCaption
**Prompt uses:** Content framework (educational, engagement, promotional, storytelling), visual layout (editorial, text-heavy, etc.), brand type for caption/style

## 3. Image Generation
**Input:** Draft (visualAdvice, imageTextOnImage) + brandbook (visual_style) + **brand type**, **content framework**, **visual layout** + optional: selected sample photos (up to 3), brand logo
**Source:** `app/api/posts/generate/route.ts` → `lib/ai/build-image-prompt.ts` + `lib/ai/nano-banana.ts`
**Output:** Generated image
**Prompt uses:** All user choices (brand type, content framework, visual layout) reflected in image output
