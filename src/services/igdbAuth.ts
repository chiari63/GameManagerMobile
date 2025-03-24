import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { igdbConfig } from '../config/igdbConfig';
import { STORAGE_KEYS } from '../constants/storage';
import { appLog } from '../config/environment';

// Chaves para armazenamento do token
const IGDB_TOKEN_KEY = STORAGE_KEYS.IGDB_ACCESS_TOKEN;
const IGDB_TOKEN_EXPIRY_KEY = STORAGE_KEYS.IGDB_TOKEN_EXPIRY;

// Chaves para armazenamento das credenciais configuradas pelo usuário
const API_CLIENT_ID_KEY = STORAGE_KEYS.IGDB_CLIENT_ID;
const API_CLIENT_SECRET_KEY = STORAGE_KEYS.IGDB_CLIENT_SECRET;

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Obtém um token de acesso válido para a API IGDB
 * Verifica se existe um token armazenado e válido, caso contrário solicita um novo
 */
export const getIGDBToken = async (): Promise<string> => {
  appLog.info('getIGDBToken - Iniciando obtenção de token');
  try {
    // Verificar se já temos um token armazenado
    const storedToken = await AsyncStorage.getItem(IGDB_TOKEN_KEY);
    const storedExpiry = await AsyncStorage.getItem(IGDB_TOKEN_EXPIRY_KEY);
    
    appLog.debug('getIGDBToken - Token armazenado:', storedToken ? `${storedToken.substring(0, 10)}...` : 'Não');
    appLog.debug('getIGDBToken - Data de expiração armazenada:', storedExpiry || 'Não');
    
    const now = Date.now();
    appLog.debug('getIGDBToken - Data atual:', now);
    
    // Se temos um token e ele ainda é válido, retorná-lo
    if (storedToken && storedExpiry && new Date(storedExpiry).getTime() > now) {
      appLog.info('getIGDBToken - Usando token IGDB armazenado (válido)');
      return storedToken;
    }
    
    // Obter credenciais configuradas pelo usuário
    const userClientId = await AsyncStorage.getItem(API_CLIENT_ID_KEY);
    const userClientSecret = await AsyncStorage.getItem(API_CLIENT_SECRET_KEY);
    
    // Definir quais credenciais usar (priorizar as configuradas pelo usuário)
    const clientId = userClientId || igdbConfig.clientId;
    const clientSecret = userClientSecret || igdbConfig.clientSecret;
    
    // Caso contrário, solicitar um novo token
    appLog.info('getIGDBToken - Solicitando novo token IGDB');
    appLog.debug('getIGDBToken - Client ID:', clientId ? 'Configurado' : 'Não configurado');
    appLog.debug('getIGDBToken - Client Secret:', clientSecret ? 'Configurado' : 'Não configurado');
    
    // Verificar se as credenciais estão configuradas
    if (!clientId || !clientSecret) {
      appLog.error('getIGDBToken - Credenciais da API IGDB não configuradas');
      throw new Error('Credenciais da API IGDB não configuradas');
    }
    
    appLog.info('getIGDBToken - Fazendo requisição para obter token...');
    const response = await axios.post<TokenResponse>(
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
    
    appLog.debug('getIGDBToken - Resposta recebida com status:', response.status);
    const { access_token, expires_in } = response.data;
    appLog.debug('getIGDBToken - Token obtido:', access_token ? `${access_token.substring(0, 10)}...` : 'Não');
    appLog.debug('getIGDBToken - Expira em (segundos):', expires_in);
    
    if (!access_token) {
      appLog.error('getIGDBToken - Token não recebido na resposta');
      throw new Error('Token não recebido na resposta');
    }
    
    // Calcular quando o token expira (subtraindo 5 minutos para segurança)
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + expires_in - 300); // 5 minutos de segurança
    appLog.debug('getIGDBToken - Nova data de expiração:', expiryDate.toISOString());
    
    // Armazenar o token e sua data de expiração
    await AsyncStorage.setItem(IGDB_TOKEN_KEY, access_token);
    await AsyncStorage.setItem(IGDB_TOKEN_EXPIRY_KEY, expiryDate.toISOString());
    appLog.info('getIGDBToken - Token armazenado com sucesso');
    
    return access_token;
  } catch (error) {
    appLog.error('getIGDBToken - Erro ao obter token IGDB:', error);
    
    if (axios.isAxiosError(error)) {
      appLog.error('getIGDBToken - Detalhes do erro Axios:', error.message);
      if (error.response) {
        appLog.error('getIGDBToken - Status:', error.response.status);
        appLog.error('getIGDBToken - Dados:', JSON.stringify(error.response.data));
        
        // Se o erro for de autenticação, limpar o token
        if (error.response.status === 401) {
          await clearIGDBToken();
        }
      }
    }
    
    throw new Error('Falha na autenticação com a API IGDB');
  }
};

/**
 * Limpa o token armazenado, forçando a obtenção de um novo na próxima requisição
 */
export const clearIGDBToken = async (): Promise<void> => {
  await AsyncStorage.removeItem(IGDB_TOKEN_KEY);
  await AsyncStorage.removeItem(IGDB_TOKEN_EXPIRY_KEY);
  appLog.info('clearIGDBToken - Token IGDB removido');
}; 