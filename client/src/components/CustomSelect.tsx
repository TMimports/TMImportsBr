import { useState, useRef, useEffect } from 'react';

interface CustomSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
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
  const [busca, setBusca] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setBusca('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current && options.length > 8) {
      inputRef.current.focus();
    }
  }, [open, options.length]);

  const filtradas = busca
    ? options.filter(o => o.label.toLowerCase().includes(busca.toLowerCase()))
    : options;

  const textColor = selected ? '#ffffff' : '#9ca3af';

  return (
    <div className={className}>
      {label && <label className="label">{label}{required ? ' *' : ''}</label>}
      <div ref={ref} style={{ position: 'relative' }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => !disabled && setOpen(!open)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !disabled && setOpen(!open); } }}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: '#27272a',
            border: open ? '1px solid #f97316' : '1px solid #3f3f46',
            borderRadius: '8px',
            textAlign: 'left',
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
            userSelect: 'none',
          }}
        >
          <span style={{ color: textColor, WebkitTextFillColor: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected ? selected.label : placeholder}</span>
          <svg
            style={{
              width: '16px',
              height: '16px',
              color: '#9ca3af',
              transition: 'transform 0.2s',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              flexShrink: 0,
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {open && (
          <div
            style={{
              position: 'absolute',
              zIndex: 9999,
              width: '100%',
              minWidth: '280px',
              marginTop: '4px',
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '10px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
              maxHeight: '360px',
              display: 'flex',
              flexDirection: 'column' as const,
            }}
          >
            {options.length > 8 && (
              <div style={{ padding: '8px', borderBottom: '1px solid #27272a' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#f97316'; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = '#3f3f46'; }}
                />
              </div>
            )}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtradas.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isDisabled = opt.disabled === true;
                const itemColor = isDisabled ? '#6b7280' : isSelected ? '#fb923c' : '#ffffff';
                const itemBg = isSelected ? 'rgba(249, 115, 22, 0.15)' : 'transparent';
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      if (isDisabled) return;
                      onChange(opt.value);
                      setOpen(false);
                      setBusca('');
                    }}
                    style={{
                      padding: '11px 16px',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      color: itemColor,
                      WebkitTextFillColor: itemColor,
                      backgroundColor: itemBg,
                      borderBottom: idx < filtradas.length - 1 ? '1px solid rgba(39, 39, 42, 0.8)' : 'none',
                      fontSize: '14px',
                      transition: 'background-color 0.15s',
                      opacity: isDisabled ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isDisabled) {
                        (e.target as HTMLElement).style.backgroundColor = '#27272a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.backgroundColor = isSelected ? 'rgba(249, 115, 22, 0.15)' : 'transparent';
                    }}
                  >
                    {opt.label}
                  </div>
                );
              })}
              {filtradas.length === 0 && (
                <div style={{ padding: '16px', color: '#6b7280', WebkitTextFillColor: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
                  Nenhuma opcao encontrada
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
