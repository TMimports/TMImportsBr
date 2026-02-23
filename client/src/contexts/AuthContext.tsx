import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { auth } from '../services/api';
import type { User } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isAdminRede: boolean;
  mustChangePassword: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      auth.me()
        .then(userData => {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
    }
  }, []);

  const login = async (email: string, senha: string) => {
    const response = await auth.login(email, senha);
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await auth.me();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Erro ao atualizar usuario:', error);
    }
  };

  const isAdmin = user?.role === 'ADMIN_GERAL';
  const isAdminRede = user?.role === 'ADMIN_GERAL' || user?.role === 'ADMIN_REDE';
  const mustChangePassword = user?.mustChangePassword ?? false;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, isAdmin, isAdminRede, mustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
