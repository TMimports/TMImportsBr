import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

interface LojaOption {
  id: number;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  ativo: boolean;
}

interface LojaContextValue {
  lojas: LojaOption[];
  selectedLojaId: number | null;
  selectedLoja: LojaOption | null;
  setSelectedLojaId: (id: number | null) => void;
  loadingLojas: boolean;
}

const LojaContext = createContext<LojaContextValue>({
  lojas: [],
  selectedLojaId: null,
  selectedLoja: null,
  setSelectedLojaId: () => {},
  loadingLojas: false,
});

export function useLojaContext() {
  return useContext(LojaContext);
}

const ROLES_CAN_SELECT = ['ADMIN_GERAL', 'ADMIN_FINANCEIRO', 'ADMIN_REDE', 'DONO_LOJA'];

export function LojaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lojas, setLojas] = useState<LojaOption[]>([]);
  const [selectedLojaId, setSelectedLojaIdState] = useState<number | null>(null);
  const [loadingLojas, setLoadingLojas] = useState(false);

  const canSelect = user?.role && ROLES_CAN_SELECT.includes(user.role);

  const loadLojas = useCallback(async () => {
    if (!user) return;
    setLoadingLojas(true);
    try {
      const data = await api.get<LojaOption[]>('/lojas');
      const ativas = data.filter((l: LojaOption) => l.ativo !== false);
      setLojas(ativas);
    } catch {
      setLojas([]);
    } finally {
      setLoadingLojas(false);
    }
  }, [user]);

  useEffect(() => {
    if (canSelect) {
      loadLojas();
    } else if (user?.loja) {
      setLojas([{
        id: user.loja.id,
        nomeFantasia: user.loja.nomeFantasia,
        razaoSocial: user.loja.nomeFantasia,
        cnpj: '',
        ativo: true,
      }]);
    }
  }, [user, canSelect, loadLojas]);

  const setSelectedLojaId = (id: number | null) => {
    setSelectedLojaIdState(id);
    try {
      if (id === null) localStorage.removeItem('selectedLojaId');
      else localStorage.setItem('selectedLojaId', String(id));
    } catch {}
  };

  useEffect(() => {
    if (!canSelect) {
      setSelectedLojaIdState(null);
      return;
    }
    try {
      const saved = localStorage.getItem('selectedLojaId');
      if (saved) setSelectedLojaIdState(Number(saved));
    } catch {}
  }, [canSelect]);

  const selectedLoja = lojas.find(l => l.id === selectedLojaId) ?? null;

  return (
    <LojaContext.Provider value={{ lojas, selectedLojaId, selectedLoja, setSelectedLojaId, loadingLojas }}>
      {children}
    </LojaContext.Provider>
  );
}
