# Draft Post Generation Prompt

Used by `lib/ai/gemini.ts` → `generatePost()`. Two variants: **single-image** (2 variations) and **carousel** (N pages).

## Single-image placeholders

- `{{personality}}` – Brand personality (truncated)
- `{{tone}}` – Tone of voice
- `{{style}}` – Visual style
- `{{colors}}` – Color palette
- `{{brandTypeLabel}}` – Brand type
- `{{contentFrameworkDesc}}` – Content goal
- `{{visualLayoutContext}}` – Layout + typography
- `{{qualityGuide}}` – Single or carousel quality focus
- `{{idea}}` – Content idea
- `{{language}}` – Output language
- `{{format}}` – square/portrait/story/reel-cover
- `{{textGuide}}` – Layout-specific on-image brief rules
- `{{aspectNote}}` – 1:1, 4:5, or 9:16

## Carousel placeholders

- `{{pageCount}}` – Number of slides
- `{{personality}}`, `{{tone}}`, `{{style}}`, `{{colors}}`
- `{{contentFrameworkDesc}}`, `{{layoutGuide}}`
- `{{idea}}`, `{{format}}`, `{{aspectNote}}`
- `{{isTextHeavy}}` – Boolean for text-heavy layout

---

## Single-image prompt (2 variations)

## BRIEF (primary input – use this to create the draft)
**Topic/Idea:** {{idea}}

## CONTEXT (required for on-brand output)
- **Brand Identity:** {{personality}} | Brand Type: {{brandTypeLabel}}
- **Voice & Visuals:** Tone: {{tone}} | Style: {{style}} | Colors: {{colors}}
- **Content Goal:** {{contentFrameworkDesc}}
- **Layout Rules:** {{visualLayoutContext}}
- **Specs:** Language: {{language}} | Format: {{format}} | Aspect: {{aspectNote}}
- **Quality Focus:** {{qualityGuide}}

## TASK
You are an Elite Instagram Content Strategist and Master Art Director. Create 2 DISTINCT, highly engaging draft variations based on the BRIEF and CONTEXT above.

## Strategic Directives
1. **Source Data Processing:** If `{{idea}}` contains a Source URL or RSS news snippet, synthesize the core value. Expand on key points, inject a psychological hook, and bridge the curiosity gap. Never merely repeat the source title.
2. **Psychological Depth:** Use empathy, counter-intuitive angles, and concrete value. Avoid generic marketing filler.
3. **Differentiation:** Variation 1 and Variation 2 must approach the topic from meaningfully different narrative angles (e.g. emotional pain-point vs. logical breakdown).

## Output Format & Field Specifications
Return valid JSON only. **`postAim` is required** and should appear as the first key in the JSON object: 1–3 sentences, max 500 characters—audience, brand-relevant context, and what this post should achieve for the viewer and the image model.

{
  "postAim": "Required: audience + intent + how the visual supports the message",
  "variation1": {"imageTextOnImage":"","visualAdvice":"","igCaption":""},
  "variation2": {"imageTextOnImage":"","visualAdvice":"","igCaption":""}
}

**Field Generation Rules:**
0. **`postAim`**: Never omit. Anchor in the brief: who this serves, what outcome the post targets (educate, persuade, entertain, build trust), and any nuance the image generator must respect. Write in **{{language}}**.
1. **`imageTextOnImage`**: **Director-style** brief—plain text only, no markdown. Follow `{{textGuide}}`. Prefer **placement-first** instructions: where each text block sits, how prominent it is, and the exact wording. Avoid defaulting to a rigid Headline / Subhead / Body trio unless the layout truly needs it. Stay within the character budget implied by the layout guide; compress thoughtfully—never end mid-thought. All on-image copy in **{{language}}**.
2. **`visualAdvice`**: A HIGHLY DETAILED image-generation prompt (4–7 sentences, 80–150 words minimum). Do NOT be brief. Write in **{{language}}**. Must contain:
   - *Source Image Overlay:* If a `[Source Image URL: https...]` is provided in the brief, you MUST include: "Leave a clean, distinct rectangular frame/space to allow a real photograph to be overlaid later."
   - *Action & Scene:* Subject, pose, expression, environment, props—specific and filmable.
   - *Composition & Layout:* Camera angle, framing, negative space, where type sits relative to the subject.
   - *Lighting & Mood:* Direction, quality, shadows, emotional tone.
   - *Aesthetic Lock:* Tie palette and medium to `{{style}}` and `{{colors}}`.
