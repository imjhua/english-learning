
import React from 'react';
import { TextBlock } from '../types';
import { FileText, Loader2 } from 'lucide-react';

interface TextDisplayProps {
  blocks: TextBlock[];
  onSentenceClick: (sentence: string) => void;
  isAnalzying: boolean;
}

const TextDisplay: React.FC<TextDisplayProps> = ({ blocks, onSentenceClick, isAnalzying }) => {
  
  // 1. Loading State (Initial Extraction)
  // If there are no blocks yet but we are analyzing, show the loading spinner.
  if (blocks.length === 0 && isAnalzying) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
         <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <FileText size={18} className="text-indigo-500" />
              Rhythm & Text Analysis
            </h3>
        </div>
        <div className="h-full flex flex-col items-center justify-center text-indigo-600 p-8">
            <Loader2 size={40} className="mb-4 animate-spin text-indigo-500" />
            <p className="font-semibold text-lg animate-pulse">Extracting Text & Rhythm...</p>
            <p className="text-sm text-indigo-400 mt-2">This uses AI and may take a moment.</p>
        </div>
      </div>
    );
  }

  // 2. Empty State (Idle)
  if (blocks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
        <FileText size={40} className="mb-2 opacity-50" />
        <p>No text extracted yet.</p>
        <p className="text-sm">Upload an image to start.</p>
      </div>
    );
  }

  // Helper to remove rhythm markers for analysis
  const cleanSentence = (text: string) => {
    return text.replace(/•/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  };

  // Helper to render styled rhythm text
  const renderRhythmText = (text: string) => {
    const chunks = text.split('•');
    return chunks.map((chunk, cIdx) => (
      <React.Fragment key={cIdx}>
        {chunk.split(' ').map((word, wIdx) => {
          if (!word) return null;
          // Check for ALL CAPS (Stress) - strict check to avoid 'I' or numbers triggering
          const isStress = word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word);
          
          return (
            <span 
              key={`${cIdx}-${wIdx}`} 
              className={`inline-block mx-[4px] ${isStress ? 'font-extrabold text-indigo-900 scale-105 origin-center' : 'text-slate-700'}`}
            >
              {word}
            </span>
          );
        })}
        {/* Render Separator */}
        {cIdx < chunks.length - 1 && (
          <span className="text-indigo-400 font-light select-none">•</span>
        )}
      </React.Fragment>
    ));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <FileText size={18} className="text-indigo-500" />
          Rhythm & Text Analysis
        </h3>
        <span className="text-xs text-slate-400">Tap a sentence to analyze structure</span>
      </div>
      
      <div className="overflow-y-auto p-6 space-y-8 flex-1">
        {blocks.map((block, bIdx) => (
          <div key={bIdx} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold">
                {block.source || `Image ${bIdx + 1}`}
              </span>
            </div>
            
            <div className="space-y-6">
              {/* Loop through visual paragraphs */}
              {block.paragraphs.map((paragraph, pIdx) => (
                <div key={pIdx} className="text-slate-700 leading-9 text-[17px]">
                  {/* Loop through sentences in the paragraph */}
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
                      {renderRhythmText(sentence)}
                      {/* Add a trailing space to separate sentences visually when they wrap */}
                      {' '}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TextDisplay;
