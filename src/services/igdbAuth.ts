import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { igdbConfig } from '../config/igdbConfig';

// Chaves para armazenamento do token
const IGDB_TOKEN_KEY = '@GameManager:igdb_token';
const IGDB_TOKEN_EXPIRY_KEY = '@GameManager:igdb_token_expiry';

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
  console.log('getIGDBToken - Iniciando obtenção de token');
  try {
    // Verificar se já temos um token armazenado
    const storedToken = await AsyncStorage.getItem(IGDB_TOKEN_KEY);
    const storedExpiry = await AsyncStorage.getItem(IGDB_TOKEN_EXPIRY_KEY);
    
    console.log('getIGDBToken - Token armazenado:', storedToken ? `${storedToken.substring(0, 10)}...` : 'Não');
    console.log('getIGDBToken - Data de expiração armazenada:', storedExpiry || 'Não');
    
    const now = Date.now();
    console.log('getIGDBToken - Data atual:', now);
    
    // Se temos um token e ele ainda é válido, retorná-lo
    if (storedToken && storedExpiry && parseInt(storedExpiry) > now) {
      console.log('getIGDBToken - Usando token IGDB armazenado (válido)');
      return storedToken;
    }
    
    // Caso contrário, solicitar um novo token
    console.log('getIGDBToken - Solicitando novo token IGDB');
    console.log('getIGDBToken - Client ID:', igdbConfig.clientId);
    console.log('getIGDBToken - Client Secret:', igdbConfig.clientSecret ? 'Configurado' : 'Não configurado');
    
    // Verificar se as credenciais estão configuradas
    if (!igdbConfig.clientId || !igdbConfig.clientSecret) {
      console.error('getIGDBToken - Credenciais da API IGDB não configuradas');
      throw new Error('Credenciais da API IGDB não configuradas');
    }
    
    console.log('getIGDBToken - Fazendo requisição para obter token...');
    const response = await axios.post<TokenResponse>(
      'https://id.twitch.tv/oauth2/token',
      null,
      {
        params: {
          client_id: igdbConfig.clientId,
          client_secret: igdbConfig.clientSecret,
          grant_type: 'client_credentials'
        }
      }
    );
    
    console.log('getIGDBToken - Resposta recebida com status:', response.status);
    const { access_token, expires_in } = response.data;
    console.log('getIGDBToken - Token obtido:', access_token ? `${access_token.substring(0, 10)}...` : 'Não');
    console.log('getIGDBToken - Expira em (segundos):', expires_in);
    
    if (!access_token) {
      console.error('getIGDBToken - Token não recebido na resposta');
      throw new Error('Token não recebido na resposta');
    }
    
    // Calcular quando o token expira (subtraindo 5 minutos para segurança)
    const expiryTime = now + (expires_in * 1000) - (5 * 60 * 1000);
    console.log('getIGDBToken - Nova data de expiração:', expiryTime);
    
    // Armazenar o token e sua data de expiração
    await AsyncStorage.setItem(IGDB_TOKEN_KEY, access_token);
    await AsyncStorage.setItem(IGDB_TOKEN_EXPIRY_KEY, expiryTime.toString());
    console.log('getIGDBToken - Token armazenado com sucesso');
    
    return access_token;
  } catch (error) {
    console.error('getIGDBToken - Erro ao obter token IGDB:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('getIGDBToken - Detalhes do erro Axios:', error.message);
      if (error.response) {
        console.error('getIGDBToken - Status:', error.response.status);
        console.error('getIGDBToken - Dados:', JSON.stringify(error.response.data));
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
}; 