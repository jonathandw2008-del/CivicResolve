import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-navy-950/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Container */}
      <div className="min-h-full flex items-center justify-center p-3 sm:p-4 text-center">
        <div
          className={cn(
            'w-full bg-[#0D1B2E] rounded-2xl text-left shadow-2xl border border-slate-800 transform overflow-hidden my-6 animate-in zoom-in-95 slide-in-from-bottom-3 duration-200 ease-out text-[#F8FAFC]',
            maxWidthClass
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-heading-title"
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-800 flex items-center justify-between bg-[#10243B]/80 backdrop-blur-md">
            <div className="pr-2">
              <h3 id="modal-heading-title" className="text-base sm:text-lg font-bold text-white leading-snug">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="text-slate-400 hover:text-white rounded-xl p-2 hover:bg-slate-800 transition-colors focus-ring touch-target flex items-center justify-center flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 scrollbar-thin">{children}</div>
        </div>
      </div>
    </div>
  );
};
