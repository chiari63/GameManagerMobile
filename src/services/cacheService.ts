import AsyncStorage from '@react-native-async-storage/async-storage';
import { appLog } from '../config/environment';

// Tempo padrão de expiração do cache (24 horas)
const DEFAULT_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

// Estrutura dos dados em cache
interface CacheItem<T> {
  data: T;
  expiry: number;
}

/**
 * Armazena dados em cache
 * @param key Chave para identificar os dados
 * @param data Dados a serem armazenados
 * @param expiryTime Tempo de expiração em milissegundos (padrão: 24 horas)
 */
export const cacheData = async <T>(key: string, data: T, expiryTime: number = DEFAULT_CACHE_EXPIRY): Promise<void> => {
  try {
    const expiry = Date.now() + expiryTime;
    const cacheItem: CacheItem<T> = { data, expiry };
    await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
    appLog.debug(`cacheData - Dados armazenados em cache com chave: ${key}`);
  } catch (error) {
    appLog.error(`cacheData - Erro ao armazenar dados em cache: ${error}`);
  }
};

/**
 * Obtém dados do cache, se estiverem válidos
 * @param key Chave dos dados
 * @returns Dados armazenados ou null se não existirem ou estiverem expirados
 */
export const getCachedData = async <T>(key: string): Promise<T | null> => {
  try {
    const cachedItemString = await AsyncStorage.getItem(key);
    
    if (!cachedItemString) {
      appLog.debug(`getCachedData - Nenhum dado em cache para a chave: ${key}`);
      return null;
    }
    
    const cachedItem: CacheItem<T> = JSON.parse(cachedItemString);
    const now = Date.now();
    
    if (now > cachedItem.expiry) {
      appLog.debug(`getCachedData - Dados em cache expirados para a chave: ${key}`);
      // Remover item expirado
      await AsyncStorage.removeItem(key);
      return null;
    }
    
    appLog.debug(`getCachedData - Dados em cache válidos encontrados para a chave: ${key}`);
    return cachedItem.data;
  } catch (error) {
    appLog.error(`getCachedData - Erro ao recuperar dados do cache: ${error}`);
    return null;
  }
};

/**
 * Limpa o cache para uma chave específica
 * @param key Chave do cache a ser limpo
 */
export const clearCache = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
    appLog.debug(`clearCache - Cache limpo para a chave: ${key}`);
  } catch (error) {
    appLog.error(`clearCache - Erro ao limpar cache: ${error}`);
  }
};

/**
 * Limpa todo o cache baseado em um padrão de chave
 * @param pattern Padrão de chave para limpar (ex: "games_*")
 */
export const clearCachePattern = async (pattern: string): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove = keys.filter(key => key.includes(pattern));
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      appLog.debug(`clearCachePattern - ${keysToRemove.length} itens removidos do cache para o padrão: ${pattern}`);
    } else {
      appLog.debug(`clearCachePattern - Nenhum item encontrado para o padrão: ${pattern}`);
    }
  } catch (error) {
    appLog.error(`clearCachePattern - Erro ao limpar cache por padrão: ${error}`);
  }
}; 