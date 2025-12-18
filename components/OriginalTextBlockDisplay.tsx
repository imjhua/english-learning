import React from 'react';
import { TextBlock } from '../types';

interface OriginalTextBlockDisplayProps {
  blocks: TextBlock[];
}

const OriginalTextBlockDisplay: React.FC<OriginalTextBlockDisplayProps> = ({ blocks }) => {
  if (!Array.isArray(blocks) || blocks.length === 0 || !blocks.some(b => Array.isArray(b.paragraphs) && b.paragraphs.length > 0 && b.paragraphs.some(p => Array.isArray(p) && p.length > 0 && p.some(s => s && s.trim() !== '')))) {
    return <div className="text-slate-400">원본 텍스트가 없습니다.</div>;
  }
  return (
    <>
      {blocks.map((block, bIdx) => (
        (Array.isArray(block.paragraphs) && block.paragraphs.length > 0 && block.paragraphs.some(p => Array.isArray(p) && p.length > 0 && p.some(s => s && s.trim() !== '')))
          ? (
            <div key={bIdx} className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold">
                  {block.source || `Image ${bIdx + 1}`}
                </span>
              </div>
              {block.title && block.title.trim() !== '' && (
                <div className="font-bold text-xl text-slate-800 mb-2">{block.title}</div>
              )}
              <div className="space-y-6">
                {block.paragraphs.map((paragraph, pIdx) => (
                  (Array.isArray(paragraph) && paragraph.length > 0 && paragraph.some(s => s && s.trim() !== '')) ? (
                    <div key={pIdx} className="whitespace-pre-line text-slate-700 leading-8 text-[17px]">
                      {paragraph.map((sentence, sIdx) => (
                        sentence && sentence.trim() !== '' ? <span key={sIdx}>{sentence}{' '}</span> : null
                      ))}
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          ) : null
      ))}
    </>
  );
};

export default OriginalTextBlockDisplay;
