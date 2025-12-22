import { useEffect, useRef, useState } from 'react';
import { generateSpeech } from '../services/geminiService';

export const useSpeechPlayer = (text: string) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPrepared, setIsAudioPrepared] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isRepeat, setIsRepeat] = useState(true); // 기본값: 반복 켜짐
  const [isAudioError, setIsAudioError] = useState(false); // 에러 상태 추가

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

  // 오디오 중지 (재생 위치 저장)
  const stopAudio = () => {
    if (sourceNodeRef.current) {
      if (audioContextRef.current && audioBuffer && isPlayingAudio) {
        const currentTime = audioContextRef.current.currentTime;
        const elapsed = currentTime - startTimeRef.current;
        const newOffset = startOffsetRef.current + elapsed;
        startOffsetRef.current = Math.min(newOffset, audioBuffer.duration);
      }
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // 이미 중지된 경우 무시
      }
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
      source.playbackRate.value = playbackRate;
      source.connect(ctx.destination);
      source.loop = isRepeat; // 반복 설정 적용
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
    const ctx = audioContextRef.current;
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;
      source.connect(ctx.destination);
      source.loop = isRepeat; // 반복 설정 적용
      source.onended = () => {
        setIsPlayingAudio(false);
        sourceNodeRef.current = null;
      };
      startTimeRef.current = ctx.currentTime;
      // startOffsetRef.current에서 시작 (정지된 위치부터)
      const offset = Math.min(startOffsetRef.current || 0, audioBuffer.duration);
      source.start(0, offset);
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
    setIsPlayingAudio(false);
    setIsAudioError(false); // 새 텍스트 로딩 시작할 때 에러 상태 초기화
    startOffsetRef.current = 0;

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
        console.error('Speech Generation Error:', e);
        setIsAudioError(true); // 에러 발생 시 에러 상태 설정
        setIsAudioPrepared(false);
      } finally {
        setIsAudioLoading(false);
      }
    })();
  }, [text]);

  // 오디오 준비 완료 시 자동 재생
  useEffect(() => {
    if (isAudioPrepared && audioBuffer && !isPlayingAudio && audioContextRef.current) {
      playFromStart();
    }
  }, [isAudioPrepared, audioBuffer]);

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

  // 반복 설정 변경 시 현재 재생 중인 오디오에 즉시 적용
  useEffect(() => {
    if (sourceNodeRef.current && isPlayingAudio) {
      sourceNodeRef.current.loop = isRepeat;
    }
  }, [isRepeat, isPlayingAudio]);

  // 배속 조절
  const setSpeed = (rate: number) => {
    setPlaybackRate(rate);
    // 현재 재생 중이면 즉시 속도 적용
    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.value = rate;
    }
  };

  return {
    isPlayingAudio,
    isAudioLoading,
    isAudioPrepared,
    playbackRate,
    isRepeat,
    isAudioError, // 에러 상태 반환
    playFromStart,
    resumeAudio,
    stopAudio,
    setSpeed,
    setRepeat: setIsRepeat,
  };
};
