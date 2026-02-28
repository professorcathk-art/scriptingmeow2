# AI Data Flow

## 1. Brandbook Generation
**Input:** Brand info (name, brand type, otherBrandType, targetAudiences, painPoints, desiredOutcomes, valueProposition) + reference images (sample posts from brand_reference_images)
**Source:** `app/api/brandbooks/generate/route.ts` → `lib/ai/gemini.ts` generateBrandbook()
**Output:** brand_personality, tone_of_voice, visual_style (colors, colorDescriptionDetailed, imageStyle, visualAura, lineStyle, typographySpec, layoutStyleDetail), dos_and_donts
**Prompt uses:** Brand type for tailored output. Reference images MUST be analyzed—extract hex colors, typography, layout from actual posts.

## 2. Draft Generation
**Input:** Brandbook + brand type + content framework + visual layout (postStyle) + contentIdea + language + postType + format + carouselPageCount (when carousel)
**Source:** `app/api/posts/draft/route.ts` → `lib/ai/gemini.ts` generatePost()
**Output:** Single: imageTextOnImage, visualAdvice, igCaption (2 variations). Carousel: pages[{ header, imageTextOnImage, visualAdvice }], igCaption
**Terminology:** header = 主標題 = main headline INSIDE the image (content headline, NOT "Step 1"). imageTextOnImage = full text to render on image.

## 3. Image Generation
**Input:** Draft (visualAdvice, imageTextOnImage or per-page) + brandbook (visual_style) + brand type + content framework + visual layout + optional: selected sample photos (up to 3), brand logo
**Source:** `app/api/posts/generate/route.ts` → `lib/ai/build-image-prompt.ts` + `lib/ai/nano-banana.ts`
**Output:** Generated image(s). Carousel: one image per page.
**Prompt uses:** colorDescriptionDetailed, visualAura, lineStyle, typographySpec from brandbook.
