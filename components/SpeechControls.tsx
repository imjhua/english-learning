import React from 'react';
import { Volume2, Square, Play, Loader2 } from 'lucide-react';

interface SpeechControlsProps {
  isPlayingAudio: boolean;
  isAudioLoading: boolean;
  isAudioPrepared: boolean;
  isDisabled: boolean;
  onPlay: () => Promise<void>;
  onResume: () => Promise<void>;
  onStop: () => void;
}

const SpeechControls: React.FC<SpeechControlsProps> = ({
  isPlayingAudio,
  isAudioLoading,
  isAudioPrepared,
  isDisabled,
  onPlay,
  onResume,
  onStop,
}) => {
  return (
    <div className="flex gap-2 items-center">
      {/* 처음부터 재생 버튼 */}
      <button
        type="button"
        aria-label="처음부터 재생"
        className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300
          ${isAudioLoading || isPlayingAudio ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-60' : 'border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50'}`}
        onClick={onPlay}
        disabled={isDisabled || isAudioLoading || isPlayingAudio || !isAudioPrepared}
        title="다시 재생"
      >
        <Volume2 size={20} />
      </button>

      {/* 정지/이어듣기 버튼 */}
      {isPlayingAudio ? (
        <button
          type="button"
          aria-label="음성 재생 중지"
          className="p-2 rounded-full hover:bg-red-100 transition-colors text-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
          onClick={onStop}
          title="재생 중지"
        >
          <Square size={20} />
        </button>
      ) : (
        <button
          type="button"
          aria-label="이어듣기"
          className="p-2 rounded-full hover:bg-indigo-100 transition-colors text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          onClick={onResume}
          title="이어듣기"
          disabled={isDisabled || isAudioLoading || !isAudioPrepared}
        >
          {isAudioLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Play size={20} />
          )}
        </button>
      )}
    </div>
  );
};

export default SpeechControls;
