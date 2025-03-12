import React, { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  currentUser: { username: string; isLoggedIn: boolean };
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Usuário sempre autenticado com nome padrão
  const currentUser = { username: 'Usuário', isLoggedIn: true };
  const loading = false;

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
} 