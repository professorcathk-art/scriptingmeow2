# Image Generation Prompt Builder

Used by `lib/ai/build-image-prompt.ts` → `buildImagePrompt()`. Combines brandbook visual style + draft visual advice + text-on-image into a single prompt for AI image generation.

## Inputs

- **brandbook.visual_style** – imageGenerationPrompt (preferred), imageStyle, colors, colorDescriptionDetailed, visualAura, lineStyle, layoutTendencies, layoutStyle, typographySpec, layoutStyleDetail
- **visualAdvice** – From draft (視覺建議)
- **imageTextOnImage** – Text to render on the image
- **postStyle** – editorial | text-heavy | tweet-card | split-screen | immersive-photo
- **brandType**, **contentFramework**, **logoUrl**

---

## Prompt structure (concatenated)

### 1. Base
Generate a high-end, scroll-stopping Instagram graphic. Act as a master Art Director and Editorial Designer. Every visual element must be polished, cohesive, and meticulously composed.

### 2. User choices (optional)
CONTEXT & VIBE: Brand Type: {{brandType}}. Content Goal: {{contentFramework}}. Ensure the overall mood, lighting, and composition reflect this specific industry and intent.

### 3. Brand context (primary)
CORE VISUAL IDENTITY (MANDATORY): 
Brand image generation prompt (use as primary style): {{imageGenerationPrompt}}
— OR —
Brand visual style: {{imageStyle}}. 
Color palette & lighting: {{colorDescriptionDetailed}}. 
Visual aura & whitespace rules: {{visualAura}}. 
Line/stroke characteristics: {{lineStyle}}. 
Layout rules: {{layoutStyle}}. 
Typography aesthetic: {{typographySpec}}.
(Include logo integration seamlessly into the composition if {{logoUrl}} is provided.)

### 4. Visual advice
SCENE & SUBJECT ACTION (CRITICAL): {{visualAdvice}}
*Instruction: Merge this specific scene description seamlessly into the Core Visual Identity defined above. Do not alter the brand's art style to fit the scene; force the scene to match the brand's aesthetic medium and colors exactly.*

### 5. Layout
VISUAL LAYOUT & SPATIAL RULES: {{postStyle}}.
- **editorial**: MINIMALIST EDITORIAL: Clean, high-end magazine aesthetic. High whitespace. Frame the subject beautifully using negative space. Text is elegantly integrated into the composition, not just slapped on top.
- **text-heavy**: TEXT-HEAVY / INFOGRAPHIC: The text is the hero. Use bold, highly legible typography against a clean, uncluttered background area or soft brand-color gradient to ensure perfect readability.
- **tweet-card**: TWEET / QUOTE CARD: Central stylized text block or UI-like card, resting on an aesthetically pleasing, soft background that matches the brand aura.
- **split-screen**: SPLIT SCREEN / COLLAGE: Distinct visual zones (e.g., top/bottom or left/right) separating the subject/illustration from the text block. Use sharp, modern geometric divisions.
- **immersive-photo**: IMMERSIVE VISUAL: Edge-to-edge premium illustration or photography. Text is minimal and acts as a subtle overlay placed specifically in a naturally empty/clean area of the image.

### 6. Text on image (if any)
EXACT TEXT TO RENDER (CRITICAL): Render the following text perfectly, with zero typos. Do NOT render markdown tags like #, ##, ###, or **. Observe strict typographic hierarchy:
Line 1 (Headline): "…"
Line 2 (Subheadline): "…"
Line 3+ (Body): "…"

### 7. Design requirements (always appended)
FINAL DESIGN COMMANDS (strictly enforce):
- Magazine-quality execution. Sophisticated, premium, and intentional.
- Perfect Typographic Hierarchy: The Headline must be the largest and boldest, immediately drawing the eye. Subheadlines are medium weight.
- Color Harmony: Use the defined brand colors strategically for text accents, shapes, or backgrounds. Ensure flawless contrast between text and background for mobile readability.
- Integration: Text and image must not fight for attention. Use intentional negative space, subtle gradients behind text, or creative overlay techniques to blend them smoothly.
- Spacing: Generous, clean margins. Avoid cramped, cluttered, or amateur layouts at all costs.