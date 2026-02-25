import { useState, useRef, useEffect } from 'react';

interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export function CustomSelect({ value, onChange, options, placeholder = 'Selecione...', className = '', label, required, disabled }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={className}>
      {label && <label className="label">{label}{required ? ' *' : ''}</label>}
      <div ref={ref} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={`w-full px-4 py-2.5 bg-zinc-800 border rounded-lg text-left flex items-center justify-between transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            open ? 'border-orange-500 ring-1 ring-orange-500/50' : 'border-zinc-700 hover:border-zinc-600'
          }`}
        >
          <span className={selected ? 'text-white' : 'text-gray-500'}>
            {selected ? selected.label : placeholder}
          </span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto animate-fade-in">
            {options.map(opt => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`px-4 py-2.5 cursor-pointer transition-colors border-b border-zinc-700/50 last:border-0 ${
                  opt.value === value
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'text-white hover:bg-zinc-700'
                }`}
              >
                {opt.label}
              </div>
            ))}
            {options.length === 0 && (
              <div className="px-4 py-3 text-gray-500 text-center">Nenhuma opcao</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
