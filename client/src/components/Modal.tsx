import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

export function Modal({ isOpen, onClose, title, children, size = 'lg' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className={`bg-zinc-800 w-full ${sizeMap[size]} max-h-[92vh] sm:max-h-[90vh] overflow-y-auto border border-zinc-700 rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col`}>
        <div className="flex justify-between items-center px-4 py-3 sm:p-5 border-b border-zinc-700 sticky top-0 bg-zinc-800 z-10 shrink-0">
          <h2 className="text-base sm:text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-700 transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
