import React from 'react';
import { TextBlock } from '../types';

interface AnalyzedTextBlockDisplayProps {
  blocks: TextBlock[];
  isAnalzying: boolean;
  onSentenceClick: (sentence: string) => void;
}

const cleanSentence = (text: string) => {
  return text.replace(/•/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
};

// Helper to detect if a word has stress (2+ uppercase letters)
const isStressedWord = (word: string): boolean => {
  const upperCount = (word.match(/[A-Z]/g) || []).length;
  return word.length > 1 && upperCount >= 2;
};

// Render a single word with optional stress styling
const renderWord = (
  word: string,
  idx: number,
  stressClassName: string,
  normalClassName: string = ''
) => {
  const isStress = isStressedWord(word);
  return (
    <span
      key={idx}
      className={`inline-block mx-[4px] ${isStress ? stressClassName : normalClassName}`}
    >
      {word}
    </span>
  );
};

// Render words from text with stress detection
const renderWordsWithStress = (
  text: string,
  stressClassName: string,
  normalClassName: string = ''
) => {
  const words = text.split(/\s+/).filter(Boolean);
  return words.map((word, idx) => renderWord(word, idx, stressClassName, normalClassName));
};

type ToInfType = 'adj' | 'nom' | 'adv';
const toInfLabels: Record<ToInfType, string> = {
  adj: '형용사',
  nom: '명사',
  adv: '부사',
};
const toInfTitles: Record<ToInfType, string> = {
  adj: '형용사적용법',
  nom: '명사적용법',
  adv: '부사적용법',
};

// Render to-infinitive tag with label and stress
const renderToInfTag = (
  text: string,
  type: ToInfType,
  idx: number
) => {
  return (
    <span
      key={`toinf-${type}-${idx}`}
      className="text-green-600 font-semibold mx-[4px] underline"
      title={toInfTitles[type]}
    >
      {renderWordsWithStress(text, 'font-extrabold text-green-600 scale-105 origin-center')}
      <span className="text-xs text-green-500">({toInfLabels[type]})</span>
    </span>
  );
};

const renderRhythmText = (text: string) => {
  interface TextPart {
    text: string;
    type: 'normal' | 'verb' | 'verb-1형' | 'verb-2형' | 'verb-3형' | 'verb-4형' | 'verb-5형' | 'toinf-adj' | 'toinf-nom' | 'toinf-adv';
    verbForm?: string;
  }

  const parts: TextPart[] = [];
  // Updated regex to capture verb forms
  const tagRegex = /<VERB_([1-5]형)>(.*?)<\/VERB_\1>|<VERB>(.*?)<\/VERB>|<TOINF_ADJ>(.*?)<\/TOINF_ADJ>|<TOINF_NOM>(.*?)<\/TOINF_NOM>|<TOINF_ADV>(.*?)<\/TOINF_ADV>/g;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), type: 'normal' });
    }

    if (match[1] !== undefined) {
      // New format: <VERB_형식>text</VERB_형식>
      const form = match[1];
      const verbText = match[2];
      parts.push({ text: verbText, type: `verb-${form}` as any, verbForm: form });
    } else if (match[3] !== undefined) {
      // Old format: <VERB>text</VERB>
      parts.push({ text: match[3], type: 'verb' });
    } else if (match[4] !== undefined) {
      parts.push({ text: match[4], type: 'toinf-adj' });
    } else if (match[5] !== undefined) {
      parts.push({ text: match[5], type: 'toinf-nom' });
    } else if (match[6] !== undefined) {
      parts.push({ text: match[6], type: 'toinf-adv' });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), type: 'normal' });
  }

  return parts.map((part, pIdx) => {
    // Handle verbs with forms
    if (part.type.startsWith('verb-')) {
      const form = part.verbForm || '';
      return (
        <span key={`verb-${pIdx}`} className="text-red-600 font-semibold mx-[4px]" title={form}>
          {part.text}
          <span className="text-xs text-red-500 font-bold ml-0.5">({form})</span>
        </span>
      );
    }

    // Handle old format verbs
    if (part.type === 'verb') {
      return (
        <span key={`verb-${pIdx}`} className="text-red-600 font-semibold mx-[4px]">
          {part.text}
        </span>
      );
    }

    if (part.type === 'toinf-adj') {
      return renderToInfTag(part.text, 'adj', pIdx);
    }
    if (part.type === 'toinf-nom') {
      return renderToInfTag(part.text, 'nom', pIdx);
    }
    if (part.type === 'toinf-adv') {
      return renderToInfTag(part.text, 'adv', pIdx);
    }

    // Normal text with breath markers
    const chunks = part.text.split('•');
    return (
      <React.Fragment key={`normal-${pIdx}`}>
        {chunks.map((chunk, cIdx) => {
          const words = chunk.split(/\s+/).filter(Boolean);
          if (words.length === 0) return null;

          return (
            <React.Fragment key={cIdx}>
              {words.map((word, wIdx) =>
                renderWord(
                  word,
                  wIdx,
                  'font-extrabold text-indigo-900 scale-105 origin-center',
                  'text-slate-700'
                )
              )}
              {cIdx < chunks.length - 1 && (
                <span className="text-indigo-400 font-light select-none mx-[1px]">•</span>
              )}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  });
};

const AnalyzedTextBlockDisplay: React.FC<AnalyzedTextBlockDisplayProps> = ({
  blocks,
  isAnalzying,
  onSentenceClick,
}) => {
  return (
    <>
      {blocks.map((block, bIdx) => (
        <div key={bIdx} className="space-y-2 sm:space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold">
              {block.source || `Image ${bIdx + 1}`}
            </span>
          </div>
          {block.title && block.title.trim() !== '' && (
            <div className="font-bold text-lg sm:text-xl text-slate-800 mb-1 sm:mb-2">
              {block.title}
            </div>
          )}
          <div className="space-y-3 sm:space-y-6">
            {block.paragraphs.map((paragraph, pIdx) => (
              <div
                key={pIdx}
                className="text-slate-700 leading-7 sm:leading-8 text-sm sm:text-[17px]"
              >
                {paragraph.map((sentence, sIdx) => (
                  <span
                    key={sIdx}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      !isAnalzying && onSentenceClick(cleanSentence(sentence))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        !isAnalzying && onSentenceClick(cleanSentence(sentence));
                      }
                    }}
                    className={`
                      inline
                      cursor-pointer 
                      rounded-md
                      px-1 -mx-0.5
                      decoration-clone
                      transition-colors
                      duration-200
                      ${isAnalzying ? 'cursor-wait opacity-70' : 'hover:bg-indigo-50 hover:shadow-sm'}
                    `}
                  >
                    {renderRhythmText(sentence)}{' '}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
};

export default AnalyzedTextBlockDisplay;
