/**
 * Landing page style gallery data.
 * Upload images to public/landing-samples/ with these exact filenames:
 * - 1-premium-magazine.png
 * - 2-business-infographic.png
 * - 3-interview-hero-card.png
 * - 4-minimalist-architectural-teaser.png
 * - 5-scenic-news-alert.png
 * - 6-lifestyle-wellness-layout.png
 * - 7-educational-pet-content.png
 */
export interface LandingStyleItem {
  id: string;
  imageUrl: string;
  category: string;
  testimonial: string;
  visualAdvice: string;
}

export const LANDING_STYLES: LandingStyleItem[] = [
  {
    id: "1",
    imageUrl: "/landing-samples/1-premium-magazine.png",
    category: "Premium Magazine Portrait",
    testimonial: "Saved me 5 hours a week!",
    visualAdvice: `Generate a photorealistic, high-end lifestyle magazine cover-style portrait. The layout is vertical (4:5 ratio). The subject is a confident, middle-aged male architect with short, neatly styled hair, wearing a crisp navy blue button-down shirt and grey tailored trousers. He is sitting slightly forward with his hands clasped, looking directly at the camera with a warm, professional smile. He is seated on a modern, curved cream-colored lounge chair. The background is a textured, artistic wall with abstract strokes of silver, slate gray, and pale blue, suggesting a high-end interior. To his right, there is a sleek brass side table with two thick hardcover design books and a small potted green plant in a geometric white ceramic vase.

Overlay elegant, high-contrast typography on the image. In the top right corner, use a sophisticated serif font in black to write "URBAN SPACES" and below it, in a much larger, italicized serif font, "TOP 100". Below that, write "2026". In the lower center of the image, place a large, bold, white quotation mark icon. Underneath the quotation mark, write the quote in elegant, bold white traditional Chinese text: 「空間的本質，在於人與光的對話。」. Below the quote, draw a thin horizontal white line. Under the line, write the name "Marcus Sterling" in bold serif white font, and directly below it, "Sterling & Stone Architecture" in a slightly smaller, regular serif white font. The overall lighting should be soft, diffused, and highly flattering, akin to professional studio portraiture.`,
  },
  {
    id: "2",
    imageUrl: "/landing-samples/2-business-infographic.png",
    category: "Business Infographic",
    testimonial: "My feed finally looks cohesive.",
    visualAdvice: `Generate a highly engaging, informative business infographic social media carousel post (4:5 ratio) with a deep navy blue solid background (#0A1930). At the very top right, write "ENTERPRISE WEEKLY" in a clean, white sans-serif font. The top left should feature a prominent headline in large, bold, bright yellow sans-serif typography: "從車庫起步的環保奇蹟". Below it, in equally bold white text, write: "3年內將品牌推向全球50多國". Separate the header from the body with a horizontal white dashed line.

Below the line, include a short paragraph of white, easily readable body text explaining the success story of an eco-friendly shoe brand. To the right of this text, feature a high-quality product shot cutout of a stylish, modern eco-friendly sneaker featuring earthy green, tan, and cream color blocking, complete with a recycled cardboard tag.

The bottom half of the image features a dynamic composition of three different photographic cutouts of the same person—a young, enthusiastic male founder wearing a casual denim jacket over a white t-shirt and clear-framed glasses. The central cutout is the largest, showing him speaking passionately with his hands open. The smaller cutouts on the left and right show him examining materials and looking thoughtfully off-camera. Surround the central figure with two white, comic-book-style starburst speech bubbles with dark blue text inside. The left bubble reads "環保鞋履品牌 TerraTread 創辦人". The right bubble reads "累計銷量突破 500萬對 出海至逾50國". Include small, playful white hand-drawn arrows pointing from the bubbles to the founder. The aesthetic should be modern, energetic, and highly informative.`,
  },
  {
    id: "3",
    imageUrl: "/landing-samples/3-interview-hero-card.png",
    category: "Interview / Hero Card",
    testimonial: "Professional and eye-catching.",
    visualAdvice: `Generate a striking, high-conversion interview feature graphic for social media (4:5 ratio). The background is a solid, rich dark blue. In the top left corner, include a sleek white pill-shaped badge with dark blue text reading "FOUNDER'S CIRCLE 獨家專訪". Below this, place a massive, attention-grabbing headline. The first line is in white, bold sans-serif: "顛覆傳統出遊體驗的創新之路". The second line is massive, glowing bright yellow, blocky text: "智能行李箱先驅". The third line is smaller white text: "從眾籌爆款到遠銷50多國 銷量逾500萬件".

The bottom half of the layout is split into two visual elements. On the left, place a circular photo cutout (framed by a thick, glowing yellow border) showing a professional yet approachable female founder. She has shoulder-length brown hair, wears a smart grey blazer over a black top, and is speaking with her hands slightly raised in an explanatory gesture. Behind her in the circle is a blurred background of a modern startup office.

On the right side of the layout, arrange a visually appealing cluster of three modern, sleek "AeroCase" smart luggage suitcases in different sizes and metallic pastel colors (rose gold, matte black, and silver). In the bottom right corner, overlay a bright yellow rectangular box containing the bold navy blue text "Elena Rostova", and a smaller sub-text "智能行李箱品牌 AeroCase 創辦人". At the very bottom center, place a dark green pill-shaped badge with white text reading "了解智能硬件的創業故事", alongside a small 'mute' icon.`,
  },
  {
    id: "4",
    imageUrl: "/landing-samples/4-minimalist-architectural-teaser.png",
    category: "Minimalist Architectural Teaser",
    testimonial: "The AI gets my vibe perfectly.",
    visualAdvice: `Generate a highly atmospheric, minimalist architectural interior photograph meant for a premium design editorial (4:5 ratio). The image features a futuristic, highly symmetrical retail space. The perspective is looking straight down a corridor or into a central chamber. The walls, floor, and ceiling are seamlessly curved, creating a tunnel-like or pod-like environment. The primary color palette consists of warm, glowing ambient amber and soft metallic gold. The walls feature recessed horizontal bands of bright, diffuse white LED lighting that trace the curves of the room, drawing the eye toward the center.

In the exact center of the composition sits a single, minimalist display podium made of dark, brushed bronze with a plush, velvet ochre cushion on top, completely empty, suggesting anticipation or high luxury. The lighting is cinematic, with dramatic contrast between the glowing walls and the deep shadows of the room's corners.

Overlay clean, high-end editorial typography. In the top right corner, place a large, very thin, white, abstract, interlocking serif logo. In the lower third of the image, centered, write "LUMINA BOUTIQUE 東京旗艦店" in a prominent, elegant white serif font. Below it, write "以光影重塑未來零售空間" in a matching font. Below that, place a thin white horizontal line with the tiny word "DESIGN" cutting through the center. Finally, at the very bottom, write "LUMINA UNVEILS ITS NEWEST FLAGSHIP IN GINZA, TOKYO" in a crisp, slightly smaller, all-caps white serif font. The overall mood is serene, avant-garde, and exceptionally luxurious.`,
  },
  {
    id: "5",
    imageUrl: "/landing-samples/5-scenic-news-alert.png",
    category: "Scenic News Alert",
    testimonial: "My engagement doubled.",
    visualAdvice: `Generate a breathtaking architectural landscape photograph styled as a digital news publication cover (4:5 ratio). The image showcases a stunning, contemporary eco-resort building nestled in a dramatic mountainous landscape. The architecture is a striking blend of modern structural engineering and traditional alpine design. It features massive, steep A-frame rooflines supported by thick, intricately carved dark wooden beams. Between the structural beams are massive, floor-to-ceiling glass curtain walls that reflect the sky. The background features towering, snow-capped mountain peaks (resembling the Swiss Alps) under a bright, dynamic sky with scattered fluffy white clouds.

In the foreground, there is a wide, pristine stone-paved plaza where small, blurred figures of people can be seen walking and pulling luggage, giving a sense of scale. A sleek, modern electric shuttle bus is partially visible on the left side.

For the typography overlay: At the top center, write the publication name "DESIGN QUARTERLY" in a bold, black, modern, geometric sans-serif font. In the exact center of the image, overlaid directly across the glass architecture, write a massive headline in a crisp, white, traditional serif font with a subtle drop shadow for readability: "阿爾卑斯山頂的避世聖地". Directly underneath, write a slightly smaller sub-headline in the same font: "沉浸式冰川溫泉、飽覽馬特洪峰壯麗雪景". The aesthetic should be awe-inspiring, clean, and invite the viewer to read more about this architectural marvel.`,
  },
  {
    id: "6",
    imageUrl: "/landing-samples/6-lifestyle-wellness-layout.png",
    category: "Lifestyle & Wellness Layout",
    testimonial: "Clients love the consistency.",
    visualAdvice: `Generate a calming, beautifully styled interior photography shot tailored for a high-end home and lifestyle magazine (4:5 ratio). The scene is a sunlit, minimalist living room that exudes tranquility and order. The main subject is a low-profile, heavily textured bouclé sofa in a deep, soothing olive green. It sits on a floor of terracotta square tiles. To the left of the sofa is a minimalist, matte black round side table holding a single clear glass of water and a small, mushroom-shaped frosted glass table lamp. On the crisp, textured white plaster wall behind the sofa hangs a large, framed contemporary art piece featuring bold, abstract geometric shapes in muted mustard, terracotta, and navy blue. Distinct, sharp diagonal sunlight shadows fall across the floor, the side table, and the lower portion of the sofa, indicating early morning or late afternoon light.

Add the following elegant typography overlay: In the top left corner, place the title "CASA MINIMA" in a large, elegant, white serif font. Down the right side of the image, write "WELLNESS LIVING NEWS" vertically in small, spaced-out, white sans-serif letters, followed by a thin, vertical white line. In the bottom left quadrant, layered over the sofa and floor, write the main headline in a graceful, large, white serif font: "寧靜來自空間的留白！". Below it, write "5個極簡佈置法則，讓家成為". And on the third line: "隔絕喧囂的心靈庇護所". The text should have a very soft, dark blur behind it to ensure it is perfectly legible against the furniture.`,
  },
  {
    id: "7",
    imageUrl: "/landing-samples/7-educational-pet-content.png",
    category: "Educational Pet Content",
    testimonial: "Emotionally engaging and clickable.",
    visualAdvice: `Generate an extremely cute, eye-catching, high-contrast social media educational graphic focusing on pets (4:5 ratio). The background image is a stunning, macro-photography shot of an adorable, fluffy Golden Retriever puppy sleeping incredibly peacefully. The puppy is resting its head on a soft, chunky-knit cream blanket. The lighting is warm and golden, with beautiful, soft bokeh in the background suggesting out-of-focus fairy lights or sunlight filtering through a window. The puppy's expression is utter contentment.

The graphic elements should be vibrant and designed to stop the scroll. In the top left corner, place a bright teal rectangular badge with a white paw print icon and the brand name "PAW PERFECT" in bold white sans-serif text. In the center-bottom of the image, place massive, highly stylized, bold text. The text should be bright white with a thick, cartoonish bright teal outline, and a secondary dark shadow to make it pop aggressively off the background. The text reads: "幼犬睡覺時抽搐，". Below it, even larger: "原來大有玄機！". Below this main hook, write in smaller, plain white text with a soft shadow: "獸醫拆解背後的科學真相⋯".

At the very bottom edge of the image, place a wide, bright teal pill-shaped button stretching almost edge-to-edge. Inside the button, write "下一頁睇詳情" in bold white text, followed by an emoji of a white hand pointing to the right (👉🏻). The overall design should feel professional, highly clickable, and emotionally engaging.`,
  },
];

export function getLandingStyleById(id: string): LandingStyleItem | undefined {
  return LANDING_STYLES.find((s) => s.id === id);
}
