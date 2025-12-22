
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

7. [fullTextBlocks] 필드: ⭐ 리듬 마커(•)가 가장 중요한 요소입니다. 반드시 정확하게 적용하세요.
   - 각 이미지에 대해 다음 정보를 포함하세요:
     - "source": 이미지 이름 또는 ID
     - "title": 메인 제목 또는 헤드라인 텍스트 (없을 경우 빈 문자열)
     - "paragraphs": 리듬 마커(•)가 포함된 문장 리스트로 이루어진 문단들의 리스트
   - 각 문장에 대해 리듬 분석을 적용하세요.
   - 원어민 화자의 강세(강조)를 대문자로 표시하세요.
   - 하이픈(-)은 절대 사용하지 마세요. 단어를 음절 단위로 나누지 마세요.
   
   ⭐⭐⭐ 리듬 마커(•) 사용 규칙 (매우 중요 - 반드시 정확하게 적용):
   - 리듬 마커는 원어민이 문장을 읽을 때 실제로 호흡을 쉬거나 일시정지하는 지점을 표현합니다.
   - 마커는 의미 단위(chunk)의 끝에 위치하며, 문장의 자연스러운 흐름과 호흡을 반영합니다.
   - 마커를 넣을 때: 사람이 자연스럽게 숨을 쉬거나 생각을 정리하기 위해 멈추는 지점
   - 마커를 넣지 않을 때: 자연스럽게 계속 연음되거나 호흡이 필요 없는 부분
   
   ✓ 마커를 넣는 경우 (반드시):
     * 의미 단위(주어-동사, 주요 정보)가 끝나고 새로운 정보가 시작되는 지점
     * 강한 강세를 가진 단어 뒤에 약한 소리나 새로운 생각이 시작되는 지점
     * 긴 문장에서 호흡이 필요한 구간 (예: "real estate downturn is worsening, • with S&P Global Ratings forecasting")
     * 예시: "China's REAL ESTATE downTURN • is WORSening, • with S&P Global RATings forECasting • an 8% DROP •"
   
   ✗ 마커를 넣지 않는 경우 (절대 금지):
     * 약한 전치사나 관사 앞 (예: "is worsening with S&P" - with 앞에 마커 X)
     * 자연스럽게 한 호흡으로 이어지는 부분 (예: "with S&P Global Ratings" - 내부에 마커 X)
     * 단어 사이의 모든 위치에 마커를 넣는 과도한 표시
   
   구체적 예시:
   - ✓ "China's REAL ESTATE downTURN • is WORSening, • with S&P Global RATings forECasting • an 8% DROP • in 2024"
   - ✗ "China's • REAL • ESTATE • downTURN • is • WORSening •" (과도한 마커)
   - ✗ "is worsening • with S&P" (자연스러운 흐름을 방해하는 마커)
   - ✓ "FORECASTING • an 8% DROP in 2024" (강세 후 호흡이 필요한 지점에만 마커)

8. [originalText] 필드:
   - 반드시 fullTextBlocks와 동일한 JSON 배열 구조로 반환하세요.
   - 단, 각 블록의 텍스트(paragraphs)는 원본 이미지에서 추출된 텍스트를 사용하되,
     각주 번호나 기호(예: ¹, ², ³ 등)는 제거해야 합니다.
   - 대소문자, 공백, 줄바꿈, 구두점을 포함한 모든 원본 서식을 유지하세요.
   - 리듬 마커(•), 대문자 변형, 강조 표시, 추가 기호를 절대 적용하지 마세요.
   - OCR로 추출된 텍스트에서 각주만 제거한 후 반환해야 합니다.