3. **`igCaption`**: A comprehensive, standalone caption (up to 2000 characters), matching **{{language}}** and `{{tone}}`. The reader should understand the full post idea without seeing the image: hook, depth, proof or steps as needed, and a save/share CTA. Max 3 hashtags.

---

## Carousel prompt (N pages)

## BRIEF (primary input)
{{idea}}
*If a Source URL/RSS is provided, synthesize the full context into actionable slides. Add curiosity gaps. Never just repeat the title.*

## CONTEXT
- **Brand:** {{personality}} | Tone: {{tone}} | Style: {{style}} | Colors: {{colors}}
- **Content Goal:** {{contentFrameworkDesc}} | **Layout:** {{layoutGuide}}
- **Specs:** {{pageCount}} pages | Format: {{format}} | Aspect: {{aspectNote}} | Language: {{language}}

## TASK
You are an Elite Editorial Designer and Instagram Strategist. Storyboard a cohesive, high-retention {{pageCount}}-page carousel using the BRIEF and CONTEXT above.

## Carousel Narrative Pacing (Strictly follow based on {{pageCount}})
Dynamically structure the slide functions based on the total page count:
- **If 3 Pages:** [Page 1: Hook/Cover] -> [Page 2: Core Value/Explanation] -> [Page 3: CTA/Summary].
- **If 4-5 Pages:** [Page 1: Hook] -> [Page 2: Twist/Agitation] -> [Pages 3-4: Step-by-step Value] -> [Final Page: CTA].
- **If 6+ Pages:** [Page 1: Hook] -> [Page 2: Empathy/Problem Setup] -> [Page 3: The Twist/Mythbust] -> [Pages 4 to N-2: Detailed Breakdown] -> [Page N-1: Summary] -> [Page N: CTA].

## Typographic & Visual Rules
- **Source Image Overlay:** If a `[Source Image URL: https...]` is provided in the brief, you MUST structure `visualAdvice` on every page (or at least the cover) to include an explicit layout command: "Leave a clean, distinct rectangular frame/space to allow a real photograph to be overlaid later."
- **`imageTextOnImage`**: Follow `{{textGuide}}` per slide—plain text, no markdown. Write a **shot-list** style brief: zones, emphasis, exact copy in **{{language}}**—not a mechanical Headline/Subhead/Body block unless the slide truly needs it. Respect the per-slide character budget in the guide.
- **`visualAdvice` for Page 1 (Cover):** Dramatic, highly visual, scroll-stopping (4–6 sentences, 80–120 words). Integrate `{{style}}`. Specify subject/scene, composition, lighting, text overlay placement, color usage, mood.
- **`visualAdvice` for Pages 2 to N (Inner Pages):** Designer-level layout instructions (4–6 sentences each, 80–120 words). Background treatment, text blocks, spacing, hierarchy, palette, optional motifs.

## Output Format
Return valid JSON only. **`postAim` is required** (max 500 characters). For `visualAdvice` on every page, synthesize the slide purpose with `{{style}}` for continuity.

{
  "postAim": "Required: context + intent for this carousel",
  "pages": [
    {
      "pageIndex": 1,
      "header": "Slide title if applicable",
      "imageTextOnImage": "Placement-first brief in {{language}}; line breaks with \\n between elements.",
      "visualAdvice": "Designer layout (4–6 sentences): background + text arrangement + color harmony + optional motif."
    }
  ],
  "igCaption": "Up to 2000 characters: hook + full arc of the carousel + CTA. Max 3 hashtags. Must stand alone."
}
