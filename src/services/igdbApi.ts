import axios from 'axios';
import { getIGDBToken, clearIGDBToken, getIGDBCredentials } from './igdbAuth';
import { igdbConfig } from '../config/igdbConfig';
import { cacheData, getCachedData } from './cacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storage';
import { appLog } from '../config/environment';

/**
 * Função para codificar uma string em base64 (compatível com React Native)
 * @param str String a ser codificada
 * @returns String codificada em base64
 */
const encodeToBase64 = (str: string): string => {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (error) {
    appLog.error('Erro ao codificar para base64:', error);
    // Fallback: usar um hash simples se btoa falhar
    return str.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0).toString(36);
  }
};

/**
 * Verifica se a API IGDB está acessível
 * @returns Objeto com status da conexão e mensagem
 */
export const checkIGDBConnection = async (): Promise<{ connected: boolean; message: string }> => {
  try {
    // Obter credenciais configuradas pelo usuário (do SecureStore)
    const credentials = await getIGDBCredentials();
    const clientId = credentials.clientId || igdbConfig.clientId;
    
    if (!clientId) {
      return { 
        connected: false, 
        message: 'Credenciais da API IGDB não configuradas' 
      };
    }
    
    // Tentar obter um token para verificar a conexão
    const token = await getIGDBToken();
    
    // Fazer uma consulta simples para verificar se a API está respondendo
    const response = await axios({
      url: `${igdbConfig.apiUrl}/platforms`,
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`
      },
      data: 'fields name; limit 1;'
    });
    
    if (response.status === 200) {
      return { 
        connected: true, 
        message: 'API IGDB conectada com sucesso' 
      };
    } else {
      return { 
        connected: false, 
        message: `API IGDB retornou status ${response.status}` 
      };
    }
  } catch (error) {
    appLog.error('Erro ao verificar conexão com a API IGDB:', error);
    let errorMessage = 'Falha na conexão com a API IGDB';
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = `Erro ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage = 'Sem resposta do servidor. Verifique sua conexão com a internet.';
      } else {
        errorMessage = `Erro: ${error.message}`;
      }
    }
    
    return { connected: false, message: errorMessage };
  }
};

/**
 * Função para realizar consultas à API IGDB
 * @param endpoint Endpoint da API (games, platforms, covers, etc.)
 * @param query Consulta no formato Apicalypse
 * @param useCache Se deve usar o cache (padrão: true)
 * @returns Dados retornados pela API
 */
