
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
// const promptText = `
// You are an expert in English language education.

// 1. Review the images provided below in order and extract all English text.
// 2. If the following headers or labels appear at the top of an image, 반드시 exclude them from all outputs and do not analyze them:
//   - "upgrade your speaking skills"
//   - "NEWS"
//   - "LISTENING PRACTICE"
// 3. Footnote numbers or symbols (e.g., ¹, ², ³, etc.) must be removed from the original text and must not appear in any output.
// 4. For each image, extract the main title or headline (if present visually at the top, e.g., "Granddaughter's Ukulele Lessons") and include it as a "title" field.
// 5. Group the extracted text by image (e.g., Image 1, Image 2).
// 6. Preserve the paragraph (visual block) structure exactly.
//   - Each paragraph must be returned as a list of sentences.

// 7. [fullTextBlocks] field:
//   - For each image, include:
//     - "source": image name or ID
//     - "title": the main title or headline text (if present; otherwise, empty string)
//     - "paragraphs": list of paragraphs, each as a list of sentences with rhythm markers (•)
//   - Apply rhythm analysis to each sentence.
//   - Include native-speaker stress (emphasis) and rhythm markers (•).

// 8. [originalText] field:
//   - Return the text extracted from the original image with absolutely no modifications.
//   - Preserve all original formatting exactly as is, including capitalization, spacing, line breaks, and punctuation.
//   - Do NOT apply rhythm markers (•), capitalization changes, emphasis, or any additional symbols.
//   - Return the OCR output exactly as extracted.

// 9. Example:
//   - Original image:
//     Title: "Granddaughter's Ukulele Lessons"
//     Paragraph: "my daughter has been learning the ukulele in an after-school program for six years now."
//   - [originalText]: "Granddaughter's Ukulele Lessons\n\nmy daughter has been learning the ukulele in an after-school program for six years now."
//   - [fullTextBlocks] example:
//     [
//      {
//       "source": "Image 1",
//       "title": "Granddaughter's Ukulele Lessons",
//       "paragraphs": [
//         [
//          "my DAUGHter • has been LEARNing • the UKEleLE • in an AFter-school program • for SIX years NOW."
//         ]
//       ]
//      }
//     ]

// Return the result strictly in JSON format, including only the keys: fullTextBlocks and originalText.
// `;

