import React from 'react';
import { Music4 } from 'lucide-react';

interface RhythmDisplayProps {
  rhythmText: string;
}

const RhythmDisplay: React.FC<RhythmDisplayProps> = ({ rhythmText }) => {
  if (!rhythmText) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <Music4 size={40} className="mb-2 opacity-50" />
        <p>Rhythm analysis will appear here.</p>
      </div>
    );
  }

  // Formatting logic:
  // We want to highlight CAPS (stress) and make the separator distinct.
  // We split by '•' to handle chunks, then split by space to handle words.
  
  const chunks = rhythmText.split('•');

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl shadow-lg border border-indigo-800 text-white overflow-hidden flex flex-col h-full">
      <div className="bg-black/20 px-4 py-3 border-b border-white/10 flex items-center justify-between backdrop-blur-sm">
        <h3 className="font-semibold text-indigo-100 flex items-center gap-2">
          <Music4 size={18} className="text-indigo-400" />
          Rhythm & Stress
        </h3>
        <span className="text-xs text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
          CAPS = STRESS
        </span>
      </div>

      <div className="p-6 overflow-y-auto flex-1 font-medium leading-loose text-lg md:text-xl tracking-wide">
        <div className="flex flex-wrap gap-x-1 gap-y-3">
          {chunks.map((chunk, cIdx) => (
            <span key={cIdx} className="inline-block">
                {/* Render chunk with potential space handling */}
                {chunk.split(' ').map((word, wIdx) => {
                    const isStress = word === word.toUpperCase() && /[A-Z]/.test(word);
                    return (
                        <span key={wIdx} className={`${isStress ? "text-white font-bold text-shadow-sm scale-105" : "text-indigo-200 font-normal"}`}>
                            {word}
                        </span>
                    )
                })}
                {/* Add separator unless it's the last chunk */}
                {cIdx < chunks.length - 1 && (
                    <span className="text-indigo-500 mx-2 font-light opacity-60">•</span>
                )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RhythmDisplay;
