import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Image as ImageIcon, RotateCcw, Check, Aperture } from 'lucide-react';
import { UploadedImage } from '../types';

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  isProcessing: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ images, onImagesChange, isProcessing }) => {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Camera access failed", err);
      // Fallback to native input
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          processFiles([file]);
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="w-full space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-3">
        {/* Button 1: Gallery Upload */}
        <button
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
          <span>Scan Camera</span>
        </button>

        {/* Hidden Inputs */}
        <input
          type="file"
          ref={uploadInputRef}
          onChange={(e) => processFiles(e.target.files)}
          className="hidden"
          multiple
          accept="image/*"
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
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((img, index) => (
            <div key={img.id} className="relative flex-shrink-0 w-24 h-24 rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm group">
              <img src={img.previewUrl} alt={`Uploaded ${index}`} className="w-full h-full object-cover" />
              <button
                onClick={() => handleRemove(img.id)}
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
               <video 
                 ref={videoRef} 
                 autoPlay 
                 playsInline 
                 className="w-full h-full object-cover"
               />
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
                 className="w-20 h-20 bg-white rounded-full border-4 border-indigo-500 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
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