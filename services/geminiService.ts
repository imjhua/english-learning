
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
3. **각주 처리 방법 (매우 중요 - 정확하게 수행할 것)**:
   - 각주 번호 기호(¹, ², ³, ⁴, ⁵, ⁶, ⁷, ⁸, ⁹, ⁰)와 각주 기호(※, †, ‡, §, ¶ 등)는 원문에서 완전히 제거합니다.
   - 각주는 "삭제"합니다 - "(" ")" """ "'" 등 다른 문자로 변환하거나 대체하면 안 됩니다.
   - 각주가 단어 뒤에 붙어있으면: "word¹" → "word" (각주만 제거, 단어는 유지)
   - 각주 자리에 공백을 추가하거나 특수 문자를 넣으면 안 됩니다.
   - 삭제 후 인접한 단어들 사이의 공백은 원문 그대로 유지합니다.
   - 예를 들어 "example¹ text" 는 "example text" 로 변환됩니다 (각주만 제거, 공백 유지).
   - **절대 금지 사항**:
     * "word¹" → "word"" (큰따옴표 추가) ✗
     * "word¹" → "word'" (작은따옴표 추가) ✗
     * "word¹" → "word(" (괄호 추가) ✗
     * "word¹" → "word-" (하이픈 추가) ✗
     * "word¹" → "" (공백 대체) ✗
   - 이 규칙은 fullTextBlocks와 originalText 모두에 적용됩니다.
4. 각 이미지마다 시각적으로 상단에 보이는 메인 제목이나 헤드라인
   (예: "Granddaughter's Ukulele Lessons")이 있다면 이를 추출하여
   "title" 필드에 포함하세요.
5. 추출한 텍스트는 이미지별로 그룹화하세요 (예: Image 1, Image 2).
6. 문단(시각적 블록) 구조를 정확히 그대로 유지하세요.
   - 각 문단은 문장들의 리스트 형태로 반환해야 합니다.

7. **[forms] 필드 (새로 추가됨 - 매우 중요)**:
   - 각 문장의 "5가지 문장 형식"을 정확히 분류하세요.
   - 형식 분류 기준:
     * "1형식": S + V (동사만 있고 보어나 목적어 없음) - 예: "She sleeps."
     * "2형식": S + V + C (주어 + 동사 + 보어) - 예: "She is tired.", "He became a doctor."
     * "3형식": S + V + O (주어 + 동사 + 목적어) - 예: "She likes coffee.", "He reads books."
     * "4형식": S + V + I.O. + D.O. (주어 + 동사 + 간접목적어 + 직접목적어) - 예: "She gave me a book.", "He showed her the document."
     * "5형식": S + V + O + C (주어 + 동사 + 목적어 + 목적보어) - 예: "She made him happy.", "I found the book interesting."
   - 복합 문장이나 여러 절이 있는 경우, 주절(main clause)의 형식만 분류하세요.
   - [forms] 배열은 각 단락별로 문장 개수와 일치해야 합니다.
   - 예: paragraphs에 2개 문장이 있으면 forms도 2개의 형식이 있어야 합니다.
   - 예시: ["1형식", "3형식", "2형식"]

8. [fullTextBlocks] 필드: ⭐ 리듬 마커(•)가 가장 중요한 요소입니다. 반드시 정확하게 적용하세요.
   - 각 이미지에 대해 다음 정보를 포함하세요:
     - "source": 이미지 이름 또는 ID
     - "title": 메인 제목 또는 헤드라인 텍스트 (없을 경우 빈 문자열)
     - "paragraphs": 리듬 마커(•)가 포함된 문장 리스트로 이루어진 문단들의 리스트
     - "forms": 각 문단의 문장 형식 배열 (예: ["1형식", "3형식"])
   - 각 문장에 대해 리듬 분석을 적용하세요.
   - 원어민 화자의 강세(강조)를 대문자로 표시하세요 (예: "REAL", "ESTATE", "downTURN").
   
   ⭐⭐⭐ 동사 표시 (매우 중요):
   - 문장의 **메인 동사(주절의 주동사)만** <VERB_형식>동사</VERB_형식> 형식으로 감싸세요.
   - 형식은 그 메인 동사가 속한 문장의 형식을 나타냅니다: <VERB_1형>, <VERB_2형>, <VERB_3형>, <VERB_4형>, <VERB_5형>
   - **절대 금지**: 보조 동사(have, be, do 등), 부정사, 분사, 종속절의 동사는 태그를 붙이면 안 됩니다.
   - 예: "she <VERB_3형>has approved</VERB_3형> the plan <TOINF_NOM>to START</TOINF_NOM>" (메인 동사 "approved"만 마킹, "has"는 마킹 X, "START"는 부정사라 마킹 X)
   - 예: "I <VERB_3형>saw</VERB_3형> him <TOINF_NOM>steal</TOINF_NOM> the money" (메인 동사 "saw"만 마킹, "steal"은 부정사)
   - 동사 내부에는 대문자 강조가 유지되어야 합니다. 예: "<VERB_3형>HAS APPROVED</VERB_3형>"
   
   ⭐⭐⭐ To부정사 용법 표시 (매우 중요):
   - To부정사가 나타나면 반드시 다음 정확한 태그 형식을 사용하세요:
     * 형용사적용법: <TOINF_ADJ>to infinitive</TOINF_ADJ>
     * 명사적용법: <TOINF_NOM>to infinitive</TOINF_NOM>
     * 부사적용법: <TOINF_ADV>to infinitive</TOINF_ADV>
   - 중요: 태그 이름에 반드시 언더스코어(_)를 포함하세요. (TOINF_ADJ, TOINF_NOM, TOINF_ADV)
   - 중요: To부정사 내부에서도 강세(대문자)를 그대로 유지하세요.
   - 예: "I <VERB_3형>want</VERB_3형> <TOINF_NOM>to LEARN</TOINF_NOM>" (명사적, LEARN에 강세)
   - 예: "She <VERB_3형>studied</VERB_3형> hard <TOINF_ADV>to PASS the exam</TOINF_ADV>" (부사적, PASS에 강세)
   - 예: "<TOINF_ADJ>to READ</TOINF_ADJ>", "<TOINF_ADV>to REPAIR</TOINF_ADV>" (내부 강세 보존 - 대문자만)
   - 금지: "to rePAIR" (혼합 대소문자), "re_PAIR" (언더스코어), "re-PAIR" (하이픈)
   - 중요: 강세 표시는 반드시 대문자만 사용하세요. 언더스코어(_)나 다른 기호는 절대 금지입니다.
   
   ⭐⭐⭐ 숙어(Idiom) 표시 (매우 중요):
   - 문장에 숙어(phrasal verb, 관용 표현)가 있으면 반드시 <IDIOM>숙어</IDIOM> 형식으로 태그를 붙이세요.
   - 숙어 판별 기준: 한 단어의 동사와 전치사/부사가 결합해 새로운 의미를 이루는 경우
   - 일반 동사와 전치사의 조합 예: "come across" (우연히 만나다), "run into" (우연히 만나다), "put into" (노력을 쏟다), "pop into" (갑자기 떠오르다/나타나다)
   - 예: "He <VERB_3형>gave</VERB_3형> <IDIOM>up smoking</IDIOM>" (포기하다)
   - 예: "I <VERB_3형>look</VERB_3형> <IDIOM>forward to</IDIOM> the meeting" (기다리다)
   - 예: "She <VERB_3형>came</VERB_3형> <IDIOM>across</IDIOM> an old friend" (우연히 만나다)
   - 예: "They <VERB_3형>put</VERB_3형> <IDIOM>up with</IDIOM> the noise" (견디다)
   - 예: "The idea <VERB_3형>popped</VERB_3형> <IDIOM>into</IDIOM> my head" (갑자기 떠오르다)
   - 예: "He <VERB_3형>put</VERB_3형> <IDIOM>effort into</IDIOM> the project" (노력을 쏟다)
   - 예: "She <VERB_3형>ran</VERB_3형> <IDIOM>into</IDIOM> an old classmate" (우연히 만나다)
   - 예: "I <VERB_3형>look</VERB_3형> <IDIOM>after</IDIOM> my siblings" (돌보다)
   - 예: "He <VERB_3형>got</VERB_3형> <IDIOM>over</IDIOM> his illness" (극복하다)
   - 숙어 내부의 강세(대문자)는 그대로 유지하세요: <IDIOM>GIVE UP</IDIOM>, <IDIOM>look FORward TO</IDIOM>
   - 숙어가 여러 단어로 이루어진 경우: <IDIOM>come across</IDIOM>, <IDIOM>put up with</IDIOM>, <IDIOM>look forward to</IDIOM>, <IDIOM>pop into</IDIOM>, <IDIOM>put effort into</IDIOM>
   
   ⭐⭐⭐ 동사 구(verb phrase) 처리 (매우 중요):
   - 메인 동사가 조동사(have, be, do, will, can 등) + 주동사의 조합이면, 그 구 전체를 **하나의 호흡 단위**로 봅니다.
   - 이 경우 주동사만 <VERB_형식> 태그로 감싸세요. 조동사는 태그 내부에만 포함하고 별도로 마킹하지 않습니다.
   - 예: "<VERB_3형>has been learning</VERB_3형>" → [호흡 단위] (내부 마커 절대 금지)
   - 예: "<VERB_3형>will continue</VERB_3형>" → [호흡 단위] (내부 마커 절대 금지)
   - 예: "<VERB_3형>is going</VERB_3형>" → [호흡 단위] (내부 마커 절대 금지)
   - 동사 구 내부의 조동사-동사 사이에는 절대 마커를 넣으면 안 됩니다.
   - 동사 구 뒤의 목적어와의 경계에만 마커를 넣을 수 있습니다.
   - 예: "she <VERB_3형>has been learning</VERB_3형> • the piano" (동사 구 내부 마커 X, 뒤 마커 O)
   
   【호흡 단위의 정의】
   - 한 호흡 단위 = 원어민이 쉬지 않고 한 번에 읽을 수 있는 의미 있는 구(phrase)
   - 호흡 단위는 문법적, 의미적으로 자연스럽고 응집력 있는 단어 그룹
   - 예: "President Donald Trump" (한 개념으로 묶이는 3개 단어)
   - 예: "has been learning" (한 동사 행위를 나타내는 3개 단어)
   - 예: "a beautiful garden" (명사구: 관사 + 형용사 + 명사)
   - 호흡 단위 내의 모든 단어는 일반 공백(space)으로만 분리됨 → 마커 없음
   
   【호흡 단위 결정 원칙】
   - 원어민의 자연스러운 발화 흐름을 따름
   - 의미적 응집력이 있는 단위로 묶음
   - 지나치게 짧은 호흡 단위는 피함 (예: "a • cat" X)
   - 마커는 필요한 경우만 최소한으로 사용
   - 문장 내 호흡 경계가 명확한 곳에만 마커 배치
   
   【마커가 올 수 있는 유일한 위치】
   - 두 개의 서로 다른 호흡 단위 사이의 경계에만 마커(•)가 옴
   - 마커는 호흡 경계의 공백을 대체함
   - 예: "[호흡1: President Donald Trump] • [호흡2: has been learning] • [호흡3: the piano]"
   - 호흡 단위 내부의 어떤 공백도 마커로 바뀌면 안 됨
   
   【마커는 최소한으로만 사용 - 필요한 곳에만】
   - 호흡 경계가 명확하고 의미적으로 구분이 필요한 곳에만 마커 배치
   - 불필요한 마커는 절대 삽입하지 말 것
   - 전체 문장에서 꼭 필요한 경계에만 마커를 사용
   - 예: "I like coffee" (짧은 문장, 호흡 경계 불명확 → 마커 없음)
   - 예: "the beautiful garden in the backyard • needs water" (명확한 경계에만 마커)
   
   【절대 금지 - 같은 호흡 내 단어들 사이에 마커 금지】
   - "CHI • na's" X (중국이 한 호흡인데 마커 있음 - 금지)
   - "President • Donald • Trump" X (같은 호흡이면 공백만 - 금지)
   - "has • been • learning" X (동사 구는 한 호흡 - 금지)
   - "word1 • word2" X (같은 호흡이면 공백만 - 금지)
   - "a • cat" X (같은 호흡이면 공백만 - 금지)
   
   【단어 내부 절대 금지】
   - "criti•cal" X, "cau_tious" X, "learn-ing" X, "CHI•na" X
   - 단어는 공백으로만 구분되며, 내부에 어떤 기호도 불가
   
   【올바른 형식】
   - 같은 호흡 단위 내: word1 word2 word3 (공백만 사용)
   - 호흡 경계에만: word3 • word4 (마커는 호흡 사이에만)
   
   【원문의 공백 구조를 절대 변경하지 말 것 - 이것이 China's 문제의 핵심】
   - 원문에 공백이 없으면 공백을 절대 추가해서 안 됩니다
   - "China's" (원문: 공백 없음) → 올바름: "CHIna's" (공백 없음)
   - "China's" → 틀림: "CHI • na's" (공백 추가하고 마커 삽입)
   - "it's", "they're", "don't" 같은 축약형은 절대 공백 삽입 금지
   - "mother-in-law", "well-known" 같은 하이픈 단어는 한 호흡
   - 원문의 공백 위치만 마커 배치 고려 대상
   - 예: "New York" (원문: 공백 있음) → 호흡 경계면 "New • York" O
   - 예: "China's" (원문: 공백 없음) → "CHIna's" (공백 추가 금지)
   
   
   ⭐⭐⭐ 리듬 마커(•) 사용 규칙 (매우 중요 - 반드시 정확하게 적용):
   - 한 호흡 단위 = 원어민이 한 번에 쉬지 않고 읽을 수 있는 의미 있는 구(phrase)
   - 호흡 단위 내의 단어들은 일반 공백(space)으로 분리됨 (마커 없음)
   - 마커(•)는 두 호흡 단위 사이의 경계에만 옴
   
   【마커 배치의 핵심 - 원문의 공백 구조 존중】
   - 마커는 원문에 있는 공백 위치에만 배치됨
   - 마커는 호흡이 끝나고 다음 호흡이 시작되는 "원문의 공백"을 대체함
   - 호흡 단위 내부의 공백은 일반 공백으로 남음
   - 예: [호흡1: word1 word2] • [호흡2: word3 word4]
   - 호흡1 내: word1과 word2는 일반 공백으로만 분리
   - 호흡 경계: 호흡1의 word2와 호흡2의 word3 사이에만 마커(•)
   - ⚠️ 원문에 공백이 없으면 절대 공백을 만들어내면 안 됨
   - "China's" 원문에 공백 없음 → "CHIna's" (공백 추가 금지)
   
   【틀리기 쉬운 사례 - 절대 금지】
   - "CHI • na's" X (한 호흡인데 마커 삽입됨 - 틀림)
   - "has • been" X (동사 구는 한 호흡인데 마커 삽입됨 - 틀림)
   - "word1 • word2" X (같은 호흡이면 공백만 - 틀림)
   - "President • Donald Trump" X (같은 호흡이면 마커 불가 - 틀림)
   
   【올바른 사례】
   - "President Donald Trump • <VERB_3형>has been learning</VERB_3형> • the piano"
     → [호흡1: President Donald Trump] • [호흡2: has been learning] • [호흡3: the piano]
   - "my DAUGHter • <VERB_3형>has been LEARNing</VERB_3형> • the UKEleLE"
     → [호흡1: my DAUGHter] • [호흡2: has been learning] • [호흡3: the UKEleLE]
   - China's (한 호흡이면): "CHI • na's" X (틀림), "CHI na's" O (올바름)
   - 영어는 공백 기준으로 한 호흡을 구성하므로, 공백이 있으면 그 공백 위치에만 마커를 고려해야 합니다.
   
   단어 강조 표시:
   - 각 호흡 단위 내에서 원어민의 강세를 대문자로 표시합니다.
   - 마커와 별개: 마커는 호흡 경계, 강조는 단어 내부의 음성 강세
   - 예: "my DAUGHter <VERB>has been LEARNing</VERB> the UKEleLE" (마커 없음, 강조만 적용)
   
   구체적 예시:
   - ✓ "my DAUGHter • <VERB_3형>has been LEARNing</VERB_3형> • the UKEleLE • in an AFter-school program • for SIX years NOW"
   - ✗ "RESearch on GRIT • <VERB_3형>shows</VERB_3형> how GENuine INterest • <VERB_5형>helps</VERB_5형> PEOple • <VERB_3형>stay enGAGED</VERB_3형> • and <VERB_3형>disCOVer</VERB_3형> new posiBILities" (구조: "discover"는 "stay engaged"와 대등하지만, 부정사 형태가 아님. 메인 동사는 "shows"와 "helps"만)
   - ✗ "<VERB_3형>has</VERB_3형> • <VERB_3형>been</VERB_3형> learning" (동사 구 내부 마커 - 절대 금지, 한 덩어리로 마킹해야 함)
   - ✗ "down•TURN" (단어 내부 마커 - 절대 금지)

8. [originalText] 필드:
   - 반드시 fullTextBlocks와 동일한 JSON 배열 구조로 반환하세요.
   - 단, 각 블록의 텍스트(paragraphs)는 원본 이미지에서 추출된 텍스트를 사용하되,
     각주 번호나 기호(예: ¹, ², ³ 등)는 제거해야 합니다. 이때 각주를 다른 문자로 대체하지 마세요.
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
             "PREsident DONald TRUMP • <VERB_3형>has apPROVED</VERB_3형> a DEAL alLOWing TikTok • <VERB_3형>to conTINue</VERB_3형> OPerating in the uNIted STATES • under a NEW joint VENture STRUCture."
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
            forms: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of sentence forms (e.g., '1형식', '2형식', '3형식', '4형식', '5형식') corresponding to each paragraph/sentence group"
            }
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
            },
            forms: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of sentence forms (e.g., '1형식', '2형식', '3형식', '4형식', '5형식')"
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

    **중요 사전 처리 단계:**
    1. 문장에 포함된 각주 번호나 기호(¹, ², ³, ⁴, ⁵, ⁶, ⁷, ⁸, ⁹, ⁰, ※, †, ‡, §, ¶ 등)를 모두 제거하세요.
       - 각주를 "삭제"합니다 - 다른 문자로 대체하면 안 됩니다.
       - 각주가 단어 뒤에 있으면: "word¹" → "word" (각주만 제거)
       - 각주 자리에 특수 문자나 공백을 추가하면 안 됩니다.
       - 예: "example¹ text" → "example text"
       - 절대 금지: "word¹" → "word"" (큰따옴표 추가 금지)
    2. 이 단계 이후의 모든 분석은 각주가 제거된 정제된 문장을 기준으로 수행하세요.

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
       - To부정사가 포함되어 있으면, 그 용법을 명시하세요: (명사적), (형용사적), (부사적)
       
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
       
       To부정사 예시:
       [전체구조]: S + V + O
       - **I**: 주어
         → 나는
       - **want**: 동사 (3형식)
         → 원한다
       - **to learn English**: 목적어 (명사적 to부정사)
         → 영어를 배우기를
         - **to learn**: 명사적 to부정사 (동사의 목적어로 기능)
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
2. **각주 처리 방법 (매우 중요 - 정확하게 수행할 것)**:
   - 각주 번호 기호(¹, ², ³, ⁴, ⁵, ⁶, ⁷, ⁸, ⁹, ⁰)와 각주 기호(※, †, ‡, §, ¶ 등)는 원문에서 완전히 제거합니다.
   - 각주는 "삭제"합니다 - "(" ")" """ "'" 등 다른 문자로 변환하거나 대체하면 안 됩니다.
   - 각주가 단어 뒤에 붙어있으면: "word¹" → "word" (각주만 제거, 단어는 유지)
   - 각주 자리에 공백을 추가하거나 특수 문자를 넣으면 안 됩니다.
   - 삭제 후 인접한 단어들 사이의 공백은 원문 그대로 유지합니다.
   - 예를 들어 "example¹ text" 는 "example text" 로 변환됩니다 (각주만 제거, 공백 유지).
   - **절대 금지 사항**:
     * "word¹" → "word"" (큰따옴표 추가) ✗
     * "word¹" → "word'" (작은따옴표 추가) ✗
     * "word¹" → "word(" (괄호 추가) ✗
     * "word¹" → "word-" (하이픈 추가) ✗
     * "word¹" → "" (공백 대체) ✗
   - 이 규칙은 fullTextBlocks와 originalText 모두에 적용됩니다.
