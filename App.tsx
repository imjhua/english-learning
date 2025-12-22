
import React, { useState, useRef, useEffect } from 'react';
import { UploadedImage, TextBlock, RhythmAnalysisResult, SentenceAnalysisResult, AppStatus } from './types';
import { extractAndAnalyzeRhythm, analyzeSentenceStructure, analyzeTextForRhythm } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import TextInput from './components/TextInput';
import ReactModal from 'react-modal';
import TextDisplay, { TextDisplayHandle } from './components/TextDisplay';
import AnalysisModal from './components/AnalysisModal';
import { Sparkles, Play, RotateCcw, X, RotateCw } from 'lucide-react';

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [rhythmResult, setRhythmResult] = useState<RhythmAnalysisResult | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const textDisplayRef = useRef<TextDisplayHandle>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sentenceAnalysis, setSentenceAnalysis] = useState<SentenceAnalysisResult | null>(null);
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  // 이미지 미리보기 모달 상태
  const [previewImage, setPreviewImage] = useState<UploadedImage | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [imageRotation, setImageRotation] = useState(0);

  const handleStartProcessing = async () => {
    if (images.length === 0) return;

    setStatus(AppStatus.EXTRACTING);
    setRhythmResult(null);

    try {
      // Prepare images for API (base64 and mimeType)
      const imagePayload = images.map(img => ({
        base64: img.base64,
        mimeType: img.mimeType
      }));

      const result = await extractAndAnalyzeRhythm(imagePayload);
      setRhythmResult(result);
      setStatus(AppStatus.READY);
    } catch (error) {
      console.error(error);
      setStatus(AppStatus.ERROR);
      let message = '이미지 분석에 실패했습니다.';
      if (!navigator.onLine) {
        message += '\n- 인터넷 연결이 불안정하거나 끊어졌습니다.';
      } else if (images.length === 0) {
        message += '\n- 업로드된 이미지가 없습니다.';
      } else if (error instanceof SyntaxError) {
        message += '\n- 서버에서 잘못된 데이터를 반환했습니다.';
      } else if (error instanceof TypeError) {
        message += '\n- 이미지 파일이 손상되었거나, 서버와의 통신에 문제가 있습니다.';
      } else {
        message += '\n- 알 수 없는 오류가 발생했습니다.';
      }
      message += '\n페이지를 새로고침하거나, 이미지를 다시 업로드해 주세요.';
      alert(message);
    }
  };

  const handleSentenceClick = async (sentence: string) => {
    setSelectedSentence(sentence);
    setIsModalOpen(true);
    setSentenceAnalysis(null);
    setStatus(AppStatus.ANALYZING_SENTENCE);

    try {
      const result = await analyzeSentenceStructure(sentence);
      setSentenceAnalysis(result);
    } catch (error) {
      console.error(error);
      // Keep modal open but show error state (handled inside component via null data)
    } finally {
      setStatus(AppStatus.READY); // Return to ready state
    }
  };

  const handleTextSubmit = async (text: string) => {
    setStatus(AppStatus.EXTRACTING);
    setRhythmResult(null);

    try {
      const result = await analyzeTextForRhythm(text);
      setRhythmResult(result);
      setStatus(AppStatus.READY);
    } catch (error) {
      console.error(error);
      setStatus(AppStatus.ERROR);
      let message = '텍스트 분석에 실패했습니다.\n';
      if (error instanceof SyntaxError) {
        message += '서버에서 잘못된 데이터를 반환했습니다.';
      } else if (error instanceof TypeError) {
        message += '서버와의 통신에 문제가 있습니다.';
      } else if (error instanceof Error) {
        message += error.message;
      } else {
        message += '알 수 없는 오류가 발생했습니다.';
      }
      message += '\n다시 시도해주세요.';
      alert(message);
    }
  };

  const handleReset = () => {
    setImages([]);
    setRhythmResult(null);
    setStatus(AppStatus.IDLE);
    setSentenceAnalysis(null);
    setSelectedSentence(null);
    setInputText('');
    // 음성 재생 멈추기
    textDisplayRef.current?.stopAudio();
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setImageRotation(0);
  };

  const isProcessing = status === AppStatus.EXTRACTING || status === AppStatus.ANALYZING_SENTENCE;

  const canStartAnalysis = images.length > 0

  // 원본 텍스트 추출 (이미지에서 추출된 텍스트)
  const originalText = rhythmResult?.originalText || [];

  // 분석 영역 ref
  const analysisRef = useRef<HTMLDivElement>(null);

  // 분석 완료 시 분석 영역으로 스크롤
  useEffect(() => {
    if (status === AppStatus.READY && analysisRef.current) {
      analysisRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between lg:max-w-4xl lg:mx-auto">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Sparkles size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">SpeakFlow AI</h1>
          </div>

          {(images.length > 0 || status !== AppStatus.IDLE) && (
            <button
              onClick={handleReset}
              disabled={isProcessing}
              className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 font-medium text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-50"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6 lg:max-w-4xl lg:mx-auto">

        {/* Section 1: Upload */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-3 sm:p-5 space-y-4 w-full">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Input Sources</h2>
          
          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'upload'
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              Upload & Camera
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'text'
                  ? 'text-emerald-600 border-emerald-600'
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              Text Input
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {activeTab === 'upload' && (
              <>
                <ImageUploader
                  images={images}
                  onImagesChange={(newImages) => {
                    setImages(newImages);
                    // If images become empty, reset status
                    if (newImages.length === 0) {
                      setRhythmResult(null);
                      setStatus(AppStatus.IDLE);
                    }
                  }}
                  isProcessing={isProcessing}
                  onImageClick={(img) => {
                    setPreviewImage(img);
                    setIsPreviewOpen(true);
                  }}
                />

                {/* Analysis Button - Visible only in upload tab */}
                {canStartAnalysis && (
                  <div>
                    <button
                      onClick={handleStartProcessing}
                      disabled={isProcessing}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                    >
                      <>
                        <Play size={20} fill="currentColor" />
                        {rhythmResult ? "Restart Analysis" : "Start Analysis"}
                      </>
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'text' && (
              <TextInput
                onTextSubmit={handleTextSubmit}
                isProcessing={isProcessing}
                inputText={inputText}
                onInputChange={setInputText}
                isTabActive={activeTab === 'text'}
              />
            )}
          </div>
        </div>

        {/* Section 2: Text Display */}
        <div className="h-full w-full" ref={analysisRef}>
          <TextDisplay
            ref={textDisplayRef}
            blocks={rhythmResult?.fullTextBlocks || []}
            originalText={originalText}
            onSentenceClick={handleSentenceClick}
            isAnalzying={isProcessing}
          />
        </div>

      </main>

      {/* Modal */}
      <AnalysisModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isLoading={status === AppStatus.ANALYZING_SENTENCE}
        data={sentenceAnalysis}
        onRetry={() => {
          if (selectedSentence) {
            handleSentenceClick(selectedSentence);
          }
        }}
      />
      {/* 이미지 미리보기 모달 */}
      <ReactModal
        isOpen={isPreviewOpen && !!previewImage}
        onRequestClose={handleClosePreview}
        contentLabel="이미지 미리보기"
        style={{
          overlay: { backgroundColor: '#000000', zIndex: 1000 },
          content: {
            border: 'none',
            borderRadius: 0,
            padding: 0,
            background: 'transparent',
            inset: '0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }
        }}
        ariaHideApp={false}
      >
        {previewImage && (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {/* 닫기 버튼 - 우측 상단 */}
            <button
              onClick={handleClosePreview}
              className="absolute top-8 right-8 p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white z-10"
              title="닫기"
            >
              <X size={24} />
            </button>

            {/* 이미지 */}
            <img
              src={previewImage.previewUrl}
              alt={previewImage.name}
              style={{
                transform: `rotate(${imageRotation}deg)`,
                transition: 'transform 0.2s ease-out',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />

            {/* 회전 컨트롤 - 아래쪽 가운데 */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
              <button
                onClick={() => setImageRotation((prev) => (prev + 270) % 360)}
                className="p-2.5 hover:bg-white/20 rounded-full transition-colors text-white"
                title="반시계방향 회전"
              >
                <RotateCcw size={24} />
              </button>
              <button
                onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
                className="p-2.5 hover:bg-white/20 rounded-full transition-colors text-white"
                title="시계방향 회전"
              >
                <RotateCw size={24} />
              </button>
            </div>
          </div>
        )}
      </ReactModal>
    </div>
  );
};

export default App;
