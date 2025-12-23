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

const renderRhythmText = (text: string) => {
  // Remove any unwanted characters that shouldn't be in the output (like underscores within words)
  // This is a safety measure to catch AI errors
  let cleanText = text.replace(/_/g, ''); // Remove underscores completely
  
  // Split by <VERB> tags to identify verbs
  const verbRegex = /<VERB>(.*?)<\/VERB>/g;
  const parts: Array<{ text: string; isVerb: boolean }> = [];
  let lastIndex = 0;
  let match;
  
  while ((match = verbRegex.exec(cleanText)) !== null) {
    // Add text before verb
    if (match.index > lastIndex) {
      parts.push({ text: cleanText.slice(lastIndex, match.index), isVerb: false });
    }
    // Add verb
    parts.push({ text: match[1], isVerb: true });
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < cleanText.length) {
    parts.push({ text: cleanText.slice(lastIndex), isVerb: false });
  }
  
  // Render parts, splitting non-verb parts by breath markers
  return parts.map((part, pIdx) => {
    if (part.isVerb) {
      return (
        <span key={`verb-${pIdx}`} className="text-red-600 font-semibold mx-[6px]">
          {part.text}
        </span>
      );
    }
    
    // For non-verb text, split by bullet markers
    const chunks = part.text.split('•');
    return (
      <React.Fragment key={`nonverb-${pIdx}`}>
        {chunks.map((chunk, cIdx) => (
          <React.Fragment key={cIdx}>
            {chunk.split(' ').map((word, wIdx) => {
              if (!word) return null;
              const upperCount = (word.match(/[A-Z]/g) || []).length;
              const isStress = word.length > 1 && upperCount >= 2;
              return (
                <span
                  key={`${cIdx}-${wIdx}`}
                  className={`inline-block mx-[6px] ${isStress ? 'font-extrabold text-indigo-900 scale-105 origin-center' : 'text-slate-700'}`}
                >
                  {word}
                </span>
              );
            })}
            {cIdx < chunks.length - 1 && (
              <span className="text-indigo-400 font-light select-none mx-[1px]">•</span>
            )}
          </React.Fragment>
        ))}
      </React.Fragment>
    );
  });
};

const AnalyzedTextBlockDisplay: React.FC<AnalyzedTextBlockDisplayProps> = ({ blocks, isAnalzying, onSentenceClick }) => {
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
            <div className="font-bold text-lg sm:text-xl text-slate-800 mb-1 sm:mb-2">{block.title}</div>
          )}
          <div className="space-y-3 sm:space-y-6">
            {block.paragraphs.map((paragraph, pIdx) => (
              <div key={pIdx} className="text-slate-700 leading-7 sm:leading-8 text-sm sm:text-[17px]">
                {paragraph.map((sentence, sIdx) => (
                  <span
                    key={sIdx}
                    role="button"
                    tabIndex={0}
                    onClick={() => !isAnalzying && onSentenceClick(cleanSentence(sentence))}
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
