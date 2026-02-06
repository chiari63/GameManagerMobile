import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  username: string;
  isLoggedIn: boolean;
  hasCompletedOnboarding: boolean;
}

interface AuthContextType {
  currentUser: User;
  loading: boolean;
  setUserName: (name: string) => Promise<void>;
  completeOnboarding: (name: string) => Promise<void>;
  resetAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USERNAME_KEY = '@GameManager:username';
const ONBOARDED_KEY = '@GameManager:onboarded';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>({
    username: 'Gamer',
    isLoggedIn: true,
    hasCompletedOnboarding: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const [storedUsername, storedOnboarded] = await Promise.all([
        AsyncStorage.getItem(USERNAME_KEY),
        AsyncStorage.getItem(ONBOARDED_KEY),
      ]);

      setCurrentUser({
        username: storedUsername || 'Gamer',
        isLoggedIn: true, // App sempre logado para esta versão
        hasCompletedOnboarding: storedOnboarded === 'true',
      });
    } catch (error) {
      console.error('[AuthContext] Erro ao carregar usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const setUserName = async (name: string) => {
    try {
      await AsyncStorage.setItem(USERNAME_KEY, name);
      setCurrentUser(prev => ({ ...prev, username: name }));
    } catch (error) {
      console.error('[AuthContext] Erro ao salvar nome:', error);
    }
  };

  const completeOnboarding = async (name: string) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(USERNAME_KEY, name),
        AsyncStorage.setItem(ONBOARDED_KEY, 'true'),
      ]);
      setCurrentUser({
        username: name,
        isLoggedIn: true,
        hasCompletedOnboarding: true,
      });
    } catch (error) {
      console.error('[AuthContext] Erro ao completar onboarding:', error);
    }
  };

  const resetAuth = async () => {
    try {
      await AsyncStorage.multiRemove([USERNAME_KEY, ONBOARDED_KEY]);
      setCurrentUser({
        username: 'Gamer',
        isLoggedIn: true,
        hasCompletedOnboarding: false,
      });
    } catch (error) {
      console.error('[AuthContext] Erro ao resetar auth:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, setUserName, completeOnboarding, resetAuth }}>
      {children}
    </AuthContext.Provider>
  );
} 