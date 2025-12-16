import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Image as ImageIcon, RotateCcw, Check, Aperture } from 'lucide-react';
import { UploadedImage } from '../types';

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  isProcessing: boolean;
  onImageClick?: (img: UploadedImage) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ images, onImagesChange, isProcessing, onImageClick }) => {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const processFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    
    // Create promises for reading all files
    const fileReadingPromises = Array.from(files).map((file) => {
      return new Promise<UploadedImage>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          // Extract base64 part
          const base64 = result.split(',')[1];
          const mimeType = result.split(';')[0].split(':')[1];
          
          resolve({
            id: crypto.randomUUID(),
            file,
            previewUrl: result,
            base64,
            mimeType
          });
        };
        reader.readAsDataURL(file);
      });
    });

    try {
      // Wait for all files to be read
      const newImages = await Promise.all(fileReadingPromises);
      
      // Update state once with all new images appended to existing ones
      onImagesChange([...images, ...newImages]);
    } catch (error) {
      console.error("Error reading files", error);
    }

    // Reset input values to allow selecting the same files again if deleted
    if (uploadInputRef.current) uploadInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleRemove = (id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
  };

  // --- Camera Logic ---

  const startCamera = async () => {
    try {
      // 최대 해상도(최대 4K)로 요청
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 3840 }, // 4K
          height: { ideal: 2160 }
        }
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Camera access failed", err);
      setIsCameraOpen(false);
      // Fallback to native input
      setTimeout(() => cameraInputRef.current?.click(), 100);
    }
  };
  // videoRef가 렌더링된 후에만 srcObject 할당
  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    // 비디오가 준비되지 않았거나 크기가 0이면 캡처하지 않음
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // drawImage 품질 향상 옵션 (브라우저 지원 시)
      if ('imageSmoothingQuality' in ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // JPEG 품질 0.98로 최대한 원본 보존
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          processFiles([file]);
        }
        stopCamera(); // blob 처리 후 카메라 종료
      }, 'image/jpeg', 0.98);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // 비디오 메타데이터 로드 시점에 캡처 버튼 활성화
  const handleVideoLoaded = () => {
    setIsVideoReady(true);
  };

  // 카메라 모달이 닫힐 때 비디오 준비 상태 초기화
  useEffect(() => {
    if (!isCameraOpen) setIsVideoReady(false);
  }, [isCameraOpen]);

  return (
    <div className="w-full space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-3">
        {/* Button 1: Gallery Upload */}
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-indigo-100 hover:border-indigo-200 text-indigo-700 py-3 px-4 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          <ImageIcon size={20} />
          <span>Upload</span>
        </button>

        {/* Button 2: Camera Scan */}
        <button
          onClick={startCamera}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          <Camera size={20} />
          <span>Camera</span>
        </button>

        {/* Hidden Inputs */}
        <input
          type="file"
          ref={uploadInputRef}
          onChange={(e) => processFiles(e.target.files)}
          className="hidden"
          multiple
          accept="image/jpeg, image/png, image/webp, image/heic, image/heif"
        />
        {/* Fallback input for camera */}
        <input
          type="file"
          ref={cameraInputRef}
          onChange={(e) => processFiles(e.target.files)}
          className="hidden"
          accept="image/*"
          capture="environment"
        />
      </div>

      {/* Preview Area */}
      {images.length > 0 && (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="relative flex-shrink-0 w-24 h-24 rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm group cursor-pointer"
              onClick={() => {
                if (typeof onImageClick === 'function') onImageClick(img);
              }}
            >
              <img src={img.previewUrl} alt={`Uploaded ${index}`} className="w-full h-full object-cover" />
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleRemove(img.id);
                }}
                disabled={isProcessing}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
              >
                <X size={14} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[10px] px-1 py-0.5 text-center truncate">
                Image {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Camera Modal Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <div className="relative w-full h-full flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-end z-10">
              <button 
                onClick={stopCamera} 
                className="p-2 bg-black/40 text-white rounded-full backdrop-blur-md"
              >
                <X size={24} />
              </button>
            </div>

            {/* Video Feed */}
            <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
               {streamRef.current ? (
                 <video 
                   ref={videoRef} 
                   autoPlay 
                   playsInline 
                   onLoadedMetadata={handleVideoLoaded}
                   className="w-full h-full object-cover"
                 />
               ) : (
                 <div className="text-white text-center">카메라 스트림을 불러올 수 없습니다.<br/>권한을 허용했는지 확인하세요.</div>
               )}
               {/* Viewfinder Guide */}
               <div className="absolute inset-0 border-2 border-white/30 m-8 rounded-lg pointer-events-none">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>
               </div>
            </div>

            {/* Footer / Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center pb-12">
               <button 
                 onClick={capturePhoto}
                 disabled={!isVideoReady}
                 className="w-20 h-20 bg-white rounded-full border-4 border-indigo-500 shadow-lg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
               >
                  <div className="w-16 h-16 bg-white rounded-full border-2 border-black/10"></div>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;