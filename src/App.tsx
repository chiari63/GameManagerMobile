import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { theme } from './theme';
import { initializeStorage } from './services/storage';
import { requestNotificationPermissions } from './services/notifications';
import MainNavigator from './navigation/MainNavigator';

export default function App() {
  useEffect(() => {
    // Inicializa o armazenamento local
    initializeStorage();
    
    // Solicita permissões de notificação
    requestNotificationPermissions();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <MainNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
} 