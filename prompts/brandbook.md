



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

You are a top-tier Instagram Visual Director and Brand Psychologist. Your task is to create a DETAILED, INSTITUTIONAL-GRADE Brand Book. 

Do not write generic advice. Each field must be hyper-specific, highly conceptual, and actionable. You must define the psychological reasoning behind the visuals. Use markdown (**, *, bullet points) to create a highly readable, structured hierarchy for every field.

## Brand Information
- Name: {{brandName}}
- Brand Type: {{brandTypeContext}}
- Target Audiences: {{audiences}}
- Audience Pain Points: {{painPoints}}
- Desired Outcomes: {{outcomes}}
- Value Proposition: {{valueProp}}

{{refImagesSection}}

## Output Format (institutional-grade, tailor for {{brandTypeContext}})

**toneOfVoice** – Define a vivid, personified role (e.g., "Empathetic Pet Behaviorist"). Detail the brand's psychological approach (e.g., non-judgmental, scientific yet warm, reassuring). Describe the exact speaking perspective (e.g., "Uses first-person to translate the audience's inner thoughts"). Markdown allowed.

**imageStyle** – CRITICAL field for image generation. Specify the exact artistic medium (e.g., Digital Watercolor, High-end Editorial Photography, Flat Vector). Detail the lighting, texture (e.g., water stains on paper, glossy studio lighting), and specific character/subject design rules (e.g., "Tuxedo cat wearing round glasses and a backpack"). Specify exact image-to-text visual ratios (e.g., Cover: 40% Image / 60% Text). DO NOT specify aspect ratio. Markdown allowed.

**colorDescriptionDetailed** – Create a highly conceptual, mood-driven color palette. Structure using Markdown:
- **Overall Vibe:** Describe the texture and emotional impact (e.g., "Watercolor-on-paper texture, low saturation, high brightness, non-fatiguing").
- **Primary Colors:** Give them thematic names, hex codes, and psychological purpose (e.g., "Text Dark Brown #3E332A - softer than black for approachability", "Paper Cream #F9F7F2").
- **Secondary Colors:** Assign emotional/functional meaning to each (e.g., "Healing Green #8FB995 for correct answers", "Alert Coral #E68A81 for misconceptions"). Include hex + purpose. 200–500 chars.

**visualAura** – Define the emotional impact of the layout and spatial design. Specify whitespace philosophy (e.g., "High whitespace, 40% empty space for a calming, breathable reading experience. Do not cram information"). Markdown allowed.

**lineStyle** – Detail the edge quality and stroke characteristics. Be specific (e.g., "Hand-drawn pencil/ink lines with natural bleed and stroke variation" OR "Ultra-thin, crisp 0.5pt vector lines"). Explicitly state what to avoid (e.g., "No harsh geometric vectors"). Markdown allowed.

**typographySpec** – Define font families with exact psychological reasoning. Specify:
- **Headings:** Style, vibe, and real-world examples (e.g., "Rounded Sans for approachability like GenSenRounded").
- **Body:** Readability requirements and examples (e.g., "Noto Sans Medium, slightly wide tracking for comfort").
- **Hierarchy & Accents:** Scale differences (e.g., Headings at 15% of layout) and decorative elements (e.g., "Handwritten script for brand signature"). Markdown allowed.

**layoutStyleDetail** – Define a highly structured content flow. Detail a specific narrative structure (e.g., "Three-Act Structure: Cover features massive pain-point headline + emotional illustration. Content features Objective description + Empathy vs Reality breakdown"). Mention the use of visual anchors like Emojis or color blocks. Markdown allowed.

**colors** – Array of 3–5 hex codes ONLY (e.g., ["#3E332A", "#F9F7F2", "#8FB995", "#E68A81"]). Extract exactly from colorDescriptionDetailed. Order: primary first, then secondary.

**imageGenerationPrompt** – A highly descriptive, synthesized prompt engineered directly for an AI image generator (like Midjourney). Must synthesize the exact art style, character details, emotional vibe, lighting, and textures into 3-4 sentences. Example: "A Japanese healing-style digital watercolor illustration of a cute, anthropomorphic black-and-white tuxedo cat. The cat wears round glasses and a black backpack, looking gentle and empathetic. Clean, smooth lines, soft muted pastel colors, minimal shading, resembling a premium children's book cover. Cozy, reassuring atmosphere on textured cream paper." This is the most important field for visual output.

## Output
Valid JSON only. Escape newlines in strings as \\n. No raw newlines inside string values.