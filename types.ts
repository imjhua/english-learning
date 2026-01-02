
export interface TextBlock {
  source: string;
  title?: string;
  paragraphs: string[][];
  forms?: string[]; // Array of sentence forms (e.g., "1형식", "3형식")
}

export interface RhythmAnalysisResult {
  fullTextBlocks: TextBlock[];
  originalText: TextBlock[];
}

export interface SentenceAnalysisResult {
  sentence: string;
  mainVerb: string;
  otherVerbs: string[];
  form: string;
  structure: string;
  diagram: string;
  translation: string;
}

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

// Processing states
export enum AppStatus {
  IDLE = 'IDLE',
  EXTRACTING = 'EXTRACTING',
  ANALYZING_SENTENCE = 'ANALYZING_SENTENCE',
  READY = 'READY',
  ERROR = 'ERROR'
}