const promptText = `
당신은 영어 교육 전문가입니다.

1. 아래에 제공된 이미지를 순서대로 검토하고, 이미지에 포함된 모든 영어 텍스트를 추출하세요.
2. 이미지 상단에 다음과 같은 헤더 또는 라벨이 보일 경우,
   반드시 모든 출력에서 제외하고 분석하지 마세요:
   - "upgrade your speaking skills"
   - "NEWS"
   - "LISTENING PRACTICE"
3. 각주 번호나 기호(예: ¹, ², ³ 등)는 원문에서 제거해야 하며,
   어떤 출력 결과에도 포함되어서는 안 됩니다.
4. 각 이미지마다 시각적으로 상단에 보이는 메인 제목이나 헤드라인
   (예: "Granddaughter's Ukulele Lessons")이 있다면 이를 추출하여
   "title" 필드에 포함하세요.
5. 추출한 텍스트는 이미지별로 그룹화하세요 (예: Image 1, Image 2).
6. 문단(시각적 블록) 구조를 정확히 그대로 유지하세요.
   - 각 문단은 문장들의 리스트 형태로 반환해야 합니다.

7. [fullTextBlocks] 필드:
   - 각 이미지에 대해 다음 정보를 포함하세요:
     - "source": 이미지 이름 또는 ID
     - "title": 메인 제목 또는 헤드라인 텍스트 (없을 경우 빈 문자열)
     - "paragraphs": 리듬 마커(•)가 포함된 문장 리스트로 이루어진 문단들의 리스트
   - 각 문장에 대해 리듬 분석을 적용하세요.
   - 원어민 화자의 강세(강조)와 리듬 마커(•)를 포함하세요.

8. [originalText] 필드:
   - 반드시 fullTextBlocks와 동일한 JSON 배열 구조로 반환하세요.
   - 단, 각 블록의 텍스트(paragraphs)는 원본 이미지에서 추출된 텍스트를 어떠한 수정도 없이 그대로 사용해야 합니다.
   - 대소문자, 공백, 줄바꿈, 구두점을 포함한 모든 원본 서식을 정확히 유지하세요.
   - 리듬 마커(•), 대문자 변형, 강조 표시, 추가 기호를 절대 적용하지 마세요.
   - OCR로 추출된 텍스트를 있는 그대로 반환해야 합니다.

9. 예시:
   - 원본 이미지:
     Title: "Granddaughter's Ukulele Lessons"
     Paragraph: "my daughter has been learning the ukulele in an after-school program for six years now."
   - [originalText]:
     [
       {
         "source": "Image 1",
         "title": "Granddaughter's Ukulele Lessons",
         "paragraphs": [
           [
             "my daughter has been learning the ukulele in an after-school program for six years now."
           ]
         ]
       }
     ]
   - [fullTextBlocks] 예시:
     [
       {
         "source": "Image 1",
         "title": "Granddaughter's Ukulele Lessons",
         "paragraphs": [
           [
             "my DAUGHter • has been LEARNing • the UKEleLE • in an AFter-school program • for SIX years NOW."
           ]
         ]
       }
     ]

결과는 반드시 JSON 형식으로만 반환하며,
키는 fullTextBlocks 와 originalText 두 가지만 포함해야 합니다.
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
            title: { type: Type.STRING, description: "Main title or headline text for this image, or empty string if none" },
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
          required: ["source", "title", "paragraphs"],
        },
      },
      originalText: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            source: { type: Type.STRING },
            title: { type: Type.STRING },
            paragraphs: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          },
          required: ["source", "title", "paragraphs"]
        },
        description: "The full original extracted text from all images, grouped by image, preserving all line breaks and paragraph structure."
      },
    },
    required: ["fullTextBlocks", "originalText"],
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
    아래의 영어 문장을 한국인 학습자를 위해 분석하세요:
    "${sentence}"

    중요: 분석 및 설명 시, 스캔된 문장과 구의 원본 대소문자를 반드시 그대로 보존하세요. 입력의 대소문자를 변경하지 마세요.

    아래 항목을 반드시 제공하세요:
    1. 'mainVerb': 이 문장의 주요 동사(서술어)를 정확히 추출해 문자열로 반환하세요. (예: "started")
    2. 'otherVerbs': 문장 내 등장하는 다른 동사 형태(예: ["studying", "forgetting"])를 리스트로 반환하세요.
    3. 'form': 문장의 형식(예: 1형식, 3형식). 반드시 주절 기준으로만 라벨을 반환하세요.
    4. 'diagram': 문장이 복잡한 구조(복수 절, 삽입구, 긴 문장 등)일 때만, 시각적으로 구조를 보여주는 트리 다이어그램을 만들어주세요. (들여쓰기, 유니코드 └──, ├──, │ 사용) 아주 짧거나 단순한 문장은 다이어그램을 생성하지 말고 빈 문자열 또는 "간단한 문장에는 해당 없음" 등으로 반환하세요.
       - 각 노드에는 영어 구(원본 대소문자), 문법적 역할(예: S, V, O, C, Mod), 짧은 한글 설명을 괄호로 표기하세요.
       - 업로드된 이미지에서 추출된 구는 원본 구와 대소문자를 최대한 보존하세요.
       - 구조의 계층과 관계를 명확히 보여주어 시각적 학습자가 한눈에 이해할 수 있게 하세요.
       예시(복잡):
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
       예시(간단):
        "I agree." → 간단한 문장에는 해당 없음
    5. 'structure': 문장 구조를 단계별로 자세히 설명하세요. 각 부분이 어떻게 연결되는지 시각적/논리적으로 설명(이미지의 다이어그램을 설명하듯)하세요.
       - 주요 구성요소는 번호(1., 2.)로, 하위 구성요소는 *로, 더 깊은 단계는 들여쓰기로 구분하세요.
       - 각 구/단어마다:
         - 영어(원본 대소문자)
         - 문법적 역할
         - 짧은 한글 설명
         - 해당 단어나 구의 직접적인 한글 의미/번역(따옴표로, 예: '그러나')
       - 강조된 단어(예: But)는 강조임을 명확히 표기하고, 한글 의미도 분명히 보여주세요.
       - 마지막에 전체 구조 공식(예: "전체 구조: S + V + O + ...")을 요약하세요.
       - 영어 설명에는 마크다운(볼드 없이)만 사용하세요.
       - 예시(한글):
         1. But: 접속사, 문맥 연결. '그러나' (강조)
         2. as I kept going: 시간 부사절, (~하면서, 계속 진행함에 따라)
            * as: 접속사 (~하면서), '~하면서'
            * I: 주어, '나'
            * kept going: 동사구, '계속했다'
              * kept: 동사, '계속 ~하다'
              * going: 동명사, 'kept'의 목적어, '진행'
         전체 구조: S + V + ...
    6. 'translation': 자연스러운 한글 번역.
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
