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
- `{{overallDesignGuide}}` – Rules for the **overallDesign** field (full scene + all text)
- `{{stylingGuide}}` – Rules for the **styling** field (brand look only)
- `{{aspectNote}}` – 1:1, 4:5, or 9:16

## Carousel placeholders

- `{{pageCount}}` – Number of slides
- `{{personality}}`, `{{tone}}`, `{{style}}`, `{{colors}}`
- `{{contentFrameworkDesc}}`, `{{layoutSpatialLine}}`
- `{{overallDesignGuide}}`, `{{stylingGuide}}`
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
  "variation1": {"overallDesign":"","styling":"","igCaption":""},
  "variation2": {"overallDesign":"","styling":"","igCaption":""}
}

**Field Generation Rules:**
0. **`postAim`**: Never omit. Anchor in the brief: who this serves, what outcome the post targets (educate, persuade, entertain, build trust), and any nuance the image generator must respect. Write in **{{language}}**.
1. **`overallDesign`**: Follow `{{overallDesignGuide}}`. Plain text only, no markdown. **One unified field** for the entire graphic: describe the setting, subjects and objects, composition, framing, and **all** text that must appear in the image (what it says, where it sits, how prominent). Everything that must be *seen* in the frame belongs here—not split across two fields. All copy in **{{language}}**.
2. **`styling`**: Follow `{{stylingGuide}}`. Brand-aligned **execution** only: palette, lighting mood, medium (photo/illustration/3D), texture, typography personality—consistent with `{{style}}` and `{{colors}}`. Do **not** restate scene layout or narrative; that is in `overallDesign`. Write in **{{language}}**.
   - If a `[Source Image URL: https...]` is in the brief, put the overlay-frame instruction in **`overallDesign`**, not styling alone.
3. **`igCaption`**: A comprehensive, standalone caption (up to 2000 characters), matching **{{language}}** and `{{tone}}`. The reader should understand the full post idea without seeing the image: hook, depth, proof or steps as needed, and a save/share CTA. Max 3 hashtags.

---

## Carousel prompt (N pages)

## BRIEF (primary input)
{{idea}}
*If a Source URL/RSS is provided, synthesize the full context into actionable slides. Add curiosity gaps. Never just repeat the title.*

## CONTEXT
- **Brand:** {{personality}} | Tone: {{tone}} | Style: {{style}} | Colors: {{colors}}
- **Content Goal:** {{contentFrameworkDesc}} | **Spatial layout:** {{layoutSpatialLine}}
- **Specs:** {{pageCount}} pages | Format: {{format}} | Aspect: {{aspectNote}} | Language: {{language}}

## TASK
You are an Elite Editorial Designer and Instagram Strategist. Storyboard a cohesive, high-retention {{pageCount}}-page carousel using the BRIEF and CONTEXT above.

## Carousel Narrative Pacing (Strictly follow based on {{pageCount}})
Dynamically structure the slide functions based on the total page count:
- **If 3 Pages:** [Page 1: Hook/Cover] -> [Page 2: Core Value/Explanation] -> [Page 3: CTA/Summary].
- **If 4-5 Pages:** [Page 1: Hook] -> [Page 2: Twist/Agitation] -> [Pages 3-4: Step-by-step Value] -> [Final Page: CTA].
- **If 6+ Pages:** [Page 1: Hook] -> [Page 2: Empathy/Problem Setup] -> [Page 3: The Twist/Mythbust] -> [Pages 4 to N-2: Detailed Breakdown] -> [Page N-1: Summary] -> [Page N: CTA].

## Field rules per slide
- **`overallDesign`**: Follow `{{overallDesignGuide}}`. Plain text, no markdown. Full slide brief in **{{language}}**: scene, objects, composition, and all on-slide text (placement + wording).
- **`styling`**: Follow `{{stylingGuide}}`. Brand look for that slide—palette, light, mood, medium—aligned with `{{style}}`. No duplicate scene description.
- **Source Image Overlay:** If a `[Source Image URL: https...]` is in the brief, put the frame/overlay instruction in **`overallDesign`** for the cover (or each slide as needed).

## Output Format
Return valid JSON only. **`postAim` is required** (max 500 characters).

{
  "postAim": "Required: context + intent for this carousel",
  "pages": [
    {
      "pageIndex": 1,
      "header": "Slide title if applicable",
      "overallDesign": "Full slide brief in {{language}}; use \\n between blocks if needed.",
      "styling": "Brand execution: palette, light, mood, medium."
    }
  ],
  "igCaption": "Up to 2000 characters: hook + full arc of the carousel + CTA. Max 3 hashtags. Must stand alone."
}
