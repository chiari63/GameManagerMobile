import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, Card, ActivityIndicator, Divider } from 'react-native-paper';
import { ChevronLeft, Save, Key, Shield, Info, CheckCircle2, XCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { appColors } from '../theme';
import { useAlert } from '../contexts/AlertContext';
import { RootStackParamList } from '../navigation/types';
import { STORAGE_KEYS } from '../constants/storage';
import { appLog } from '../config/environment';
import { 
  saveIGDBCredentials, 
  getIGDBCredentials, 
  deleteIGDBCredentials, 
  clearIGDBToken 
} from '../services/igdbAuth';
import { isSecureStoreAvailable } from '../utils/securityUtils';

// Referências às chaves no AsyncStorage
const API_CLIENT_ID_KEY = STORAGE_KEYS.IGDB_CLIENT_ID;
const API_CLIENT_SECRET_KEY = STORAGE_KEYS.IGDB_CLIENT_SECRET;
const API_ACCESS_TOKEN_KEY = STORAGE_KEYS.IGDB_ACCESS_TOKEN;
const API_TOKEN_EXPIRY_KEY = STORAGE_KEYS.IGDB_TOKEN_EXPIRY;

type ApiConfigScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ApiConfig'>;

const ApiConfigScreen: React.FC = () => {
  const navigation = useNavigation<ApiConfigScreenNavigationProp>();
  const theme = useTheme();
  const { showAlert } = useAlert();
  
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSecureStorage, setIsSecureStorage] = useState<boolean | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Verificar se o armazenamento seguro está disponível
  useEffect(() => {
    const checkSecureStorage = async () => {
      const available = await isSecureStoreAvailable();
      setIsSecureStorage(available);
    };
    
    checkSecureStorage();
  }, []);
  
  // Carregar credenciais salvas
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        setLoading(true);
        
        // Carregar credenciais usando a função centralizada
        const credentials = await getIGDBCredentials();
        if (credentials.clientId) setClientId(credentials.clientId);
        if (credentials.clientSecret) setClientSecret(credentials.clientSecret);
        
        // Carregar informações do token (ainda armazenadas no AsyncStorage)
        const savedAccessToken = await AsyncStorage.getItem(API_ACCESS_TOKEN_KEY);
        const savedTokenExpiry = await AsyncStorage.getItem(API_TOKEN_EXPIRY_KEY);
        
        if (savedAccessToken) setAccessToken(savedAccessToken);
        if (savedTokenExpiry) setTokenExpiry(savedTokenExpiry);
      } catch (error) {
        appLog.error('Erro ao carregar credenciais:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCredentials();
  }, []);
  
  // Configurar cabeçalho da tela
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
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
              
              // Usar a função centralizada para remover credenciais
              await deleteIGDBCredentials();
              
              // Limpar estados
              setClientId('');
              setClientSecret('');
              setAccessToken(null);
              setTokenExpiry(null);
              
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
      
      // Obter credenciais usando a função centralizada
      const credentials = await getIGDBCredentials();
      
      // Obter informações do token
      const storedToken = await AsyncStorage.getItem(API_ACCESS_TOKEN_KEY);
      const storedExpiry = await AsyncStorage.getItem(API_TOKEN_EXPIRY_KEY);
      
      // Criar mensagem de depuração
      const debugMessage = `
        Usando armazenamento seguro: ${isSecureStorage ? 'Sim' : 'Não'}
        
        Client ID: ${credentials.clientId || 'Não definido'}
        
        Client Secret: ${credentials.clientSecret ? '******' : 'Não definido'}
        
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
      
      // Usar a função centralizada para salvar credenciais de forma segura
      await saveIGDBCredentials(clientId, clientSecret);
      
      showAlert({
        title: 'Sucesso',
        message: 'Credenciais da API salvas com segurança!',
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
  
  // Testar conexão com a API
  const testApiConnection = async () => {
    if (!accessToken) {
      showAlert({
        title: 'Erro',
        message: 'Sem token de acesso. Por favor, salve suas credenciais primeiro.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      return;
    }

    setLoading(true);
    setTestResult(null);
    
    try {
      const response = await axios.post(
        'https://api.igdb.com/v4/games',
        'fields name; limit 1;',
        {
          headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      setTestResult({
        success: true,
        message: 'Conexão com a API IGDB bem-sucedida!'
      });
    } catch (error) {
      console.error('Erro ao testar conexão com API:', error);
      setTestResult({
        success: false,
        message: `Erro na conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Formatação de data para exibição
  const formatDate = (dateString: string | null) => {
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
      <Card style={styles.card}>
        <Card.Title title="Configurações da API IGDB" />
        <Card.Content>
          <Text style={styles.infoText}>
            Para acessar a API IGDB, você precisa registrar um aplicativo no Twitch Developer Console e obter suas credenciais.
          </Text>
          
          <View style={styles.infoContainer}>
            <Info size={18} color="#3498db" />
            <Text style={styles.infoLink}>
              Visite: dev.twitch.tv/console/apps
            </Text>
          </View>

          <TextInput
            label="Client ID"
            value={clientId}
            onChangeText={setClientId}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Client Secret"
            value={clientSecret}
            onChangeText={setClientSecret}
            style={styles.input}
            mode="outlined"
            secureTextEntry
          />
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="contained" 
              onPress={saveCredentials} 
              disabled={loading}
              style={styles.button}
            >
              {loading ? 'Salvando...' : 'Salvar Credenciais'}
            </Button>
            
            <Button 
              mode="outlined" 
              onPress={clearCredentials}
              style={styles.button}
              textColor="red"
            >
              Limpar Credenciais
            </Button>
          </View>
        </Card.Content>
      </Card>

      {accessToken && (
        <Card style={styles.card}>
          <Card.Title title="Token de Acesso" />
          <Card.Content>
            <Text style={styles.tokenInfo}>
              Status: <Text style={styles.tokenActive}>Ativo</Text>
            </Text>
            <Text style={styles.tokenInfo}>
              Expira em: {formatDate(tokenExpiry)}
            </Text>
            
            <Divider style={styles.divider} />
            
            <Button 
              mode="contained" 
              onPress={testApiConnection}
              disabled={loading}
              style={styles.testButton}
            >
              Testar Conexão
            </Button>
            
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" />
                <Text>Processando...</Text>
              </View>
            )}
            
            {testResult && (
              <View style={styles.resultContainer}>
                {testResult.success ? (
                  <CheckCircle2 size={24} color="green" />
                ) : (
                  <XCircle size={24} color="red" />
                )}
                <Text style={[
                  styles.resultText,
                  { color: testResult.success ? 'green' : 'red' }
                ]}>
                  {testResult.message}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}
      
      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  input: {
    marginBottom: 16,
  },
  infoText: {
    marginBottom: 12,
    lineHeight: 20,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoLink: {
    marginLeft: 8,
    color: '#3498db',
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    marginBottom: 12,
  },
  testButton: {
    marginTop: 8,
  },
  tokenInfo: {
    marginBottom: 8,
    fontSize: 16,
  },
  tokenActive: {
    color: 'green',
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  resultText: {
    marginLeft: 8,
    fontSize: 16,
  },
  spacer: {
    height: 40,
  },
});

export default ApiConfigScreen; 