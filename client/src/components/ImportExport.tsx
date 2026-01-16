import { useState } from 'react';

interface ImportExportProps {
  entity: string;
  onImportSuccess?: () => void;
}

export function ImportExport({ entity, onImportSuccess }: ImportExportProps) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/${entity}/export`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Erro ao exportar');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entity}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      setMessage({ type: 'success', text: 'Arquivo exportado com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao exportar' });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/${entity}/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao importar');
      }

      const data = await response.json();
      setMessage({ type: 'success', text: `${data.imported || 0} registros importados!` });
      onImportSuccess?.();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao importar' });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="btn btn-secondary text-sm"
      >
        {exporting ? 'Exportando...' : 'Exportar CSV'}
      </button>
      
      <label className="btn btn-secondary text-sm cursor-pointer">
        {importing ? 'Importando...' : 'Importar CSV'}
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleImport}
          disabled={importing}
          className="hidden"
        />
      </label>

      {message && (
        <span className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {message.text}
        </span>
      )}
    </div>
  );
}
