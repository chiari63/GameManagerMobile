import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { ChevronLeft, Save, Key } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { appColors } from '../theme';
import { useAlert } from '../contexts/AlertContext';
import { RootStackParamList } from '../navigation/types';
import { STORAGE_KEYS } from '../constants/storage';
import { appLog } from '../config/environment';
import { clearIGDBToken } from '../services/igdbAuth';

// Referências às chaves no AsyncStorage
const API_CLIENT_ID_KEY = STORAGE_KEYS.IGDB_CLIENT_ID;
const API_CLIENT_SECRET_KEY = STORAGE_KEYS.IGDB_CLIENT_SECRET;
const API_ACCESS_TOKEN_KEY = STORAGE_KEYS.IGDB_ACCESS_TOKEN;
const API_TOKEN_EXPIRY_KEY = STORAGE_KEYS.IGDB_TOKEN_EXPIRY;

type ApiConfigScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ApiConfigScreen = () => {
  const navigation = useNavigation<ApiConfigScreenNavigationProp>();
  const theme = useTheme();
  const { showAlert } = useAlert();
  
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Carregar credenciais salvas
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedClientId = await AsyncStorage.getItem(API_CLIENT_ID_KEY);
        const savedClientSecret = await AsyncStorage.getItem(API_CLIENT_SECRET_KEY);
        const savedAccessToken = await AsyncStorage.getItem(API_ACCESS_TOKEN_KEY);
        const savedTokenExpiry = await AsyncStorage.getItem(API_TOKEN_EXPIRY_KEY);
        
        if (savedClientId) setClientId(savedClientId);
        if (savedClientSecret) setClientSecret(savedClientSecret);
        if (savedAccessToken) setAccessToken(savedAccessToken);
        if (savedTokenExpiry) setTokenExpiry(savedTokenExpiry);
      } catch (error) {
        appLog.error('Erro ao carregar credenciais:', error);
      }
    };
    
    loadCredentials();
  }, []);
  
  // Configurar cabeçalho da tela
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('MainTabs')}
          style={{ marginLeft: 8 }}
        >
          <ChevronLeft color={theme.colors.onSurface} size={24} />
        </TouchableOpacity>
      ),
      headerTitle: () => (
        <Text style={{ color: theme.colors.onSurface, fontSize: 22, fontWeight: 'bold' }}>
          Configuração da API
        </Text>
      )
    });
  }, [navigation, theme]);
  
  // Limpar credenciais
  const clearCredentials = () => {
    showAlert({
      title: 'Limpar credenciais',
      message: 'Tem certeza que deseja remover todas as credenciais da API?',
      buttons: [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        { 
          text: 'Limpar', 
          onPress: async () => {
            try {
              setLoading(true);
              
              // Limpar credenciais armazenadas
              await AsyncStorage.removeItem(API_CLIENT_ID_KEY);
              await AsyncStorage.removeItem(API_CLIENT_SECRET_KEY);
              await AsyncStorage.removeItem(API_ACCESS_TOKEN_KEY);
              await AsyncStorage.removeItem(API_TOKEN_EXPIRY_KEY);
              
              // Também limpar o token na camada de serviço
              await clearIGDBToken();
              
              // Limpar estados
              setClientId('');
              setClientSecret('');
              setAccessToken('');
              setTokenExpiry('');
              
              showAlert({
                title: 'Sucesso',
                message: 'Credenciais da API removidas com sucesso!',
                buttons: [{ text: 'OK', onPress: () => {} }]
              });
            } catch (error) {
              appLog.error('Erro ao limpar credenciais:', error);
              showAlert({
                title: 'Erro',
                message: 'Não foi possível limpar as credenciais.',
                buttons: [{ text: 'OK', onPress: () => {} }]
              });
            } finally {
              setLoading(false);
            }
          }, 
          style: 'destructive' 
        }
      ]
    });
  };
  
  // Função para depuração - mostrar todos os valores do AsyncStorage
  const debugStorage = async () => {
    try {
      setLoading(true);
      
      // Obter todos os valores relevantes
      const storedClientId = await AsyncStorage.getItem(API_CLIENT_ID_KEY);
      const storedClientSecret = await AsyncStorage.getItem(API_CLIENT_SECRET_KEY);
      const storedToken = await AsyncStorage.getItem(API_ACCESS_TOKEN_KEY);
      const storedExpiry = await AsyncStorage.getItem(API_TOKEN_EXPIRY_KEY);
      
      // Criar mensagem de depuração
      const debugMessage = `
        Client ID: ${storedClientId || 'Não definido'}
        
        Client Secret: ${storedClientSecret ? '******' : 'Não definido'}
        
        Access Token: ${storedToken ? 
          `${storedToken.substring(0, 10)}...${storedToken.substring(storedToken.length - 5)}` : 
          'Não definido'}
        
        Token Expiry: ${storedExpiry || 'Não definido'}
        
        Token Válido: ${storedExpiry && new Date(storedExpiry).getTime() > Date.now() ? 'Sim' : 'Não'}
      `;
      
      showAlert({
        title: 'Valores armazenados',
        message: debugMessage,
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    } catch (error) {
      appLog.error('Erro ao recuperar dados de depuração:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível obter informações de depuração.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Testar conexão com a API e obter token de acesso
  const testConnection = async () => {
    try {
      setLoading(true);
      
      // Validar entradas
      if (!clientId.trim() || !clientSecret.trim()) {
        showAlert({
          title: 'Campos obrigatórios',
          message: 'Client ID e Client Secret são obrigatórios.',
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
        return;
      }
      
      // Limpar token existente antes de testar
      await AsyncStorage.removeItem(API_ACCESS_TOKEN_KEY);
      await AsyncStorage.removeItem(API_TOKEN_EXPIRY_KEY);
      await clearIGDBToken();
      
      // Fazer requisição para obter token usando axios
      const response = await axios.post(
        'https://id.twitch.tv/oauth2/token',
        null,
        {
          params: {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials'
          }
        }
      );
      
      const data = response.data;
      
      if (data.access_token) {
        // Calcular data de expiração
        const expiresIn = data.expires_in;
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn);
        
        // Salvar token e data de expiração
        await AsyncStorage.setItem(API_ACCESS_TOKEN_KEY, data.access_token);
        await AsyncStorage.setItem(API_TOKEN_EXPIRY_KEY, expiryDate.toISOString());
        
        setAccessToken(data.access_token);
        setTokenExpiry(expiryDate.toISOString());
        
        showAlert({
          title: 'Sucesso',
          message: 'Conexão com a API estabelecida com sucesso! Token de acesso obtido.',
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
      } else {
        showAlert({
          title: 'Erro',
          message: 'Não foi possível obter o token de acesso. Verifique suas credenciais.',
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
      }
    } catch (error) {
      appLog.error('Erro ao testar conexão:', error);
      let errorMessage = 'Erro ao conectar com a API. Verifique sua conexão e credenciais.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          errorMessage = `Erro ${error.response.status}: ${error.response.data?.message || error.response.statusText}`;
        } else if (error.request) {
          errorMessage = 'Sem resposta do servidor. Verifique sua conexão com a internet.';
        } else {
          errorMessage = `Erro: ${error.message}`;
        }
      }
      
      showAlert({
        title: 'Erro',
        message: errorMessage,
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Salvar credenciais da API
  const saveCredentials = async () => {
    try {
      setLoading(true);
      
      // Validar entradas
      if (!clientId.trim() || !clientSecret.trim()) {
        showAlert({
          title: 'Campos obrigatórios',
          message: 'Client ID e Client Secret são obrigatórios.',
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
        return;
      }
      
      // Limpar token existente antes de salvar novas credenciais
      await AsyncStorage.removeItem(API_ACCESS_TOKEN_KEY);
      await AsyncStorage.removeItem(API_TOKEN_EXPIRY_KEY);
      await clearIGDBToken();
      
      // Salvar credenciais
      await AsyncStorage.setItem(API_CLIENT_ID_KEY, clientId);
      await AsyncStorage.setItem(API_CLIENT_SECRET_KEY, clientSecret);
      
      showAlert({
        title: 'Sucesso',
        message: 'Credenciais da API salvas com sucesso!',
        buttons: [{ text: 'OK', onPress: () => navigation.goBack() }]
      });
    } catch (error) {
      appLog.error('Erro ao salvar credenciais:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível salvar as credenciais.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Formatação de data para exibição
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR');
    } catch (e) {
      return 'Data inválida';
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Configurações da API IGDB</Text>
        
        <Text style={styles.description}>
          Para usar a API IGDB, você precisa de credenciais da API Twitch. 
          Preencha o Client ID e Client Secret obtidos no Twitch Developer Dashboard.
        </Text>
        
        <View style={styles.form}>
          <TextInput
            label="Client ID"
            value={clientId}
            onChangeText={setClientId}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="Client Secret"
            value={clientSecret}
            onChangeText={setClientSecret}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />
          
          <Button 
            mode="contained" 
            onPress={saveCredentials}
            style={styles.button}
            loading={loading}
            disabled={loading}
            icon={() => <Save size={20} color={theme.colors.background} />}
          >
            Salvar Credenciais
          </Button>
          
          <Button 
            mode="outlined" 
            onPress={testConnection}
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            Testar Conexão
          </Button>
          
          <Button 
            mode="outlined" 
            onPress={clearCredentials}
            style={[styles.button, styles.dangerButton]}
            loading={loading}
            disabled={loading}
            textColor={appColors.destructive}
          >
            Limpar Credenciais
          </Button>
          
          {accessToken && (
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenTitle}>Informações do Token</Text>
              <Text style={styles.tokenLabel}>Token:</Text>
              <Text style={styles.tokenValue}>
                {`${accessToken.substring(0, 15)}...${accessToken.substring(accessToken.length - 5)}`}
              </Text>
              
              <Text style={styles.tokenLabel}>Expira em:</Text>
              <Text style={styles.tokenValue}>
                {formatDate(tokenExpiry)}
              </Text>
            </View>
          )}
        </View>
        
        {/* Botão para depuração */}
        <Button 
          mode="contained" 
          icon={() => <Key size={20} color={theme.colors.background} />}
          style={styles.button}
          onPress={debugStorage}
          disabled={loading}
        >
          Depurar Storage
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: appColors.foreground,
  },
  description: {
    fontSize: 14,
    color: appColors.secondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  form: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginVertical: 8,
  },
  dangerButton: {
    borderColor: appColors.destructive,
  },
  tokenInfo: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: appColors.card,
  },
  tokenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: appColors.foreground,
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: appColors.secondary,
    marginBottom: 4,
  },
  tokenValue: {
    fontSize: 14,
    color: appColors.foreground,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: appColors.background,
    borderRadius: 4,
  },
});

export default ApiConfigScreen; 