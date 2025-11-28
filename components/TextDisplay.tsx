
import React, { useEffect, useRef, useState } from 'react';
import { generateSpeech } from '../services/geminiService';
import { TextBlock } from '../types';
import { FileText, Loader2, Volume2, Square } from 'lucide-react';

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
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

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
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  // 전체 읽기 핸들러 (AudioContext 기반)
  const handleSpeakAll = async () => {
    if (isPlayingAudio) {
      stopAudio();
      return;
    }
    const text = getAllText();
    if (!text) return;
    setIsAudioLoading(true);
    try {
      const audioBase64 = await generateSpeech(text.replace(/•/g, ''));
      // AudioContext 준비
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      // 기존 재생 중지
      stopAudio();
      // PCM 디코드
      const audioBytes = base64ToUint8Array(audioBase64);
      const audioBuffer = pcmToAudioBuffer(audioBytes, ctx);
      // Source 노드 생성
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setIsPlayingAudio(false);
        sourceNodeRef.current = null;
      };
      source.start(0);
      sourceNodeRef.current = source;
      setIsPlayingAudio(true);
    } catch (error) {
      setIsPlayingAudio(false);
      alert('Failed to generate or play speech. Please try again.');
    } finally {
      setIsAudioLoading(false);
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
          <span className="text-xs text-slate-400 display-block">(Tap a sentence to analyze structure)</span>
        </div>
        <div>
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
              className="p-2 rounded-full hover:bg-indigo-100 transition-colors text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              onClick={handleSpeakAll}
              title="Read all text aloud"
              disabled={blocks.length === 0 || isAudioLoading}
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