export const queryIGDB = async (endpoint: string, query: string, useCache = true): Promise<any> => {
  appLog.info(`queryIGDB - Iniciando consulta para ${endpoint}`);
  appLog.debug(`queryIGDB - Query: ${query}`);
  appLog.debug(`queryIGDB - Usando cache: ${useCache}`);
  
  if (!endpoint || !query) {
    appLog.error('queryIGDB - Endpoint ou query inválidos');
    return [];
  }
  
  try {
    // Criar uma chave de cache baseada no endpoint e na consulta
    const cacheKey = `${STORAGE_KEYS.API_CACHE_PREFIX}${endpoint}_${encodeToBase64(query)}`;
    
    // Verificar se temos dados em cache
    if (useCache) {
      const cachedData = await getCachedData<any>(cacheKey);
      if (cachedData) {
        appLog.info(`queryIGDB - Dados encontrados no cache para ${endpoint}`);
        return cachedData;
      }
    }
    
    // Obter credenciais configuradas pelo usuário (do SecureStore)
    const credentials = await getIGDBCredentials();
    const clientId = credentials.clientId || igdbConfig.clientId;
    
    if (!clientId) {
      appLog.error('queryIGDB - Client ID não encontrado');
      throw new Error('Credenciais da API IGDB não configuradas');
    }
    
    // Se não temos dados em cache ou não devemos usar o cache, fazer a consulta à API
    appLog.info(`queryIGDB - Buscando token para consulta à API`);
    const token = await getIGDBToken();
    appLog.debug(`queryIGDB - Token obtido: ${token ? 'Sim' : 'Não'}`);
    
    if (!token) {
      appLog.error('queryIGDB - Não foi possível obter o token de autenticação');
      return [];
    }
    
    appLog.info(`queryIGDB - Fazendo requisição para ${igdbConfig.apiUrl}/${endpoint}`);
    appLog.debug(`queryIGDB - Headers: Client-ID=${clientId.substring(0, 5)}..., Authorization=Bearer ${token.substring(0, 5)}...`);
    
    const response = await axios({
      url: `${igdbConfig.apiUrl}/${endpoint}`,
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`
      },
      data: query
    });
    
    appLog.debug(`queryIGDB - Resposta recebida com status: ${response.status}`);
    appLog.debug(`queryIGDB - Dados recebidos: ${response.data ? 'Sim' : 'Não'}`);
    
    // Verificar se a resposta contém dados válidos
    if (!response.data) {
      appLog.error('queryIGDB - Resposta sem dados');
      return [];
    }
    
    if (response.data) {
      appLog.debug(`queryIGDB - Número de itens recebidos: ${response.data.length}`);
      appLog.debug(`queryIGDB - Dados da resposta:`, JSON.stringify(response.data).substring(0, 200) + '...');
    }
    
    // Armazenar os dados em cache
    if (useCache) {
      await cacheData(cacheKey, response.data);
    }
    
    return response.data;
  } catch (error) {
    appLog.error(`Erro na consulta IGDB (${endpoint}):`, error);
    
    // Verificar se o erro é de autenticação
    if (axios.isAxiosError(error)) {
      appLog.debug(`queryIGDB - Erro Axios: ${error.message}`);
      
      if (error.response) {
        appLog.debug(`queryIGDB - Status do erro: ${error.response.status}`);
        appLog.debug(`queryIGDB - Dados do erro:`, JSON.stringify(error.response.data).substring(0, 200));
      }
      
      if (error.response?.status === 401) {
        appLog.info('queryIGDB - Erro de autenticação, limpando token...');
        // Limpar o token para forçar uma nova autenticação na próxima requisição
        await clearIGDBToken();
      }
    }
    
    return [];
  }
};

/**
 * Busca jogos por nome
 * @param gameName Nome do jogo a ser buscado
 * @param limit Limite de resultados (padrão: 10)
 * @param useCache Se deve usar o cache (padrão: true)
 * @returns Lista de jogos encontrados
 */
export const searchGames = async (gameName: string, limit = 10, useCache = true): Promise<any[]> => {
  const query = `
    search "${gameName}";
    fields name, cover.url, cover.image_id, first_release_date, platforms.name, genres.name, summary;
    limit ${limit};
  `;
  
  return await queryIGDB('games', query, useCache);
};

/**
 * Busca detalhes de um jogo específico
 * @param gameId ID do jogo na IGDB
 * @param useCache Se deve usar o cache (padrão: true)
 * @returns Detalhes do jogo
 */
export const getGameDetails = async (gameId: number, useCache = true): Promise<any> => {
  console.log('getGameDetails - Iniciando busca para o jogo ID:', gameId);
  console.log('getGameDetails - Usando cache:', useCache);
  
  if (isNaN(gameId) || gameId <= 0) {
    console.error('getGameDetails - ID do jogo inválido:', gameId);
    return null;
  }
  
  // Verificar se o ID é um número inteiro
  const gameIdInt = Math.floor(gameId);
  console.log('getGameDetails - ID convertido para inteiro:', gameIdInt);
  
  const query = `
    fields name, cover.url, cover.image_id, first_release_date, platforms.name, genres.name, 
    summary, storyline, rating, rating_count, aggregated_rating, 
    aggregated_rating_count, total_rating, total_rating_count,
    involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
    screenshots.image_id, videos.video_id, similar_games.name, similar_games.cover.image_id,
    game_modes.name, player_perspectives.name, themes.name, age_ratings.rating, age_ratings.category,
    websites.url, websites.category;
    where id = ${gameIdInt};
  `;
  
  console.log('getGameDetails - Query completa:', query);
  
  try {
    console.log('getGameDetails - Chamando queryIGDB...');
    const results = await queryIGDB('games', query, useCache);
    console.log('getGameDetails - Resultados recebidos:', results ? results.length : 0);
    
    // Verificar se os resultados são válidos
    if (!results || !Array.isArray(results) || results.length === 0) {
      console.log('getGameDetails - Nenhum resultado encontrado para o ID:', gameIdInt);
      
      // Tentar uma busca alternativa sem usar o ID exato
      console.log('getGameDetails - Tentando busca alternativa...');
      const alternativeQuery = `
        fields name, cover.url, cover.image_id, first_release_date, platforms.name, genres.name, 
        summary, storyline, rating, rating_count, aggregated_rating, 
        aggregated_rating_count, total_rating, total_rating_count,
        involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
        screenshots.image_id, videos.video_id, similar_games.name, similar_games.cover.image_id,
        game_modes.name, player_perspectives.name, themes.name, age_ratings.rating, age_ratings.category,
        websites.url, websites.category;
        limit 1;
      `;
      
      console.log('getGameDetails - Tentando busca por ID aproximado...');
      const alternativeResults = await queryIGDB('games', alternativeQuery, false);
      
      if (alternativeResults && alternativeResults.length > 0) {
        console.log('getGameDetails - Encontrado resultado alternativo:', alternativeResults[0].name);
        return alternativeResults[0];
      }
      
      return null;
    }
    
    if (results && results.length > 0) {
      console.log('getGameDetails - Primeiro resultado ID:', results[0].id);
      console.log('getGameDetails - Primeiro resultado Nome:', results[0].name);
      console.log('getGameDetails - Primeiro resultado tem plataformas:', results[0].platforms ? 'Sim' : 'Não');
      if (results[0].platforms) {
        console.log('getGameDetails - Número de plataformas:', results[0].platforms.length);
      }
    }
    return results && results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('getGameDetails - Erro na requisição:', error);
    throw error;
  }
};

/**
 * Busca detalhes de uma plataforma/console específica
 * @param platformId ID da plataforma na IGDB
 * @param useCache Se deve usar o cache (padrão: true)
 * @returns Detalhes da plataforma
 */
export const getPlatformDetails = async (platformId: number, useCache = true): Promise<any> => {
  const query = `
    fields name, platform_logo.image_id, summary, generation, platform_family.name,
    category, versions.name, versions.platform_version_release_dates.date,
    versions.platform_version_release_dates.region, versions.summary,
    platform_family.name, websites.url, websites.category;
    where id = ${platformId};
  `;
  
  const results = await queryIGDB('platforms', query, useCache);
  return results[0];
};

/**
 * Busca jogos por nome com detalhes expandidos
 * @param gameName Nome do jogo a ser buscado
 * @param limit Limite de resultados (padrão: 10)
 * @param useCache Se deve usar o cache (padrão: true)
 * @returns Lista de jogos encontrados com detalhes expandidos
 */
export const searchGamesDetailed = async (gameName: string, limit = 10, useCache = true): Promise<any[]> => {
  const query = `
    search "${gameName}";
    fields name, cover.url, cover.image_id, first_release_date, platforms.name, genres.name, 
    summary, storyline, rating, rating_count, aggregated_rating, 
    aggregated_rating_count, total_rating, total_rating_count,
    involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
    limit ${limit};
  `;
  
  return await queryIGDB('games', query, useCache);
};

/**
 * Busca plataformas/consoles por nome com detalhes expandidos
 * @param platformName Nome da plataforma a ser buscada
 * @param limit Limite de resultados (padrão: 10)
 * @param useCache Se deve usar o cache (padrão: true)
 * @returns Lista de plataformas encontradas com detalhes expandidos
 */
export const searchPlatformsDetailed = async (platformName: string, limit = 10, useCache = true): Promise<any[]> => {
  const query = `
    search "${platformName}";
    fields name, platform_logo.url, platform_logo.image_id, summary, generation, 
    platform_family.name, category, versions.name;
    limit ${limit};
  `;
  
  return await queryIGDB('platforms', query, useCache);
};

/**
 * Busca plataformas/consoles por nome
 * @param platformName Nome da plataforma a ser buscada
 * @param limit Limite de resultados (padrão: 10)
 * @param useCache Se deve usar o cache (padrão: true)
 * @returns Lista de plataformas encontradas
 */
export const searchPlatforms = async (platformName: string, limit = 10, useCache = true): Promise<any[]> => {
  const query = `
    search "${platformName}";
    fields name, platform_logo.url, platform_logo.image_id, summary, generation, platform_family.name;
    limit ${limit};
  `;
  
  return await queryIGDB('platforms', query, useCache);
};

/**
 * Formata a URL de uma imagem da IGDB
 * @param imageId ID da imagem
 * @param size Tamanho da imagem (padrão: cover_big)
 * @returns URL completa da imagem
 */
export const formatImageUrl = (imageId: string, size: keyof typeof igdbConfig.imageSizes = 'coverBig'): string => {
  if (!imageId) return '';
  
  const sizeValue = igdbConfig.imageSizes[size];
  return `${igdbConfig.imageUrl}/${sizeValue}/${imageId}.jpg`;
};

/**
 * Busca informações sobre empresas (desenvolvedoras/publicadoras)
 * @param companyName Nome da empresa a ser buscada
 * @param limit Limite de resultados (padrão: 10)
 * @param useCache Se deve usar o cache (padrão: true)
 * @returns Lista de empresas encontradas
 */
export const searchCompanies = async (companyName: string, limit = 10, useCache = true): Promise<any[]> => {
  const query = `
    search "${companyName}";
    fields name, logo.url, logo.image_id, description, country, start_date, developed.name, published.name;
    limit ${limit};
  `;
  
  return await queryIGDB('companies', query, useCache);
}; 