3. 각 문장에 대해 리듬 분석을 적용하세요:
   - 원어민 화자의 강세(강조)를 대문자로 표시하세요 (예: "REAL", "ESTATE", "downTURN").
   
   ⭐⭐⭐ 동사 표시 (매우 중요):
   - 문장의 **메인 동사(주절의 주동사)만** <VERB_형식>동사</VERB_형식> 형식으로 감싸세요.
   - 형식은 그 메인 동사가 속한 문장의 형식을 나타냅니다: <VERB_1형>, <VERB_2형>, <VERB_3형>, <VERB_4형>, <VERB_5형>
   - **절대 금지**: 보조 동사(have, be, do 등), 부정사, 분사, 종속절의 동사는 태그를 붙이면 안 됩니다.
   - 예: "she <VERB_3형>has approved</VERB_3형> the plan <TOINF_NOM>to START</TOINF_NOM>" (메인 동사 "approved"만 마킹, "has"는 마킹 X, "START"는 부정사라 마킹 X)
   - 예: "I <VERB_3형>saw</VERB_3형> him <TOINF_NOM>steal</TOINF_NOM> the money" (메인 동사 "saw"만 마킹, "steal"은 부정사)
   - 동사 내부에는 대문자 강조가 유지되어야 합니다. 예: "<VERB_3형>HAS APPROVED</VERB_3형>"
   
   ⭐⭐⭐ To부정사 용법 표시 (매우 중요):
   - To부정사가 나타나면 반드시 다음 정확한 태그 형식을 사용하세요:
     * 형용사적용법: <TOINF_ADJ>to infinitive</TOINF_ADJ>
     * 명사적용법: <TOINF_NOM>to infinitive</TOINF_NOM>
     * 부사적용법: <TOINF_ADV>to infinitive</TOINF_ADV>
   - 중요: 태그 이름에 반드시 언더스코어(_)를 포함하세요. (TOINF_ADJ, TOINF_NOM, TOINF_ADV)
   - 중요: To부정사 내부에서도 강세(대문자)를 그대로 유지하세요.
   - 예: "I <VERB_3형>want</VERB_3형> <TOINF_NOM>to LEARN</TOINF_NOM>" (명사적, LEARN에 강세)
   - 예: "She <VERB_3형>studied</VERB_3형> hard <TOINF_ADV>to PASS the exam</TOINF_ADV>" (부사적, PASS에 강세)
   - 예: "<TOINF_ADJ>to READ</TOINF_ADJ>", "<TOINF_ADV>to REPAIR</TOINF_ADV>" (내부 강세 보존 - 대문자만)
   - 금지: "to rePAIR" (혼합 대소문자), "re_PAIR" (언더스코어), "re-PAIR" (하이픈)
   - 중요: 강세 표시는 반드시 대문자만 사용하세요. 언더스코어(_)나 다른 기호는 절대 금지입니다.
   
   ⭐⭐⭐ 숙어(Idiom) 표시 (매우 중요):
   - 문장에 숙어(phrasal verb, 관용 표현)가 있으면 반드시 <IDIOM>숙어</IDIOM> 형식으로 태그를 붙이세요.
   - 예: "He <VERB_3형>gave</VERB_3형> <IDIOM>up smoking</IDIOM>" (포기하다)
   - 예: "I <VERB_3형>look</VERB_3형> <IDIOM>forward to</IDIOM> the meeting" (기다리다)
   - 예: "She <VERB_3형>came</VERB_3형> <IDIOM>across</IDIOM> an old friend" (우연히 만나다)
   - 예: "They <VERB_3형>put</VERB_3형> <IDIOM>up with</IDIOM> the noise" (견디다)
   - 숙어 내부의 강세(대문자)는 그대로 유지하세요: <IDIOM>GIVE UP</IDIOM>, <IDIOM>look FORward TO</IDIOM>
   - 숙어가 여러 단어로 이루어진 경우: <IDIOM>come across</IDIOM>, <IDIOM>put up with</IDIOM>
   
   ⭐⭐⭐ 동사 구(verb phrase) 처리 (매우 중요):
   - 조동사(have, be, do, will, can 등) + 주동사의 조합은 "하나의 호흡 단위"입니다.
   - 예: "<VERB_3형>has been learning</VERB_3형>" → [호흡 단위] (내부 마커 절대 금지)
   - 예: "<VERB_3형>will continue</VERB_3형>" → [호흡 단위] (내부 마커 절대 금지)
   - 동사 구 내부의 조동사-동사 사이에는 절대 마커를 넣으면 안 됩니다.
   
   ⭐⭐⭐ 리듬 마커(•)의 정의 (매우 중요):
   - 리듬 마커는 "한 호흡으로 이어지는 의미 단위"를 구분하는 표시입니다.
   - 마커는 호흡 단위(breath group)의 경계에만, 그리고 오직 하나만 위치합니다.
   - 마커는 두 호흡 단위 사이의 공백을 대체합니다 (호흡 단위 경계의 공백 위치에만).
   - "한 단어" = 공백으로만 구분되는 최소 단위 (예: "learning", "has", "been", "cautious", "critical")
   - "단어 내부"에는 절대 어떤 기호도 들어갈 수 없습니다 (마커(•), 언더스코어(_), 하이픈(-), 기타 기호 금지).
     * 예: "criti•cal" X, "cau_tious" X, "learn-ing" X, "CRI•ti•cal" X, "CAU_tious" X
   - "같은 호흡 단위 내의 단어들 사이의 공백"에도 절대 어떤 기호도 들어갈 수 없습니다.
     * 예: "President • Donald Trump" X (같은 호흡 내 단어 사이 - 금지)
     * 예: "CHI • na's" X (같은 호흡이면 공백만 - 금지)
     * 예: "word1 • word2 • word3" X (같은 호흡이면 모두 공백 없음)
   - 마커는 "호흡 단위의 마지막 단어"와 "다음 호흡 단위의 첫 단어" 사이의 공백에만 올 수 있습니다.
     * 마커가 올 수 있는 유일한 위치: 두 호흡 경계의 공백만
     * 예: "[호흡1] • [호흡2]" (호흡과 호흡 사이에만)
   
   【원문의 공백 구조를 절대 변경하지 말 것 - 이것이 China's 문제의 핵심】
   - 원문에 공백이 없으면 공백을 절대 추가해서 안 됩니다
   - "China's" (원문: 공백 없음) → 올바름: "CHIna's" (공백 없음)
   - "China's" → 틀림: "CHI • na's" (공백 추가하고 마커 삽입)
   - "it's", "they're", "don't" 같은 축약형은 절대 공백 삽입 금지
   - "mother-in-law", "well-known" 같은 하이픈 단어는 한 호흡
   - 원문의 공백 위치만 마커 배치 고려 대상
   
   
   ⭐⭐⭐ 리듬 마커(•) 사용 규칙 (매우 중요 - 반드시 정확하게 적용):
   - 한 호흡 단위 = 원어민이 한 번에 쉬지 않고 읽을 수 있는 의미 있는 구(phrase)
   - 호흡 단위는 문법적, 의미적으로 자연스럽고 응집력 있는 단어 그룹
   - 예: "President Donald Trump" (한 호흡), "<VERB>has approved</VERB> a deal" (다음 호흡)
   - 두 호흡 사이의 경계에만 마커를 배치: "...Trump • <VERB>has approved</VERB> a deal..."
   - 호흡 단위 내의 모든 단어들 사이에는 절대 마커를 넣을 수 없습니다.
   - 원문의 공백 구조를 변경하면 안 됩니다 (China's → CHIna's, 공백 추가 금지)
   
   【마커는 최소한으로만 사용 - 필요한 곳에만】
   - 호흡 경계가 명확하고 의미적으로 구분이 필요한 곳에만 마커 배치
   - 불필요한 마커는 절대 삽입하지 말 것
   - 전체 문장에서 꼭 필요한 경계에만 마커를 사용
   - 예: "I like coffee" (짧은 문장, 호흡 경계 불명확 → 마커 없음)
   - 예: "the beautiful garden in the backyard • needs water" (명확한 경계에만 마커)
   - 과도한 마커 배치 금지: "my • DAUGHter • has • been • learning" X
   
   ✓ 올바른 마커 배치:
     * 호흡 단위 경계에만 마커: "President Donald Trump • <VERB>has approved</VERB> a deal"
     * 각 호흡 단위 내의 단어들은 공백으로 연결: [President Donald Trump] • [<VERB>has approved</VERB> a deal]
     * 예시: "my DAUGHter • <VERB>has been LEARNing</VERB> • the UKEleLE"
       (호흡 단위: [my DAUGHter], [<VERB>has been LEARNing</VERB>], [the UKEleLE])
   
   ✗ 절대 금지 (어떤 기호도 호흡 단위 내부나 단어 내부에):
     * "President • Donald Trump" (한 호흡 내 마커 - 금지)
     * "CHI • na's" (원문에 공백이 없으므로 틀림 - China's → CHIna's)
     * "President_Donald Trump" (한 호흡 내 언더스코어 - 금지)
     * "<VERB>has</VERB> • <VERB>been</VERB> learning" (동사 구 내부 마커 - 금지)
     * "has • approved a deal" (한 호흡 내 마커 - 금지)
     * "down•TURN" (단어 내부 마커 - 금지)
     * "cau_tious" (단어 내부 언더스코어 - 금지)
   
   【마커와 공백의 관계 - 원문을 기준으로】
   - 호흡 단위 내부의 단어들 사이의 공백: 일반 공백 (마커 없음)
   - 호흡 경계의 공백: 마커(•)로 대체 (원문에 공백이 있는 경우만)
   - 원문에 공백이 없으면 절대 공백을 만들어내면 안 됨
   - 예: "word1 word2 • word3 word4"
     → word1과 word2 사이: 일반 공백
     → word2와 word3 사이: 마커 (호흡 경계)
     → word3과 word4 사이: 일반 공백
   - 예: "China's" (원문: 공백 없음) → "CHIna's" (공백 추가 금지)
   
   ⚠️ 단어 내부에 절대 어떤 문자도 삽입하지 말 것 (매우 중요 - 검증):
   - 언더스코어(_), 마커(•), 하이픈(-), 마침표(.) 등 어떤 문자도 단어 중간에 삽입 금지
   - "critical" → "CRI_tical" X, "critical" → "CRI•tical" X
   - "cautious" → "cau_tious" X, "cautious" → "cau•tious" X  
   - "learning" → "learn_ing" X, "learning" → "learn•ing" X
   - 단어는 공백으로만 구분되며, 내부에 어떤 기호도 삽입되면 안 됩니다.
   - 마커(•)는 오직 두 호흡 단위 경계의 공백에만 올 수 있습니다.
   - 예: "critical thinking" → "CRItical • THINKing" (마커는 호흡 경계에만)

