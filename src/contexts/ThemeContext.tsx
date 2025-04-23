import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme } from '../theme';
import { appLog } from '../config/environment';

// Definir os tipos
type ThemeType = 'dark' | 'light' | 'system';
type ThemeContextType = {
  theme: typeof darkTheme | typeof lightTheme;
  themeType: ThemeType;
  isDarkMode: boolean;
  setThemeType: (type: ThemeType) => void;
  toggleTheme: () => void;
};

// Criar o contexto
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Chave para armazenar a preferência de tema
const THEME_PREFERENCE_KEY = '@GameManager:themePreference';

// Hook customizado para usar o contexto de tema
export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext deve ser usado dentro de um ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

// Provider do tema
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>('dark');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [theme, setTheme] = useState(darkTheme);

  // Carregar a preferência de tema
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const storedThemeType = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (storedThemeType) {
          setThemeType(storedThemeType as ThemeType);
        }
      } catch (error) {
        appLog.error('Erro ao carregar preferência de tema:', error);
      }
    };

    loadThemePreference();
  }, []);

  // Atualizar o status de modo escuro com base no tipo de tema e tema do sistema
  useEffect(() => {
    let newIsDarkMode: boolean;
    
    if (themeType === 'system') {
      newIsDarkMode = systemColorScheme === 'dark';
    } else {
      newIsDarkMode = themeType === 'dark';
    }
    
    setIsDarkMode(newIsDarkMode);
    
    // Atualizar o tema com base no modo escuro
    setTheme(newIsDarkMode ? darkTheme : lightTheme);
    
    appLog.debug(`Tema alterado para: ${newIsDarkMode ? 'escuro' : 'claro'}`);
  }, [themeType, systemColorScheme]);

  // Salvar a preferência de tema quando mudar
  useEffect(() => {
    const saveThemePreference = async () => {
      try {
        await AsyncStorage.setItem(THEME_PREFERENCE_KEY, themeType);
        appLog.debug(`Preferência de tema salva: ${themeType}`);
      } catch (error) {
        appLog.error('Erro ao salvar preferência de tema:', error);
      }
    };

    saveThemePreference();
  }, [themeType]);

  // Alternar entre temas
  const toggleTheme = () => {
    const newThemeType = themeType === 'dark' ? 'light' : 'dark';
    setThemeType(newThemeType);
    appLog.debug(`Tema alternado para: ${newThemeType}`);
  };

  // Definir o tipo de tema
  const handleSetThemeType = (type: ThemeType) => {
    setThemeType(type);
  };

  // Valor do contexto
  const contextValue: ThemeContextType = {
    theme,
    themeType,
    isDarkMode,
    setThemeType: handleSetThemeType,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}; 