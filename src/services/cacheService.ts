import AsyncStorage from '@react-native-async-storage/async-storage';

// Prefixo para as chaves de cache
const CACHE_PREFIX = '@GameManager:igdb_cache_';

// Tempo padrão de expiração do cache (24 horas em milissegundos)
const DEFAULT_EXPIRY = 24 * 60 * 60 * 1000;

// Interface para os itens armazenados no cache
interface CacheItem<T> {
  data: T;
  expiry: number;
}

/**
 * Armazena dados no cache
 * @param key Chave para identificar os dados
 * @param data Dados a serem armazenados
 * @param expiryMs Tempo de expiração em milissegundos (padrão: 24 horas)
 */
export const cacheData = async <T>(key: string, data: T, expiryMs = DEFAULT_EXPIRY): Promise<void> => {
  const cacheItem: CacheItem<T> = {
    data,
    expiry: Date.now() + expiryMs
  };
  
  await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheItem));
  console.log(`Dados armazenados em cache: ${key}`);
};

/**
 * Recupera dados do cache
 * @param key Chave dos dados a serem recuperados
 * @returns Dados armazenados ou null se não existirem ou estiverem expirados
 */
export const getCachedData = async <T>(key: string): Promise<T | null> => {
  try {
    const cachedItem = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    
    if (!cachedItem) {
      console.log(`Cache não encontrado: ${key}`);
      return null;
    }
    
    const { data, expiry } = JSON.parse(cachedItem) as CacheItem<T>;
    
    // Verificar se o cache expirou
    if (Date.now() > expiry) {
      console.log(`Cache expirado: ${key}`);
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    
    console.log(`Dados recuperados do cache: ${key}`);
    return data;
  } catch (error) {
    console.error(`Erro ao recuperar dados do cache (${key}):`, error);
    return null;
  }
};

/**
 * Remove um item específico do cache
 * @param key Chave do item a ser removido
 */
export const removeCachedItem = async (key: string): Promise<void> => {
  await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
  console.log(`Item removido do cache: ${key}`);
};

/**
 * Limpa todo o cache relacionado à IGDB
 */
export const clearIGDBCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const igdbKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    
    if (igdbKeys.length > 0) {
      await AsyncStorage.multiRemove(igdbKeys);
      console.log(`Cache IGDB limpo: ${igdbKeys.length} itens removidos`);
    } else {
      console.log('Nenhum item de cache IGDB encontrado');
    }
  } catch (error) {
    console.error('Erro ao limpar cache IGDB:', error);
  }
}; 