4. **[forms] 필드 (새로 추가됨 - 매우 중요)**:
   - 각 문장의 "5가지 문장 형식"을 정확히 분류하세요.
   - 형식 분류 기준:
     * "1형식": S + V (동사만 있고 보어나 목적어 없음) - 예: "She sleeps."
     * "2형식": S + V + C (주어 + 동사 + 보어) - 예: "She is tired.", "He became a doctor."
     * "3형식": S + V + O (주어 + 동사 + 목적어) - 예: "She likes coffee.", "He reads books."
     * "4형식": S + V + I.O. + D.O. (주어 + 동사 + 간접목적어 + 직접목적어) - 예: "She gave me a book.", "He showed her the document."
     * "5형식": S + V + O + C (주어 + 동사 + 목적어 + 목적보어) - 예: "She made him happy.", "I found the book interesting."
   - 복합 문장이나 여러 절이 있는 경우, 주절(main clause)의 형식만 분류하세요.
   - [forms] 배열은 각 단락의 문장 개수와 일치해야 합니다.
   - 예: 5개 문장이 있으면 forms도 5개의 형식이 있어야 합니다.
   - 예시: ["1형식", "3형식", "2형식", "3형식", "5형식"]

5. [fullTextBlocks] 필드:
   - "source": "Direct Input"
   - "title": "" (빈 문자열)
   - "paragraphs": 리듬 마커(•)가 포함된 문장 리스트를 하나의 문단으로 반환
   - "forms": 각 문장의 형식 배열

6. [originalText] 필드:
   - 반드시 fullTextBlocks와 동일한 JSON 구조로 반환하세요.
   - 각 블록의 텍스트(paragraphs)는 원본 입력 텍스트를 사용하되, 각주 번호나 기호는 제거하세요.
   - 대소문자, 공백, 줄바꿈, 구두점을 포함한 모든 원본 서식을 유지하세요.
   - 리듬 마커(•), 대문자 변형, 강조 표시, 추가 기호를 절대 적용하지 마세요.

7. 결과를 다음 JSON 형식으로만 반환하세요 (마크다운 코드블록 없음):
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
            forms: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of sentence forms (e.g., '1형식', '2형식', '3형식', '4형식', '5형식')"
            }
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
            forms: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
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
