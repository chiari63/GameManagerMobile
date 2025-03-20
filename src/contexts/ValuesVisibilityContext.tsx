import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ValuesVisibilityContextType = {
  showValues: boolean;
  toggleValuesVisibility: () => void;
};

const ValuesVisibilityContext = createContext<ValuesVisibilityContextType | undefined>(undefined);

export const ValuesVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showValues, setShowValues] = useState(true);

  useEffect(() => {
    const loadValuesVisibility = async () => {
      try {
        const savedVisibility = await AsyncStorage.getItem('showValues');
        if (savedVisibility !== null) {
          setShowValues(JSON.parse(savedVisibility));
        }
      } catch (error) {
        console.error('[ValuesVisibilityContext] Erro ao carregar preferência de visibilidade:', error);
      }
    };
    
    loadValuesVisibility();
  }, []);

  const toggleValuesVisibility = () => {
    const newVisibility = !showValues;
    setShowValues(newVisibility);
    AsyncStorage.setItem('showValues', JSON.stringify(newVisibility))
      .catch(error => console.error('[ValuesVisibilityContext] Erro ao salvar preferência de visibilidade:', error));
  };

  return (
    <ValuesVisibilityContext.Provider value={{ showValues, toggleValuesVisibility }}>
      {children}
    </ValuesVisibilityContext.Provider>
  );
};

export const useValuesVisibility = (): ValuesVisibilityContextType => {
  const context = useContext(ValuesVisibilityContext);
  if (context === undefined) {
    throw new Error('useValuesVisibility deve ser usado dentro de um ValuesVisibilityProvider');
  }
  return context;
}; 