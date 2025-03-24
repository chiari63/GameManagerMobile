/**
 * Constantes para chaves de armazenamento no AsyncStorage
 */

// Prefixo para todas as chaves do AsyncStorage
const STORAGE_PREFIX = '@GameManager:';

// Chaves de armazenamento do IGDB
export const STORAGE_KEYS = {
  // Credenciais da API IGDB
  IGDB_CLIENT_ID: 'igdb_client_id',
  IGDB_CLIENT_SECRET: 'igdb_client_secret',
  
  // Token de acesso da API IGDB
  IGDB_ACCESS_TOKEN: 'igdb_access_token',
  IGDB_TOKEN_EXPIRY: 'igdb_token_expiry',
  
  // Preferências do usuário
  USER_PREFERENCES: `${STORAGE_PREFIX}user_preferences`,
  THEME_MODE: `${STORAGE_PREFIX}theme_mode`,
  
  // Cache da API
  API_CACHE_PREFIX: `${STORAGE_PREFIX}cache_`,
}; 