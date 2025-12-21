import { useEffect, useRef, useState } from 'react';
import { generateSpeech } from '../services/geminiService';

export const useSpeechPlayer = (text: string) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPrepared, setIsAudioPrepared] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(0);

  // base64 → Uint8Array 변환
  const base64ToUint8Array = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  // PCM(16bit, 24kHz, mono) → AudioBuffer 변환
  const pcmToAudioBuffer = (pcm: Uint8Array, ctx: AudioContext): AudioBuffer => {
    const sampleRate = 24000;
    const samples = pcm.length / 2;
    const audioBuffer = ctx.createBuffer(1, samples, sampleRate);
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      const lo = pcm[i * 2];
      const hi = pcm[i * 2 + 1];
      let val = (hi << 8) | lo;
      if (val >= 0x8000) val = val - 0x10000;
      channel[i] = val / 32768;
    }
    return audioBuffer;
  };

  // 오디오 중지
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

  // 처음부터 재생
  const playFromStart = async () => {
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

  // 이어듣기
  const resumeAudio = async () => {
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

  // 텍스트 변경 시 오디오 준비
  useEffect(() => {
    if (!text) {
      setIsAudioPrepared(false);
      setAudioBuffer(null);
      return;
    }

    setIsAudioLoading(true);
    setIsAudioPrepared(false);

    (async () => {
      try {
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
  }, [text]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    isPlayingAudio,
    isAudioLoading,
    isAudioPrepared,
    playFromStart,
    resumeAudio,
    stopAudio,
  };
};
