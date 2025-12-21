import React, { useState, useRef, useEffect } from 'react';
import { Type, X } from 'lucide-react';

interface TextInputProps {
  onTextSubmit: (text: string) => void;
  isProcessing: boolean;
  inputText: string;
  onInputChange: (text: string) => void;
  isTabActive: boolean;
}

const TextInput: React.FC<TextInputProps> = ({
  onTextSubmit,
  isProcessing,
  inputText,
  onInputChange,
  isTabActive,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Text Input 탭이 활성화되면 자동으로 expanded
  useEffect(() => {
    if (isTabActive && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isTabActive]);

  // expanded 상태가 되면 textarea에 포커싱
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isExpanded]);

  const handleSubmit = () => {
    if (inputText.trim()) {
      onTextSubmit(inputText.trim());
      // 분석 후에도 입력창은 계속 보이도록 유지 (setIsExpanded(false) 제거)
    }
  };

  const handleClear = () => {
    onInputChange('');
    textareaRef.current?.focus();
  };

  return (
    <div className="w-full space-y-3">
      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 bg-white border-2 border-emerald-100 hover:border-emerald-200 text-emerald-700 py-3 px-4 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          <Type size={20} />
          <span>Direct Text Input</span>
        </button>
      ) : (
        <div className="bg-white border-2 border-emerald-200 rounded-xl p-4 space-y-3 shadow-sm">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Enter English text or sentences here..."
            disabled={isProcessing}
            className="w-full h-32 p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
          />
          
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={isProcessing || !inputText.trim()}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Analyzing...' : 'Submit Text'}
            </button>
            <button
              onClick={handleClear}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextInput;
