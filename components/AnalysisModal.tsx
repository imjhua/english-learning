
import React, { useEffect } from 'react';
import { SentenceAnalysisResult } from '../types';
import { X, BookOpen, GitBranch, Network, RefreshCw } from 'lucide-react';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  data: SentenceAnalysisResult | null;
  onRetry: () => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, isLoading, data, onRetry }) => {
  // 모달이 열려있을 때 배경 스크롤 잠금
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper to render sentence with bold verbs and form labels
  const renderHighlightedSentence = (sentence: string, mainVerb: string, otherVerbs: string[], form: string) => {
    if (!sentence) return sentence;

    // Remove all XML tags (<VERB>, </VERB>, <TOINF_ADJ>, etc.)
    const cleanedSentence = sentence.replace(/<\/?[A-Z_0-9]+>/g, '');

    // 원본 대소문자 그대로 사용
    const words = cleanedSentence.split(' ');

    // Prepare verb matching sets (lowercase)
    const mainVerbTokens = mainVerb ? mainVerb.toLowerCase().split(' ') : [];
    const otherVerbTokens = otherVerbs ? otherVerbs.flatMap(v => v.toLowerCase().split(' ')) : [];

    return words.map((word, idx) => {
      // Clean punctuation for checking (e.g., "stopped." -> "stopped")
      const cleanWord = word.replace(/[.,!?;:"'()]/g, '').toLowerCase();

      // Standalone "i" check fallback (e.g. "i", "i'm") -> Display "I"
      let displayWord = word;
      if (cleanWord === 'i' || word.toLowerCase().startsWith("i'") || word.toLowerCase() === "i") {
        displayWord = word.replace(/^i/i, 'I');
      }

      const isMainVerb = mainVerbTokens.includes(cleanWord);
      const isOtherVerb = otherVerbTokens.includes(cleanWord);

      let className = "text-slate-800";
      if (isMainVerb) {
        className = "font-extrabold text-red-600";
      } else if (isOtherVerb) {
        className = "font-bold text-indigo-600";
      }

      return (
        <span key={idx} className={className} title={isMainVerb ? `주동사 (${form})` : (isOtherVerb ? '다른 동사' : '')}>
          {displayWord}{' '}
        </span>
      );
    });
  };

  // Helper to parse Markdown bold syntax (**text**)
  const parseMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Helper to parse and render the structure text as a list
  const renderOverallStructure = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const overallStructureLine = lines.find(line => line.includes('[전체구조]'));

    if (!overallStructureLine) return null;

    return (
      <div className="mb-5 pb-5 border-b border-dashed border-slate-200">
        <div className="bg-indigo-50/60 rounded-lg p-3 border border-indigo-100/50">
          <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider w-fit bg-white px-2 py-1 rounded border border-indigo-100 mr-2">
            전체 구조
          </span>
          <span className="font-bold text-indigo-900 text-base leading-snug break-words">
            {overallStructureLine.replace(/\[전체구조\]\s*[:]\s*/, '')}
          </span>
        </div>
      </div>
    );
  };

  const renderStructureList = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const normalLines = lines.filter(line => !line.includes('[전체구조]'));

    return (
      <div className="space-y-4">
        {/* List of components */}
        <ul className="space-y-1.5 text-[15px] text-slate-700">
          {normalLines.map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return null;

            // Count leading spaces/indentation to determine nesting level
            const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
            const indentLevel = Math.floor(leadingSpaces / 2); // Assuming 2 spaces per level
            const isSubItem = indentLevel > 0;

            return (
              <li key={i} className={`flex items-start gap-2 ${isSubItem ? `text-sm` : ''}`} style={{ marginLeft: `${indentLevel * 0.75}rem` }}>
                {!isSubItem && (
                  <span className="text-slate-400 shrink-0 select-none font-normal mt-0.5">•</span>
                )}
                {isSubItem && (
                  <span className="text-slate-300 shrink-0 select-none font-normal mt-0.5">◦</span>
                )}
                <div className="text-slate-600">
                  {parseMarkdown(trimmed.replace(/^[*•-]\s*/, '').replace(/^\d+\.\s*/, ''))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-100 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <BookOpen size={20} className="text-indigo-600" />
            Structure Analysis
          </h3>
          <div className="flex items-center gap-1">
            {!isLoading && (
              <button
                onClick={onRetry}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                title="Re-analyze this sentence"
              >
                <RefreshCw size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-slate-500 font-medium animate-pulse">Analyzing sentence structure...</p>
            </div>
          ) : data ? (
            <>
              {/* 1. Sentence with Verbs */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center">
                <p className="text-xl leading-relaxed font-medium">
                  {renderHighlightedSentence(data.sentence, data.mainVerb, data.otherVerbs, data.form)}
                </p>
                <div className="mt-3 flex items-center justify-center gap-4 text-[10px] uppercase font-bold tracking-wide">
                  <div className="flex items-center gap-1.5 text-red-600">
                    <div className="w-2 h-2 rounded-full bg-red-600"></div>
                    Main Verb
                  </div>
                  {(data.otherVerbs && data.otherVerbs.length > 0) && (
                    <div className="flex items-center gap-1.5 text-indigo-600">
                      <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                      Other Verbs
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Combined Structure Analysis Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-700">
                    <GitBranch size={18} className="text-indigo-500" />
                    Analysis Breakdown
                  </div>
                  {/* Form Badge */}
                  <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-indigo-200">
                    {data.form}
                  </span>
                </div>
                <div className="p-5">

                  {/* Overall Structure - Separated visual block */}
                  {renderOverallStructure(data.structure)}
                  
                  {/* Tree Diagram */}
                  {data.diagram && (
                    <div className="">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-3">
                        <Network size={14} />
                        Sentence Tree
                      </div>
                      <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto shadow-inner">
                        <pre className="text-sm font-mono text-indigo-100 leading-relaxed whitespace-pre">
                          {data.diagram}
                        </pre>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 border-t border-slate-100 pt-5">
                    {renderStructureList(data.structure)}
                  </div>
                </div>
              </div>

              {/* 3. Translation */}
              <div className="bg-indigo-50/50 p-5 rounded-lg border border-indigo-100">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                  Translation
                </p>
                <p className="font-medium text-slate-800 text-lg leading-relaxed">
                  {data.translation}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center text-slate-400 py-8">
              Failed to load analysis.
            </div>
          )}
        </div>

        {/* Footer (Actions) */}
        {!isLoading && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end sticky bottom-0">
            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-medium transition-colors text-sm shadow-sm"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisModal;
