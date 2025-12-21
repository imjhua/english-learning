
import React, { useState } from 'react';
import { TextBlock } from '../types';
import { FileText, Loader2 } from 'lucide-react';
import OriginalTextBlockDisplay from './OriginalTextBlockDisplay';
import AnalyzedTextBlockDisplay from './AnalyzedTextBlockDisplay';
import SpeechControls from './SpeechControls';
import { useSpeechPlayer } from '../hooks/useSpeechPlayer';

interface TextDisplayProps {
  blocks: TextBlock[];
  originalText: TextBlock[];
  onSentenceClick: (sentence: string) => void;
  isAnalzying: boolean;
}

const TextDisplay: React.FC<TextDisplayProps> = ({ blocks, originalText, onSentenceClick, isAnalzying }) => {
  // 전체 텍스트 합치기 (리듬 마커 포함)
  const getAllText = () =>
    blocks.map(block =>
      block.paragraphs.map(paragraph => paragraph.join(' ')).join('\n')
    ).join('\n\n');

  // 토글 상태: true면 분석 텍스트, false면 원본 텍스트
  const [showAnalyzed, setShowAnalyzed] = useState(true);

  // 음성 재생 hook
  const speechPlayer = useSpeechPlayer(blocks.length > 0 ? getAllText() : '');
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



  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-indigo-500" />
          <span className="font-semibold text-slate-700">Text Analysis</span>
        </div>
        <div className="flex gap-2 items-center">
          {/* 텍스트 토글 버튼 */}
          <button
            type="button"
            className={`px-3 py-1 rounded-lg font-medium text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300
              ${showAnalyzed ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
            onClick={() => setShowAnalyzed(!showAnalyzed)}
            title={showAnalyzed ? '원본 텍스트 보기' : '분석 텍스트 보기'}
          >
            {showAnalyzed ? '원본보기' : '분석보기'}
          </button>
          {/* 음성 재생 컨트롤 */}
          <SpeechControls
            isPlayingAudio={speechPlayer.isPlayingAudio}
            isAudioLoading={speechPlayer.isAudioLoading}
            isAudioPrepared={speechPlayer.isAudioPrepared}
            isDisabled={blocks.length === 0}
            playbackRate={speechPlayer.playbackRate}
            onPlay={speechPlayer.playFromStart}
            onResume={speechPlayer.resumeAudio}
            onStop={speechPlayer.stopAudio}
            onSpeedChange={speechPlayer.setSpeed}
          />
        </div>
      </div>

      <div className="overflow-y-auto p-6 space-y-8 flex-1">
        {/* 토글 상태에 따라 텍스트 렌더링 */}
        {!showAnalyzed ? (
          <OriginalTextBlockDisplay blocks={originalText} />
        ) : (
          <AnalyzedTextBlockDisplay blocks={blocks} isAnalzying={isAnalzying} onSentenceClick={onSentenceClick} />
        )}
      </div>
    </div>
  );
};

export default TextDisplay;
