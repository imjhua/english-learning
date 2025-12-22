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
  const chunks = text.split('•');
  return chunks.map((chunk, cIdx) => (
    <React.Fragment key={cIdx}>
      {chunk.split(' ').map((word, wIdx) => {
        if (!word) return null;
        const upperCount = (word.match(/[A-Z]/g) || []).length;
        const isStress = word.length > 1 && upperCount >= 2;
        return (
          <span
            key={`${cIdx}-${wIdx}`}
            className={`inline-block mx-[4px] ${isStress ? 'font-extrabold text-indigo-900 scale-105 origin-center' : 'text-slate-700'}`}
          >
            {word}
          </span>
        );
      })}
      {cIdx < chunks.length - 1 && (
        <span className="text-indigo-400 font-light select-none">•</span>
      )}
    </React.Fragment>
  ));
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