9. 예시:
   - 원본 이미지:
     Title: "TikTok Deal"
     Paragraph: "President Donald Trump has approved a deal allowing TikTok to continue operating in the United States under a new joint-venture structure."
   - [originalText]:
     [
       {
         "source": "Image 1",
         "title": "TikTok Deal",
         "paragraphs": [
           [
             "President Donald Trump has approved a deal allowing TikTok to continue operating in the United States under a new joint-venture structure."
           ]
         ]
       }
     ]
   - [fullTextBlocks] 예시:
     [
       {
         "source": "Image 1",
         "title": "TikTok Deal",
         "paragraphs": [
           [
             "PREsident DONald TRUMP • has apPROVED a DEAL alLOWing TikTok • to conTINue OPerating in the uNIted STATES • under a NEW joint VENture STRUCture."
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
       - 마크다운 bold(**) 표시를 사용하지 마세요. 순수 텍스트만 사용하세요.
       - 다이어그램은 다음 순서로 구성하세요:
         1. [Sentence] 헤더만 표시 (전체 문장은 표시하지 않음)
         2. 주절의 S, V, O를 순서대로 표시
         3. O가 복잡한 구조일 경우, 들여쓰기로 세부 요소(핵심 명사, 수식어 등) 표시
         4. 추가 구조나 종속절이 있으면 "+ 부가 상황 (양보 / 대조)" 또는 "+ 추가 정보"로 표시하고 그 아래에 들여쓰기
         5. 종속절의 S, V 등을 명확히 표시
       - 복잡하지 않으면 생략하되, 꼭 필요한 계층 구조만 포함하세요.
       
       예시:
        [Sentence]
        ├─ S: recent results
        ├─ V: showed
        └─ O: rising revenue in premium cabins
            ├─ 핵심 목적어: rising revenue
            └─ 수식어: in premium cabins
            + 부가 상황 (양보 / 대조)
              └─ even as coach ticket sales dipped
                    ├─ S: coach ticket sales
                    ├─ V: dipped
                    └─ 비교: compared to the previous year

    5. 'structure': 문장 구문을 분석하세요. 뜻도 같이 알려주세요.
       중요:
       - 반드시 첫 줄에만 "[전체구조]: S + V + O" 형태로 전체 문장의 기본 구조를 명시하세요.
       - "[전체구조]: " 다음에 구조를 작성하고 반드시 개행(\n)으로 구분하세요.
       - 그 다음 줄부터 상세 분석을 제공하세요. (각 분석 항목은 "-"로 시작)
       - 각 항목의 뜻 설명(→ 기호)은 반드시 다음 줄에 들여쓰기로 표시하세요. 같은 줄에 표시하면 안 됩니다.
       
       포맷 예시:
       [전체구조]: S + V + O
       - **recent results**: 명사구 (주어)
         → 최근 실적은
       - **showed**: 동사 (3형식)
         → 보여주었다
       - **rising revenue in premium cabins**: 목적어
         → 프리미엄 좌석에서의 매출 증가를
         - **rising**: 현재분사 (증가하는)
         - **revenue**: 명사
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
 * Analyze Direct Text Input for Rhythm
 * Takes user-inputted text and returns rhythm analysis using the same logic as image extraction
 */
export const analyzeTextForRhythm = async (
  text: string
): Promise<RhythmAnalysisResult> => {
  const model = "gemini-2.5-flash";

  const promptText = `
당신은 영어 교육 전문가입니다.

아래에 제공된 영어 텍스트에 대해 리듬 분석을 수행하세요.

입력 텍스트:
"""
${text}
"""

1. 입력된 텍스트를 적절한 문장 단위로 분리하세요.
2. 각주 번호나 기호(예: ¹, ², ³ 등)는 원문에서 제거해야 합니다.
3. 각 문장에 대해 리듬 분석을 적용하세요:
   - 원어민 화자의 강세(강조)를 대문자로 표시하세요.
   - 하이픈(-)은 절대 사용하지 마세요. 단어를 음절 단위로 나누지 마세요.
   
   ⭐⭐⭐ 리듬 마커(•) 사용 규칙 (매우 중요 - 반드시 정확하게 적용):
   - 리듬 마커는 원어민이 문장을 읽을 때 실제로 호흡을 쉬거나 일시정지하는 지점을 표현합니다.
   - 마커는 의미 단위(chunk)의 끝에 위치하며, 문장의 자연스러운 흐름과 호흡을 반영합니다.
   - 마커를 넣을 때: 사람이 자연스럽게 숨을 쉬거나 생각을 정리하기 위해 멈추는 지점
   - 마커를 넣지 않을 때: 자연스럽게 계속 연음되거나 호흡이 필요 없는 부분
   
   ✓ 마커를 넣는 경우 (반드시):
     * 의미 단위(주어-동사, 주요 정보)가 끝나고 새로운 정보가 시작되는 지점
     * 강한 강세를 가진 단어 뒤에 약한 소리나 새로운 생각이 시작되는 지점
     * 긴 문장에서 호흡이 필요한 구간 (예: "real estate downturn is worsening, • with S&P Global Ratings forecasting")
     * 예시: "China's REAL ESTATE downTURN • is WORSening, • with S&P Global RATings forECasting • an 8% DROP •"
   
   ✗ 마커를 넣지 않는 경우 (절대 금지):
     * 약한 전치사나 관사 앞 (예: "is worsening with S&P" - with 앞에 마커 X)
     * 자연스럽게 한 호흡으로 이어지는 부분 (예: "with S&P Global Ratings" - 내부에 마커 X)
     * 단어 사이의 모든 위치에 마커를 넣는 과도한 표시
   
   구체적 예시:
   - ✓ "China's REAL ESTATE downTURN • is WORSening, • with S&P Global RATings forECasting • an 8% DROP • in 2024"
   - ✗ "China's • REAL • ESTATE • downTURN • is • WORSening •" (과도한 마커)
   - ✗ "is worsening • with S&P" (자연스러운 흐름을 방해하는 마커)
   - ✓ "FORECASTING • an 8% DROP in 2024" (강세 후 호흡이 필요한 지점에만 마커)

4. [fullTextBlocks] 필드:
   - "source": "Direct Input"
   - "title": "" (빈 문자열)
   - "paragraphs": 리듬 마커(•)가 포함된 문장 리스트

5. [originalText] 필드:
   - 반드시 fullTextBlocks와 동일한 JSON 구조로 반환하세요.
   - 각 블록의 텍스트(paragraphs)는 원본 입력 텍스트를 사용하되, 각주 번호나 기호는 제거하세요.
   - 대소문자, 공백, 줄바꿈, 구두점을 포함한 모든 원본 서식을 유지하세요.
   - 리듬 마커(•), 대문자 변형, 강조 표시, 추가 기호를 절대 적용하지 마세요.

6. 결과를 다음 JSON 형식으로만 반환하세요 (마크다운 코드블록 없음):
{
  "fullTextBlocks": [
    {
      "source": "Direct Input",
      "title": "",
      "paragraphs": [
        ["리듬 마커가 포함된 첫 번째 문장", "리듬 마커가 포함된 두 번째 문장"]
      ]
    }
  ],
  "originalText": [
    {
      "source": "Direct Input",
      "title": "",
      "paragraphs": [
        ["원본 첫 번째 문장", "원본 두 번째 문장"]
      ]
    }
  ]
}

결과는 반드시 JSON 형식으로만 반환하며, 키는 fullTextBlocks 와 originalText 두 가지만 포함해야 합니다.
`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      fullTextBlocks: {
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
                items: { type: Type.STRING },
              },
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
                items: { type: Type.STRING },
              },
            },
          },
          required: ["source", "title", "paragraphs"],
        },
      },
    },
    required: ["fullTextBlocks", "originalText"],
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

    return JSON.parse(cleanJsonString(response.text)) as RhythmAnalysisResult;
  } catch (error) {
    console.error("Text Rhythm Analysis Error:", error);
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
