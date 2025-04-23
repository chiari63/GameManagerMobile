import React, { ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import darkTheme from '../theme';
import { AlertProvider } from '../contexts/AlertContext';
import { AuthProvider } from '../contexts/AuthContext';
import { ValuesVisibilityProvider } from '../contexts/ValuesVisibilityContext';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Componente que centraliza todos os providers da aplicação
 * em uma única árvore de componentes
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PaperProvider theme={darkTheme}>
          <NavigationContainer>
            <AlertProvider>
              <ValuesVisibilityProvider>
                {children}
                <StatusBar style="light" />
              </ValuesVisibilityProvider>
            </AlertProvider>
          </NavigationContainer>
        </PaperProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}; 