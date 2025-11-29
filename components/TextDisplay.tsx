
import React, { useEffect, useRef, useState } from 'react';
import { generateSpeech } from '../services/geminiService';
import { TextBlock } from '../types';
import { FileText, Loader2, Volume2, Square, Play } from 'lucide-react';

interface TextDisplayProps {
  blocks: TextBlock[];
  onSentenceClick: (sentence: string) => void;
  isAnalzying: boolean;
}

const TextDisplay: React.FC<TextDisplayProps> = ({ blocks, onSentenceClick, isAnalzying }) => {
  // 전체 텍스트 합치기 (리듬 마커 포함)
  const getAllText = () =>
    blocks.map(block =>
      block.paragraphs.map(paragraph => paragraph.join(' ')).join('\n')
    ).join('\n\n');

  // 재생 상태 관리
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null); // 오디오 버퍼 저장
  const [isAudioPrepared, setIsAudioPrepared] = useState(false); // 오디오 준비 완료 여부
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0); // 재생 시작 시간
  const startOffsetRef = useRef<number>(0); // 이어듣기용 오프셋
  // blocks가 분석 완료(0→1 이상)되는 시점에 오디오 미리 준비
  useEffect(() => {
    // 분석이 끝나고 텍스트가 있을 때만 준비
    if (blocks.length > 0) {
      // 오디오 준비 시작
      setIsAudioLoading(true);
      setIsAudioPrepared(false);
      (async () => {
        try {
          const text = getAllText();
          if (!text) return;
          const audioBase64 = await generateSpeech(text.replace(/•/g, ''));
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
          const audioBytes = base64ToUint8Array(audioBase64);
          const buf = pcmToAudioBuffer(audioBytes, ctx);
          setAudioBuffer(buf);
          setIsAudioPrepared(true);
        } catch (e) {
          setIsAudioPrepared(false);
        } finally {
          setIsAudioLoading(false);
        }
      })();
    } else {
      setIsAudioPrepared(false);
      setAudioBuffer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

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

  // 처음부터 재생
  const handleSpeakAll = async () => {
    if (isPlayingAudio || !audioBuffer || !audioContextRef.current) return;
    stopAudio();
    startOffsetRef.current = 0;
    const ctx = audioContextRef.current;
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
      let message = '음성 재생에 실패했습니다.';
      if (typeof window.AudioContext === 'undefined') {
        message += '\n- 이 브라우저는 오디오 재생을 지원하지 않습니다.';
      } else if (!audioBuffer) {
        message += '\n- 오디오 데이터가 준비되지 않았습니다.';
      } else if (ctx && ctx.state === 'suspended') {
        message += '\n- 시스템 또는 브라우저에서 오디오가 차단되었거나 음소거 상태일 수 있습니다.';
      } else {
        message += '\n- 알 수 없는 오류가 발생했습니다.';
      }
      message += '\n페이지를 새로고침하거나, 브라우저의 오디오 설정을 확인해 주세요.';
      alert(message);
    }
  };

  // 이어듣기 (startOffsetRef.current부터 재생)
  const handleResumeAudio = async () => {
    if (isPlayingAudio || !audioBuffer || !audioContextRef.current) return;
    stopAudio();
    const ctx = audioContextRef.current;
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
      source.start(0, startOffsetRef.current || 0);
      sourceNodeRef.current = source;
      setIsPlayingAudio(true);
    } catch (error) {
      setIsPlayingAudio(false);
      let message = '음성 재생에 실패했습니다.';
      if (typeof window.AudioContext === 'undefined') {
        message += '\n- 이 브라우저는 오디오 재생을 지원하지 않습니다.';
      } else if (!audioBuffer) {
        message += '\n- 오디오 데이터가 준비되지 않았습니다.';
      } else if (ctx && ctx.state === 'suspended') {
        message += '\n- 시스템 또는 브라우저에서 오디오가 차단되었거나 음소거 상태일 수 있습니다.';
      } else {
        message += '\n- 알 수 없는 오류가 발생했습니다.';
      }
      message += '\n페이지를 새로고침하거나, 브라우저의 오디오 설정을 확인해 주세요.';
      alert(message);
    }
  };

  // 오디오 정지 및 startOffsetRef 저장
  const stopAudio = () => {
    if (sourceNodeRef.current) {
      if (audioContextRef.current && audioBuffer && isPlayingAudio) {
        const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
        startOffsetRef.current = Math.min(
          (startOffsetRef.current || 0) + elapsed,
          audioBuffer.duration
        );
      }
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlayingAudio(false);
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
    };
  }, []);
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
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-indigo-500" />
          <span className="font-semibold text-slate-700">Rhythm & Text Analysis</span>
        </div>
        <div className="flex gap-0.5 items-center">
          {/* 처음부터 재생 버튼 */}
          <button
            type="button"
            aria-label="처음부터 재생"
            className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300
              ${isAudioLoading || isPlayingAudio ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-60' : 'border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50'}`}
            onClick={handleSpeakAll}
            disabled={blocks.length === 0 || isAudioLoading || isPlayingAudio || !isAudioPrepared}
            title="다시 재생"
          >
            <Play size={20} />
          </button>
          {/* 이어듣기(스피커) 버튼 */}
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
              aria-label="이어듣기"
              className="p-2 rounded-full hover:bg-indigo-100 transition-colors text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              onClick={handleResumeAudio}
              title="이어듣기"
              disabled={blocks.length === 0 || isAudioLoading || !isAudioPrepared}
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
