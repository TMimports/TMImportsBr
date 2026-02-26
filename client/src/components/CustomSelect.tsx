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

  const textColor = selected ? '#ffffff' : '#9ca3af';

  return (
    <div className={className}>
      {label && <label className="label">{label}{required ? ' *' : ''}</label>}
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: '#27272a',
            border: open ? '1px solid #f97316' : '1px solid #3f3f46',
            borderRadius: '8px',
            textAlign: 'left' as const,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            color: textColor,
            WebkitTextFillColor: textColor,
            fontSize: '14px',
            outline: open ? '1px solid rgba(249, 115, 22, 0.5)' : 'none',
            transition: 'border-color 0.2s',
          }}
        >
          <span style={{ color: textColor, WebkitTextFillColor: textColor }}>{selected ? selected.label : placeholder}</span>
          <svg
            style={{
              width: '16px',
              height: '16px',
              color: '#9ca3af',
              transition: 'transform 0.2s',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div
            style={{
              position: 'absolute',
              zIndex: 9999,
              width: '100%',
              marginTop: '4px',
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              maxHeight: '240px',
              overflowY: 'auto' as const,
            }}
          >
            {options.map((opt, idx) => {
              const itemColor = opt.value === value ? '#fb923c' : '#ffffff';
              const itemBg = opt.value === value ? 'rgba(249, 115, 22, 0.15)' : 'transparent';
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    color: itemColor,
                    WebkitTextFillColor: itemColor,
                    backgroundColor: itemBg,
                    borderBottom: idx < options.length - 1 ? '1px solid rgba(63, 63, 70, 0.5)' : 'none',
                    fontSize: '14px',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (opt.value !== value) {
                      (e.target as HTMLElement).style.backgroundColor = '#3f3f46';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = opt.value === value ? 'rgba(249, 115, 22, 0.15)' : 'transparent';
                  }}
                >
                  {opt.label}
                </div>
              );
            })}
            {options.length === 0 && (
              <div style={{ padding: '12px 16px', color: '#6b7280', WebkitTextFillColor: '#6b7280', textAlign: 'center' }}>
                Nenhuma opcao
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
