
import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { RhythmAnalysisResult, SentenceAnalysisResult } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize client
const ai = new GoogleGenAI({ apiKey });

// Helper to clean JSON string if markdown code blocks are present
const cleanJsonString = (text: string): string => {
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json/, '').replace(/```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```/, '').replace(/```$/, '');
  }
  return clean;
};

/**
 * Step 1: Extract Text & Analyze Rhythm
 * Takes multiple images, extracts text grouped by image, and provides a combined rhythm string.
 */
export const extractAndAnalyzeRhythm = async (
  images: { base64: string; mimeType: string }[]
): Promise<RhythmAnalysisResult> => {
  
  const model = "gemini-2.5-flash"; // Fast and capable for text extraction
  
  const promptText = `
    You are an expert English teacher. 
    1. Look at the provided images in order. Extract all English text.
    2. EXCLUDE the following headers or labels if they appear at the very top of the image (do NOT analyze or include them in any output):
       - "upgrade your speaking skills"
       - "NEWS"
       - "LISTENING PRACTICE"
    3. Group the text by their image source (e.g., Image 1, Image 2).
    4. Crucially, preserve the paragraph structure (visual blocks of text).
       - Return a list of paragraphs.
       - Each paragraph is a list of sentences.
    5. For EVERY sentence, apply Rhythm Analysis directly to the text:
       - Use '•' to indicate natural pauses/breaks/chunks (e.g., between subject and verb phrases, or before prepositions).
       - CAPITALIZE words or syllables that should be STRESSED based on natural English speech rhythm (focus on content words).
       - Keep function words in lowercase unless emphasized.
       - IMPORTANT: Add spaces around the dot. Example output: "THIS year • is my FIFTH year • of STUDYING English."
    
    Return the result in strict JSON format.
  `;

  // Construct parts: Prompt + Images
  const parts: any[] = [{ text: promptText }];
  images.forEach((img) => {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    });
  });

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      fullTextBlocks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            source: { type: Type.STRING, description: "Name/ID of the image source" },
            paragraphs: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of sentences in this paragraph, formatted with rhythm markers (CAPS and •)"
              },
              description: "List of visual paragraphs"
            },
          },
          required: ["source", "paragraphs"],
        },
      },
    },
    required: ["fullTextBlocks"],
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are a helpful and precise English linguistics assistant.",
      },
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    return JSON.parse(cleanJsonString(response.text)) as RhythmAnalysisResult;
  } catch (error) {
    console.error("Extraction Error:", error);
    throw error;
  }
};

/**
 * Step 2: Analyze Specific Sentence
 * Called when a user clicks a sentence. Provides structure, verbs, and translation.
 */
export const analyzeSentenceStructure = async (
  sentence: string
): Promise<SentenceAnalysisResult> => {
  
  const model = "gemini-2.5-flash"; // Flash is sufficient for sentence analysis
  
  const promptText = `
    Analyze the following English sentence for a Korean student:
    "${sentence}"

    Important: When analyzing and presenting the sentence, always preserve the original capitalization of the scanned sentence and its phrases. Do not change any uppercase or lowercase letters from the original input.

    Provide:
    1. 'mainVerb': The exact string of the main predicate verb of the sentence (e.g., "started").
    2. 'otherVerbs': A list of other verb forms present (e.g., ["studying", "forgetting"]).
    3. 'form': The sentence pattern (e.g., 1형식, 3형식). ONLY the label for the main clause.
    4. 'diagram': Draw a clear, visually structured tree diagram of the sentence using indentation and unicode characters (└──, ├──, │). 
       - Each node should show the English phrase (with its original capitalization), its grammatical role (e.g., S, V, O, C, Mod), and a short Korean explanation in parentheses.
       - For phrases from uploaded images, preserve the original phrase and its capitalization as much as possible.
       - Show the hierarchy and relationships between sentence parts so that a visual learner can easily grasp the structure at a glance.
       Example:
        This year (S)
        └─ is (V)
          └─ my fifth year of studying english every day with "입트영" (C)
            ├─ my fifth year (핵심 명사)
            └─ of (전치사)
              └─ studying english every day with "입트영" (동명사구, 전치사의 목적어)
                ├─ studying (동명사)
                ├─ english (O)
                ├─ every day (수식어)
                └─ with "입트영" (수식어)
    5. 'structure': Provide a detailed, step-by-step breakdown of the sentence structure, focusing on how each part connects visually and logically (as if explaining a diagram from an image).
       - Use numbered lists (1., 2.) for main components.
       - Use bullet points (*) for sub-components, and further indent for deeper levels.
       - For each phrase or word, include the English (with its original capitalization), its grammatical role, and a short Korean explanation.
       - At the end, summarize the overall structure formula as "전체 구조: S + V + O + ...".
       - Use standard markdown (no bold) for the English words being explained.
       - Example (Korean):
         1. But: 접속사, 문맥 연결
         2. as I kept going: 시간 부사절, (~하면서, 계속 진행함에 따라)
            * as: 접속사 (~하면서)
            * I: 주어
            * kept going: 동사구
              * kept: 동사, '계속 ~하다'
              * going: 동명사, 'kept'의 목적어
         전체 구조: S + V + ...
    6. 'translation': A natural Korean translation.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      sentence: { type: Type.STRING },
      mainVerb: { type: Type.STRING },
      otherVerbs: { type: Type.ARRAY, items: { type: Type.STRING } },
      form: { type: Type.STRING },
      structure: { type: Type.STRING, description: "Detailed nested bullet-point breakdown with **bold** terms" },
      diagram: { type: Type.STRING, description: "Visual ASCII-style tree diagram" },
      translation: { type: Type.STRING },
    },
    required: ["sentence", "mainVerb", "otherVerbs", "form", "structure", "diagram", "translation"],
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    return JSON.parse(cleanJsonString(response.text)) as SentenceAnalysisResult;
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};



/**
 * Step 3: Generate Speech (TTS)
 * Converts text to speech using Gemini's audio generation capabilities.
 */
export const generateSpeech = async (text: string): Promise<string> => {
  const model = "gemini-2.5-flash-preview-tts";
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    // Extract base64 audio data
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      throw new Error("No audio data returned from AI");
    }

    return audioData;
  } catch (error) {
    console.error("Speech Generation Error:", error);
    throw error;
  }
};
