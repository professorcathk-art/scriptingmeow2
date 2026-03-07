# Brandbook Generation Prompt

Used by `lib/ai/gemini.ts` → `generateBrandbook()`. Reference images are attached as inline data when provided.

## Placeholders

- `{{brandName}}` – Brand name
- `{{brandTypeContext}}` – Brand type + guidance (e.g. "Personal Brand / Creator")
- `{{audiences}}` – Target audiences (comma-separated)
- `{{painPoints}}` – Audience pain points
- `{{outcomes}}` – Desired outcomes
- `{{valueProp}}` – Value proposition
- `{{refImagesSection}}` – Either "CRITICAL: Reference Images" instructions or "No Reference Images"

---

## Prompt

You are an Elite Brand Strategist and Master Visual Director. Your objective is to architect a comprehensive, INSTITUTIONAL-GRADE Brand Book tailored for Instagram. 

## Mandatory Execution Rules
1. **No Generic Advice:** Every directive must be hyper-specific, highly conceptual, and immediately actionable. 
2. **Psychological Grounding:** You must define the psychological reasoning behind every visual choice (color, typography, spatial layout) based on the target audience's pain points.
3. **Structured Hierarchy:** Utilize markdown (**, *, bullet points) within your field responses to create a highly readable, scannable document.

## Brand Context
- Name: {{brandName}}
- Brand Type: {{brandTypeContext}}
- Target Audiences: {{audiences}}
- Audience Pain Points: {{painPoints}}
- Desired Outcomes: {{outcomes}}
- Value Proposition: {{valueProp}}

{{refImagesSection}}

## Output Format & Field Specifications
Formulate the guidelines specifically for a `{{brandTypeContext}}`. Return valid JSON only.

**`toneOfVoice`** – Define the Brand Archetype and persona (e.g., "Empathetic Pet Behaviorist"). Detail the psychological approach (e.g., scientific yet warm, authoritative but accessible). Specify the exact linguistic perspective (e.g., "Uses first-person plural 'we' to build community"). Markdown allowed.

**`imageStyle`** – The core Visual DNA. Define the exact artistic medium (e.g., Digital Watercolor, High-end Editorial Photography, Flat Vector). Specify lighting, texture, and shading rules. *Crucial:* Translate specific subjects from reference images into universal visual principles. Describe *HOW* things are presented (e.g., "3D objects must use dramatic side lighting"; "Characters must have clean, approachable geometry"). Define the Image-to-Text ratio (e.g., Cover: 40% Image / 60% Text). Do not specify aspect ratios. Markdown allowed.

**`carouselInnerStyle`** – Optional guidance for inner carousel slides (Pages 2 to N). Light suggestions only—e.g., "Consider more whitespace for readability" or "Subtle motifs can support the narrative." Do NOT mandate strict ratios or restrict layout. The image generator will adapt inner pages based on context. Markdown allowed.

**`colorDescriptionDetailed`** – A highly conceptual, semantic color palette. Use Markdown to structure:
- **Overall Vibe:** The emotional impact and visual texture (e.g., "Low saturation, high brightness, non-fatiguing").
- **Primary background:** Main base color (hex + psychological purpose).
- **Secondary background:** Alternate section background (hex + purpose).
- **Primary text:** Main typographic color (hex + readability purpose, e.g., "Dark Brown #3E332A - softer contrast than pure black").
- **Secondary text:** Accents and captions (hex + purpose).
- **Backup color:** CTAs and highlights (hex + purpose).

**`visualAura`** – Define the spatial dynamics and emotional resonance of the layout. Establish a strict whitespace philosophy (e.g., "High whitespace, mandatory 40% negative space to evoke luxury and prevent visual fatigue"). Markdown allowed.

**`lineStyle`** – Detail stroke mechanics and edge quality. Be exact (e.g., "Hand-drawn ink lines with natural bleed" OR "0.5pt ultra-crisp geometric vectors"). Explicitly state what aesthetic to avoid. Markdown allowed.

**`typographySpec`** – Typographic hierarchy and brand perception. Specify:
- **Headings:** Font classification, vibe, and real-world reference (e.g., "High-contrast Serif like Playfair Display for premium authority").
- **Body:** Legibility rules (e.g., "Clean Sans-Serif, medium weight, wide tracking").
- **Hierarchy & Accents:** Scale differences and decorative rules. Markdown allowed.

**`layoutStyleDetail`** – Define the Information Architecture and narrative pacing. Detail the structural flow (e.g., "Three-Act Structure: Heavy pain-point headline on cover -> Empathy breakdown -> Scientific resolution"). Mandate visual anchors like specific emojis or colored highlight blocks. Markdown allowed.

**`colors`** – Array of exactly 5 hex codes mapped precisely to the `colorDescriptionDetailed`. Order: [primary_background, secondary_background, primary_text, secondary_text, backup_color]. Use an empty string `""` for any omitted slot (e.g., `["#F9F7F2", "#F5F3EE", "#3E332A", "", "#8FB995"]`). Max 5 elements.

**`imageGenerationPrompt`** – A synthesized, highly descriptive prompt (3-4 sentences) engineered directly for an AI image generator. This must distill the `imageStyle`, emotional vibe, lighting, and textures into a universal aesthetic formula. Translate subjects into reusable styling rules so *any* topic can be rendered in this brand's unique DNA. Example: "Japanese healing-style digital watercolor. Soft, approachable geometric character design with clean lines. Muted pastel palette, minimal shading, premium children's book aesthetic. Cozy, reassuring atmosphere on a textured cream paper background."

## Output Requirements
Return valid JSON only. Escape newlines in strings as `\n`. No raw newlines inside string values. Ensure `"carouselInnerStyle": ""` is included if not applicable.