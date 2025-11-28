
import React, { useEffect, useRef, useState, useImperativeHandle } from 'react';
import { generateSpeech } from '../services/geminiService';
import { TextBlock } from '../types';
import { FileText, Loader2, Volume2, Square } from 'lucide-react';


export interface TextDisplayProps {
  blocks: TextBlock[];
  onSentenceClick: (sentence: string) => void;
  isAnalzying: boolean;
  onAudioPrepared?: (success: boolean) => void; // 오디오 준비 완료 콜백 (성공 여부)
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

const TextDisplay = React.forwardRef<any, TextDisplayProps>(({ blocks, onSentenceClick, isAnalzying, onAudioPrepared }, ref) => {
  // 전체 텍스트 합치기 (리듬 마커 포함)
  const getAllText = (targetBlocks: TextBlock[] = blocks) =>
    targetBlocks.map(block =>
      block.paragraphs.map(paragraph => paragraph.join(' ')).join('\n')
    ).join('\n\n');

  // 재생 상태 관리
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioReady, setAudioReady] = useState<boolean | null>(null); // null: 준비안됨, true: 준비완료, false: 실패
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null); // 전체 오디오 버퍼 저장
  const startOffsetRef = useRef<number>(0); // 정지 시점(초)
  const startTimeRef = useRef<number>(0); // 재생 시작 시점(오디오 컨텍스트 기준)

