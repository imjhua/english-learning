
import React, { useState, useRef } from 'react';
import { UploadedImage, TextBlock, RhythmAnalysisResult, SentenceAnalysisResult, AppStatus } from './types';
import { extractAndAnalyzeRhythm, analyzeSentenceStructure } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
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

  const textDisplayRef = useRef<any>(null);
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

      // 오디오 버퍼 준비가 끝날 때까지 기다림
      await new Promise<void>((resolve) => {
        // blocks prop이 갱신된 후 prepareAudio를 명시적으로 호출
        setTimeout(async () => {
          if (textDisplayRef.current && textDisplayRef.current.prepareAudio) {
            await textDisplayRef.current.prepareAudio();
          }
          resolve();
        }, 0);
      });

      setStatus(AppStatus.READY);
    } catch (error) {
      console.error(error);
      setStatus(AppStatus.ERROR);
      alert('Failed to process images. Please try again.');
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
          />
          
          {/* Analysis Button - 오디오 준비가 끝난 뒤에만 노출 */}
          {canStartAnalysis && (
             <div className="pt-2">
                <button
                    onClick={handleStartProcessing}
                    disabled={isProcessing}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                >
                  <>
                      <Play size={20} fill="currentColor" />
                      {(status === AppStatus.IDLE || status === AppStatus.READY) ? "Start Analysis" : "Restart Analysis"}
                  </>
                </button>
             </div>
          )}
        </div>

        {/* Section 2: Text Display */}
          <div className="h-[600px]">
             <TextDisplay 
               ref={textDisplayRef}
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
    </div>
  );
};

export default App;
