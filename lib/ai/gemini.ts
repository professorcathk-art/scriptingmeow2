import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Image generation using Gemini's image generation capabilities
export async function generateImage(prompt: string): Promise<string> {
  try {
    // Use Gemini Pro Vision or Imagen API
    // For now, we'll use a placeholder approach - in production, integrate with Imagen API
    // or use a service like DALL-E, Midjourney, etc.
    
    // Using Gemini to generate a detailed image prompt, then we'll need an actual image generation service
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const imagePrompt = `Create a detailed, Instagram-ready image description for: ${prompt}
    
    The description should be:
    - Specific about colors, composition, and style
    - Suitable for Instagram (1080x1080 for square, 1080x1350 for portrait, etc.)
    - Professional and on-brand
    - Include any text overlays if needed
    
    Return ONLY the image description, no additional text.`;
    
    const result = await model.generateContent(imagePrompt);
    const response = await result.response;
    const description = response.text();
    
    // For now, return a placeholder URL - in production, integrate with actual image generation API
    // You can use Google's Imagen API, DALL-E, Stable Diffusion, etc.
    return `https://via.placeholder.com/1080x1080/4F46E5/FFFFFF?text=${encodeURIComponent(description.substring(0, 50))}`;
  } catch (error) {
    console.error('Error generating image:', error);
    // Return a placeholder on error
    return 'https://via.placeholder.com/1080x1080/4F46E5/FFFFFF?text=Image+Generation+Error';
  }
}

export async function generateBrandbook(
  brandData: {
    name: string;
    type: string;
    targetAudiences: string[];
    painPoints: string[];
    desiredOutcomes: string[];
    valueProposition: string;
    referenceImages?: string[];
  }
): Promise<{
  brandPersonality: string;
  toneOfVoice: string;
  visualStyle: {
    colors: string[];
    mood: string;
    imageStyle: string;
    layoutTendencies: string;
  };
  captionStructure: {
    hookPatterns: string[];
    bodyPatterns: string[];
    ctaPatterns: string[];
    hashtagStyle: string;
  };
  dosAndDonts: {
    dos: string[];
    donts: string[];
  };
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a brand strategist creating a comprehensive brandbook for an Instagram-focused brand.

Brand Information:
- Name: ${brandData.name}
- Type: ${brandData.type}
- Target Audiences: ${brandData.targetAudiences.join(', ')}
- Audience Pain Points: ${brandData.painPoints.join(', ')}
- Desired Outcomes: ${brandData.desiredOutcomes.join(', ')}
- Value Proposition: ${brandData.valueProposition}

${brandData.referenceImages && brandData.referenceImages.length > 0
  ? `Reference Images: The brand has uploaded ${brandData.referenceImages.length} reference images that should inform the visual style.`
  : ''}

Create a comprehensive brandbook in JSON format with the following structure:
{
  "brandPersonality": "A 2-3 sentence description of the brand's personality",
  "toneOfVoice": "A 2-3 sentence description of how the brand communicates",
  "visualStyle": {
    "colors": ["array of 3-5 primary brand colors"],
    "mood": "The overall mood/feeling of visuals",
    "imageStyle": "Description of image style (e.g., minimalist, vibrant, professional, casual)",
    "layoutTendencies": "Common layout patterns and composition preferences"
  },
  "captionStructure": {
    "hookPatterns": ["array of 3-5 hook patterns/styles"],
    "bodyPatterns": ["array of 3-5 body content patterns"],
    "ctaPatterns": ["array of 3-5 call-to-action patterns"],
    "hashtagStyle": "Description of hashtag strategy and style"
  },
  "dosAndDonts": {
    "dos": ["array of 5-7 things the brand should do"],
    "donts": ["array of 5-7 things the brand should avoid"]
  }
}

Return ONLY valid JSON, no markdown formatting or additional text.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up the response (remove markdown code blocks if present)
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const brandbook = JSON.parse(cleanedText);
    
    return brandbook;
  } catch (error) {
    console.error('Error generating brandbook:', error);
    throw new Error('Failed to generate brandbook');
  }
}

export async function generatePost(
  brandbook: {
    brandPersonality: string;
    toneOfVoice: string;
    visualStyle: any;
    captionStructure: any;
    dosAndDonts: any;
  },
  contentIdea: string,
  language: string,
  postType: string,
  format: string
): Promise<{
  caption: {
    hook: string;
    body: string;
    cta: string;
    hashtags: string[];
  };
  visualDescription: string;
  imageUrl?: string;
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are creating an Instagram post for a brand following their brandbook.

Brandbook:
- Personality: ${brandbook.brandPersonality}
- Tone of Voice: ${brandbook.toneOfVoice}
- Visual Style: ${JSON.stringify(brandbook.visualStyle)}
- Caption Structure: ${JSON.stringify(brandbook.captionStructure)}
- Do's and Don'ts: ${JSON.stringify(brandbook.dosAndDonts)}

Post Requirements:
- Content Idea: ${contentIdea}
- Language: ${language}
- Post Type: ${postType}
- Format: ${format}

Generate a complete Instagram post in JSON format:
{
  "caption": {
    "hook": "An engaging hook (first 1-2 lines)",
    "body": "The main body content (3-5 sentences)",
    "cta": "A clear call-to-action",
    "hashtags": ["array of 5-10 relevant hashtags"]
  },
  "visualDescription": "A detailed description of what the visual should look like, including colors, composition, text overlay if any, and style"
}

Return ONLY valid JSON, no markdown formatting or additional text.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const post = JSON.parse(cleanedText);
    
    // Generate image using the visual description
    const { generateImageWithImagen } = await import('./imagen');
    const imageUrl = await generateImageWithImagen(post.visualDescription);
    post.imageUrl = imageUrl;
    
    return post;
  } catch (error) {
    console.error('Error generating post:', error);
    throw new Error('Failed to generate post');
  }
}
