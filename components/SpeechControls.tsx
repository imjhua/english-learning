import React from 'react';
import { Volume2, Square, Play, Loader2, ChevronLeft, ChevronRight, Repeat2 } from 'lucide-react';

interface SpeechControlsProps {
  isPlayingAudio: boolean;
  isAudioLoading: boolean;
  isAudioPrepared: boolean;
  isDisabled: boolean;
  isAudioError: boolean; // 에러 상태 prop 추가
  playbackRate: number;
  isRepeat: boolean;
  onPlay: () => Promise<void>;
  onResume: () => Promise<void>;
  onStop: () => void;
  onSpeedChange: (rate: number) => void;
  onRepeatChange: (repeat: boolean) => void;
}

const SpeechControls: React.FC<SpeechControlsProps> = ({
  isPlayingAudio,
  isAudioLoading,
  isAudioPrepared,
  isDisabled,
  isAudioError,
  playbackRate,
  isRepeat,
  onPlay,
  onResume,
  onStop,
  onSpeedChange,
  onRepeatChange,
}) => {
  return (
    <div className="flex gap-4 items-center justify-between w-full sm:w-auto">
      {/* 스피커 제어 영역 */}
      <div className="flex gap-2 items-center">
        {/* 처음부터 재생 버튼 */}
        <button
          type="button"
          aria-label="처음부터 재생"
          className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300
            ${isDisabled || isAudioLoading || isPlayingAudio || !isAudioPrepared || isAudioError ? 'bg-slate-50 text-slate-300 cursor-not-allowed opacity-50' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}
          onClick={onPlay}
          disabled={isDisabled || isAudioLoading || isPlayingAudio || !isAudioPrepared || isAudioError}
          title={isAudioError ? '음성 로딩 실패' : '다시 재생'}
        >
          <Volume2 size={20} />
        </button>

        {/* 정지/이어듣기 버튼 */}
        {isPlayingAudio ? (
          <button
            type="button"
            aria-label="음성 재생 중지"
            className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-300
              ${isAudioError ? 'bg-slate-50 text-slate-300 cursor-not-allowed opacity-50' : 'hover:bg-red-100 text-red-500'}`}
            onClick={onStop}
            title={isAudioError ? '음성 로딩 실패' : '재생 중지'}
            disabled={isAudioError}
          >
            <Square size={20} />
          </button>
        ) : (
          <button
            type="button"
            aria-label="이어듣기"
            className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300
              ${isDisabled || isAudioLoading || !isAudioPrepared || isAudioError ? 'bg-slate-50 text-slate-300 cursor-not-allowed opacity-50' : 'hover:bg-indigo-100 text-indigo-500'}`}
            onClick={onResume}
            title={isAudioError ? '음성 로딩 실패' : '이어듣기'}
            disabled={isDisabled || isAudioLoading || !isAudioPrepared || isAudioError}
          >
            {isAudioLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Play size={20} />
            )}
          </button>
        )}

        {/* 반복 버튼 */}
        <button
          type="button"
          aria-label="반복 재생"
          className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 ${
            isAudioError
              ? 'bg-slate-50 text-slate-300 cursor-not-allowed opacity-50'
              : isRepeat
              ? 'bg-indigo-100 text-indigo-600 focus:ring-indigo-300'
              : 'text-slate-400 hover:text-slate-600 focus:ring-slate-300'
          }`}
          onClick={() => onRepeatChange(!isRepeat)}
          disabled={isDisabled || !isAudioPrepared || isAudioError}
          title={isAudioError ? '음성 로딩 실패' : isRepeat ? '반복 끄기' : '반복 켜기'}
        >
          <Repeat2 size={20} />
        </button>
      </div>

      {/* 배속 조절 영역 */}
      <div className={`flex gap-1 items-center rounded-lg px-2 py-1 transition-colors ${
        isAudioError
          ? 'border border-slate-200 bg-slate-50 opacity-50'
          : 'border border-indigo-200'
      }`}>
        <button
          type="button"
          aria-label="배속 감소"
          className={`p-1 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-300
            ${isAudioError ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-indigo-100 text-indigo-500'}`}
          onClick={() => onSpeedChange(Math.max(0.5, playbackRate - 0.1))}
          disabled={isDisabled || isAudioLoading || !isAudioPrepared || playbackRate <= 0.5 || isAudioError}
          title={isAudioError ? '음성 로딩 실패' : '배속 감소'}
        >
          <ChevronLeft size={16} />
        </button>

        {/* 현재 배속 표시 */}
        <span className={`text-xs font-semibold w-8 text-center ${
          isAudioError ? 'text-slate-400' : 'text-indigo-600'
        }`}>
          {playbackRate.toFixed(1)}
        </span>

        <button
          type="button"
          aria-label="배속 증가"
          className={`p-1 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-300
            ${isAudioError ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-indigo-100 text-indigo-500'}`}
          onClick={() => onSpeedChange(Math.min(1.5, playbackRate + 0.1))}
          disabled={isDisabled || isAudioLoading || !isAudioPrepared || playbackRate >= 1.5 || isAudioError}
          title={isAudioError ? '음성 로딩 실패' : '배속 증가'}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default SpeechControls;
