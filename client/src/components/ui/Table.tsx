import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  selectedRows?: Set<string | number>;
  onSelectRow?: (id: string | number) => void;
  onSelectAll?: () => void;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado',
  onRowClick,
  selectedRows,
  onSelectRow,
  onSelectAll
}: TableProps<T>) {
  const showSelection = selectedRows !== undefined && onSelectRow !== undefined;
  
  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
        <div className="flex items-center justify-center gap-3 text-gray-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              {showSelection && (
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-orange-500 focus:ring-orange-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`
                    px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider
                    ${col.hideOnMobile ? 'hidden md:table-cell' : ''}
                    ${col.className || ''}
                  `}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data.map((item) => {
              const id = keyExtractor(item);
              const isSelected = selectedRows?.has(id);
              
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(item)}
                  className={`
                    ${onRowClick ? 'cursor-pointer hover:bg-zinc-800/50' : ''}
                    ${isSelected ? 'bg-orange-500/10' : ''}
                    transition-colors
                  `}
                >
                  {showSelection && (
                    <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectRow(id)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-orange-500 focus:ring-orange-500"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`
                        px-4 py-3 text-sm text-gray-300
                        ${col.hideOnMobile ? 'hidden md:table-cell' : ''}
                        ${col.className || ''}
                      `}
                    >
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
