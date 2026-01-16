import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backLink?: {
    label: string;
    onClick: () => void;
  };
}

export function SectionHeader({ title, subtitle, actions, backLink }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      {backLink && (
        <button
          onClick={backLink.onClick}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-2 transition-colors"
        >
          <span>←</span>
          <span>{backLink.label}</span>
        </button>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
