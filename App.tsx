
import React, { useState } from 'react';
import { UploadedImage, TextBlock, RhythmAnalysisResult, SentenceAnalysisResult, AppStatus } from './types';
import { extractAndAnalyzeRhythm, analyzeSentenceStructure } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import ReactModal from 'react-modal';
import TextDisplay from './components/TextDisplay';
import AnalysisModal from './components/AnalysisModal';
import { Sparkles, Play, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [rhythmResult, setRhythmResult] = useState<RhythmAnalysisResult | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sentenceAnalysis, setSentenceAnalysis] = useState<SentenceAnalysisResult | null>(null);
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  // 이미지 미리보기 모달 상태
  const [previewImage, setPreviewImage] = useState<UploadedImage | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  const handleReset = () => {
    setImages([]);
    setRhythmResult(null);
    setStatus(AppStatus.IDLE);
    setSentenceAnalysis(null);
    setSelectedSentence(null);
  };

  const isProcessing = status === AppStatus.EXTRACTING || status === AppStatus.ANALYZING_SENTENCE;
  
  const canStartAnalysis = images.length > 0

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Section 1: Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Input Sources</h2>
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
          
          {/* Analysis Button - Visible whenever we have images and are not processing */}
          {canStartAnalysis && (
             <div className="pt-2">
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
        </div>

        {/* Section 2: Text Display */}
        <div className="h-[600px]">
             <TextDisplay 
                blocks={rhythmResult?.fullTextBlocks || []} 
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
        onRequestClose={() => setIsPreviewOpen(false)}
        contentLabel="이미지 미리보기"
        style={{
          overlay: { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 },
          content: {
            maxWidth: 600,
            maxHeight: 800,
            margin: 'auto',
            borderRadius: 16,
            padding: 0,
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }
        }}
        ariaHideApp={false}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <button
            onClick={() => setIsPreviewOpen(false)}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              fontSize: 20,
              cursor: 'pointer',
              zIndex: 10
            }}
            aria-label="닫기"
          >
            ×
          </button>
          {previewImage && (
            <img
              src={previewImage.previewUrl}
              alt="미리보기"
              style={{
                maxWidth: '90%',
                maxHeight: '75vh',
                borderRadius: 12,
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                margin: 0,
                display: 'block',
                objectFit: 'contain',
              }}
            />
          )}
        </div>
      </ReactModal>
    </div>
  );
};

export default App;
