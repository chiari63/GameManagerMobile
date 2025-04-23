import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from './providers/AppProviders';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './navigation';
import { PaperProvider } from 'react-native-paper';
import { useThemeContext } from './contexts/ThemeContext';

const AppContent = () => {
  const { theme, isDarkMode } = useThemeContext();
  
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer theme={theme}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <AppNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
};

export default function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
} 