  // base64 → Uint8Array 변환
  function base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // PCM(16bit, 24kHz, mono) → AudioBuffer 변환
  function pcmToAudioBuffer(pcm: Uint8Array, ctx: AudioContext): AudioBuffer {
    // 16bit signed PCM, 24000Hz, mono
    const sampleRate = 24000;
    const samples = pcm.length / 2;
    const audioBuffer = ctx.createBuffer(1, samples, sampleRate);
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      // Little endian
      const lo = pcm[i * 2];
      const hi = pcm[i * 2 + 1];
      let val = (hi << 8) | lo;
      if (val >= 0x8000) val = val - 0x10000;
      channel[i] = val / 32768;
    }
    return audioBuffer;
  }

  // 오디오 정지
  const stopAudio = () => {
    if (sourceNodeRef.current) {
      // 현재 재생 위치 계산
      if (audioContextRef.current && audioBufferRef.current && isPlayingAudio) {
        const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
        // 남은 길이보다 길면 끝으로
        startOffsetRef.current = Math.min(
          (startOffsetRef.current || 0) + elapsed,
          audioBufferRef.current.duration
        );
      }
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  // 오디오 버퍼 미리 준비
  // 오디오 버퍼 미리 준비 (외부에서 강제 호출도 가능)
  const prepareAudio = async (targetBlocks: TextBlock[] = blocks) => {
    if (!targetBlocks || targetBlocks.length === 0) return;
    const text = getAllText(targetBlocks);
    // blocks와 text 값 모두 출력
    console.log('[TextDisplay] prepareAudio: blocks', targetBlocks);
    console.log('[TextDisplay] prepareAudio: getAllText()', text);
    if (!text) {
      audioBufferRef.current = null;
      setAudioReady(false);
      console.log('[TextDisplay] prepareAudio: 텍스트 없음, 오디오 준비 실패');
      onAudioPrepared?.(false);
      return;
    }
    setIsAudioLoading(true);
    setAudioReady(null);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      // 이미 준비된 버퍼가 있고 텍스트가 동일하면 재사용
      const prevBuffer = audioBufferRef.current;
      const prevText = (audioBufferRef.current as any)?.__srcText;
      if (prevBuffer && prevText === text) {
        setAudioReady(true);
        console.log('[TextDisplay] prepareAudio: 이미 준비된 오디오 버퍼 재사용');
        onAudioPrepared?.(true);
        return;
      }
      const audioBase64 = await generateSpeech(text.replace(/•/g, ''));
      const audioBytes = base64ToUint8Array(audioBase64);
      const audioBuffer = pcmToAudioBuffer(audioBytes, ctx);
      (audioBuffer as any).__srcText = text;
      audioBufferRef.current = audioBuffer;
      setAudioReady(true);
      console.log('[TextDisplay] prepareAudio: 오디오 준비 완료', { textLength: text.length, audioBuffer });
      onAudioPrepared?.(true);
    } catch (e) {
      audioBufferRef.current = null;
      setAudioReady(false);
      console.error('[TextDisplay] prepareAudio: 오디오 준비 실패', e);
      onAudioPrepared?.(false);
    } finally {
      setIsAudioLoading(false);
    }
  };

  // 분석이 끝난 후에만 prepareAudio를 호출
  // 분석중이 아닐 때만 오디오 준비. 분석중이면 절대 prepareAudio 호출 안함
  useEffect(() => {
    if (blocks.length === 0) {
      setAudioReady(null);
      setIsAudioLoading(false);
      audioBufferRef.current = null;
      return;
    }
    if (!isAnalzying && blocks.length > 0) {
      prepareAudio(blocks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnalzying, JSON.stringify(blocks)]);

  // 외부에서 강제 호출 가능하도록 ref 노출
  // ref로 강제 호출 시에도 blocks가 빈 배열이면 prepareAudio가 실행되지 않도록 래핑
  useImperativeHandle(ref, () => ({
    prepareAudio: (targetBlocks?: TextBlock[]) => {
      const useBlocks = targetBlocks ?? blocks;
      if (!useBlocks || useBlocks.length === 0) return;
      prepareAudio(useBlocks);
    }
  }));

  // 전체 읽기 핸들러 (AudioContext 기반)
  const handleSpeakAll = async () => {
    if (isPlayingAudio) {
      stopAudio();
      return;
    }
    const ctx = audioContextRef.current;
    const audioBuffer = audioBufferRef.current;
    if (!ctx || !audioBuffer) return;
    stopAudio();
    startOffsetRef.current = 0;
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setIsPlayingAudio(false);
        sourceNodeRef.current = null;
      };
      startTimeRef.current = ctx.currentTime;
      source.start(0, 0);
      sourceNodeRef.current = source;
      setIsPlayingAudio(true);
    } catch (error) {
      setIsPlayingAudio(false);
      alert('Failed to play speech. Please try again.');
    }
  };

  // 오디오 정지 핸들러 (버튼)
  const handleStop = () => {
    stopAudio();
  };

  // AudioContext 해제
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      audioBufferRef.current = null;
      startOffsetRef.current = 0;
    };
  }, []);

  // 1. 분석 중이면 blocks가 비어있어도 무조건 로딩 UI
  if (isAnalzying) {
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

  // 2. Idle(Empty) UI: blocks가 비어있고 분석 중이 아닐 때만
  if (blocks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
        <FileText size={40} className="mb-2 opacity-50" />
        <p>No text extracted yet.</p>
        <p className="text-sm">Upload an image to start.</p>
      </div>
    );
  }

  // 3. 문장 분석 완료 & 오디오 준비 실패: 분석 결과 + 버튼 비활성화
  if (audioReady === false) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-indigo-500" />
            <span className="font-semibold text-slate-700">Rhythm & Text Analysis</span>
            <span className="text-xs text-slate-400 display-block">(Tap a sentence to analyze structure)</span>
          </div>
          <div className="flex items-center gap-2">
            {/* 처음부터 재생 버튼 (비활성) */}
            <button
              disabled
              type="button"
              className="p-2 text-xs rounded border border-indigo-200 min-w-[90px] bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-60"
            >
              처음부터 재생
            </button>
            {/* 스피커 버튼 (비활성) */}
            <button
              type="button"
              aria-label="Read all text aloud"
              className="p-2 rounded-full text-slate-300 bg-slate-50 cursor-not-allowed"
              disabled
              title="오디오 준비 실패"
            >
              <Volume2 size={20} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-6 space-y-8 flex-1">
          {blocks.map((block, bIdx) => (
            <div key={bIdx} className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold">
                  {block.source || `Image ${bIdx + 1}`}
                </span>
              </div>
              <div className="mb-2">
                {block.paragraphs.map((paragraph, pIdx) => (
                  <div key={pIdx} className="text-slate-700 leading-9 text-[17px]">
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
                          ${isAnalzying ? 'cursor-wait opacity-70' : 'focus:bg-indigo-50 hover:bg-indigo-50 hover:shadow-sm'}
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
        </div>
      </div>
    );
  }



  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-indigo-500" />
          <span className="font-semibold text-slate-700">Rhythm & Text Analysis</span>
          <span className="text-xs text-slate-400 display-block">(Tap a sentence to analyze structure)</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 처음부터 재생 버튼 */}
          <button
            disabled={isPlayingAudio || isAudioLoading || audioReady === false}
            type="button"
            className={`p-2 text-xs rounded border border-indigo-200 transition-colors min-w-[90px]
              ${isPlayingAudio || isAudioLoading || audioReady === false
                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-60'
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}
            `}
            onClick={async (e) => {
              e.stopPropagation();
              startOffsetRef.current = 0;
              await handleSpeakAll();
            }}
          >
            처음부터 재생
          </button>
          {isPlayingAudio ? (
            <button
              type="button"
              aria-label="Stop reading"
              className="p-2 rounded-full hover:bg-red-100 transition-colors text-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
              onClick={handleStop}
              title="Stop reading"
            >
              <Square size={20} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Read all text aloud"
              className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300
                ${audioReady === false ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-indigo-500 hover:bg-indigo-100'}`}
              onClick={handleSpeakAll}
              title="Read all text aloud"
              disabled={blocks.length === 0 || isAudioLoading || audioReady === false}
            >
              {isAudioLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Volume2 size={20} />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto p-6 space-y-8 flex-1">
        {blocks.map((block, bIdx) => (
          <div key={bIdx} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold">
                {block.source || `Image ${bIdx + 1}`}
              </span>
            </div>

            <div className="mb-2">
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
                        ${isAnalzying ? 'cursor-wait opacity-70' : 'focus:bg-indigo-50 hover:bg-indigo-50 hover:shadow-sm'}
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
});

export default TextDisplay;
