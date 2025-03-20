import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react-native';
import { checkIGDBConnection } from '../services/igdbApi';
import { useFocusEffect } from '@react-navigation/native';
import { useAlert } from '../contexts/AlertContext';

interface ApiStatusIconProps {
  size?: number;
}

const ApiStatusIcon: React.FC<ApiStatusIconProps> = ({ size = 24 }) => {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const [apiStatus, setApiStatus] = useState<{
    connected: boolean;
    message: string;
    checking: boolean;
  }>({
    connected: false,
    message: 'Verificando conexão...',
    checking: true
  });

  // Verificar status da API IGDB
  const checkApiStatus = async () => {
    try {
      setApiStatus(prev => ({ ...prev, checking: true }));
      const status = await checkIGDBConnection();
      setApiStatus({
        connected: status.connected,
        message: status.message,
        checking: false
      });
    } catch (error) {
      console.error('Erro ao verificar status da API:', error);
      setApiStatus({
        connected: false,
        message: 'Erro ao verificar conexão',
        checking: false
      });
    }
  };

  // Verificar status da API quando o componente for montado
  useEffect(() => {
    checkApiStatus();
  }, []);

  // Verificar status da API quando a tela for focada
  useFocusEffect(
    useCallback(() => {
      checkApiStatus();
    }, [])
  );

  // Mostrar detalhes do status da API
  const showApiStatusDetails = () => {
    if (apiStatus.checking) {
      return; // Não mostrar detalhes enquanto estiver verificando
    }
    
    showAlert({
      title: apiStatus.connected ? 'API IGDB Conectada' : 'API IGDB Desconectada',
      message: apiStatus.message,
      buttons: [
        { 
          text: 'Verificar Novamente', 
          onPress: checkApiStatus 
        },
        { 
          text: 'OK', 
          onPress: () => {} 
        }
      ]
    });
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={showApiStatusDetails}
    >
      {apiStatus.checking ? (
        <RefreshCw size={size} color={theme.colors.onSurfaceVariant} />
      ) : apiStatus.connected ? (
        <Wifi size={size} color="#22c55e" />
      ) : (
        <WifiOff size={size} color="#ef4444" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    marginRight: 4,
  },
});

export default ApiStatusIcon; 