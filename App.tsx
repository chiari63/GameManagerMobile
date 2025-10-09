import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Navigation } from './src/navigation';
import darkTheme from './src/theme';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { LogBox, AppState, AppStateStatus, Platform, View, Text, Dimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import { AlertProvider } from './src/contexts/AlertContext';
import { ValuesVisibilityProvider } from './src/contexts/ValuesVisibilityContext';

// Log inicial do ambiente (apenas em desenvolvimento)
if (__DEV__) {
  console.log('[App] Ambiente de execução:', {
    platform: Platform.OS,
    version: Platform.Version,
    isExpo: Constants.appOwnership === 'expo',
    isStandalone: Constants.appOwnership === null,
    expoVersion: Constants.expoVersion,
    appVersion: Constants.manifest2?.extra?.expoClient?.version,
    screenDimensions: Dimensions.get('window'),
    buildType: 'development'
  });
}

// Configurar o tempo máximo de exibição do splash screen
const SPLASH_SCREEN_TIMEOUT = 5000;

// Manter a tela de splash até que estejamos prontos
SplashScreen.preventAutoHideAsync()
  .then(() => console.log('[App] Splash screen prevented from auto-hiding'))
  .catch((error) => {
    console.warn('[App] Erro ao prevenir auto-hide do splash screen:', error);
  });

// Desabilitar warnings específicos
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Configurar o React Query com configurações mais conservadoras
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 500,
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

function onAppStateChange(status: AppStateStatus) {
  console.log('[App] Estado do app mudou para:', status);
  
  if (Platform.OS === 'android') {
    focusManager.setFocused(status === 'active');
  } else {
    focusManager.setFocused(status === 'active' || status === 'inactive');
  }
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Função para esconder o splash screen com timeout
  const hideSplashScreen = useCallback(async () => {
    try {
      console.log('[App] Tentando esconder splash screen');
      await Promise.race([
        SplashScreen.hideAsync(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao esconder splash screen')), SPLASH_SCREEN_TIMEOUT)
        )
      ]);
      console.log('[App] Splash screen escondida com sucesso');
    } catch (error) {
      console.error('[App] Erro ao esconder splash screen:', error);
      setError(error instanceof Error ? error : new Error('Erro desconhecido'));
      // Forçar o estado de ready mesmo com erro
      setAppIsReady(true);
    }
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('[App] Iniciando preparação do app');
        
        // Verificar se todos os componentes necessários estão carregados
        console.log('[App] Verificando componentes:', {
          navigation: !!Navigation,
          safeArea: !!SafeAreaProvider,
          paperProvider: !!PaperProvider,
          theme: !!darkTheme
        });
        
        // Adicionar aqui qualquer inicialização necessária
        await Promise.race([
          new Promise(resolve => setTimeout(resolve, 1000)),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout na preparação')), SPLASH_SCREEN_TIMEOUT)
          )
        ]);
        
        console.log('[App] Preparação concluída');
        setAppIsReady(true);
      } catch (error) {
        console.error('[App] Erro na preparação:', error);
        setError(error instanceof Error ? error : new Error('Erro desconhecido'));
        // Forçar o estado de ready mesmo com erro
        setAppIsReady(true);
      }
    }

    prepare();

    // Configurar um timeout de segurança
    const timeoutId = setTimeout(() => {
      console.log('[App] Timeout de segurança acionado');
      setAppIsReady(true);
    }, SPLASH_SCREEN_TIMEOUT);

    return () => {
      clearTimeout(timeoutId);
      queryClient.clear();
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await hideSplashScreen();
    }
  }, [appIsReady, hideSplashScreen]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  // Se houver erro, mostrar uma tela de erro em vez de travar
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', marginBottom: 10 }}>Erro ao iniciar o app:</Text>
        <Text>{error.message}</Text>
      </View>
    );
  }

  if (!appIsReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={darkTheme}>
          <SafeAreaProvider>
            <AlertProvider>
              <ValuesVisibilityProvider>
                <View onLayout={onLayoutRootView} style={{ flex: 1 }}>
                  <Navigation />
                  <StatusBar style="light" />
                </View>
              </ValuesVisibilityProvider>
            </AlertProvider>
          </SafeAreaProvider>
        </PaperProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
