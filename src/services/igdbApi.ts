import axios from 'axios';
import { getIGDBToken, clearIGDBToken, getIGDBCredentials } from './igdbAuth';
import { igdbConfig } from '../config/igdbConfig';
import { cacheData, getCachedData } from './cacheService';
import { STORAGE_KEYS } from '../constants/storage';
import { appLog } from '../config/environment';

export type IGDBErrorKind = 'configuration' | 'authentication' | 'network' | 'api' | 'validation';

export class IGDBError extends Error {
  constructor(
    public readonly kind: IGDBErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'IGDBError';
  }
}

export interface IGDBImage {
  image_id?: string;
  url?: string;
}

export interface IGDBGame {
  id: number;
  name: string;
  cover?: IGDBImage;
  first_release_date?: number;
  platforms?: Array<{ name: string }>;
  genres?: Array<{ name: string }>;
  summary?: string;
  [key: string]: unknown;
}

export interface IGDBPlatform {
  id: number;
  name: string;
  platform_logo?: IGDBImage & { name?: string };
  platform_family?: { name: string };
  summary?: string;
  [key: string]: unknown;
}

const MAX_SEARCH_LIMIT = 50;
const DEFAULT_SEARCH_LIMIT = 10;

const encodeToBase64 = (value: string): string => {
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch {
    return value.split('').reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0).toString(36);
  }
};

const clampLimit = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_SEARCH_LIMIT;
  return Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.floor(value)));
};

const escapeSearchTerm = (value: string): string =>
  value.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]/g, ' ');

const isPositiveInteger = (value: number): boolean =>
  Number.isFinite(value) && Number.isInteger(value) && value > 0;

const toIGDBError = (error: unknown): IGDBError => {
  if (error instanceof IGDBError) return error;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return new IGDBError('authentication', 'A autenticação com a API IGDB falhou.', status);
    }
    if (status) {
      return new IGDBError('api', `A API IGDB retornou o status ${status}.`, status);
    }
    return new IGDBError('network', 'Não foi possível conectar à API IGDB.');
  }

  return new IGDBError('network', 'Não foi possível conectar à API IGDB.');
};

export const checkIGDBConnection = async (): Promise<{ connected: boolean; message: string }> => {
  try {
    const credentials = await getIGDBCredentials();
    const clientId = credentials.clientId || igdbConfig.clientId;
    if (!clientId) {
      return { connected: false, message: 'Credenciais da API IGDB não configuradas' };
    }

    const token = await getIGDBToken();
    if (!token) {
      return { connected: false, message: 'Não foi possível obter um token de acesso IGDB' };
    }

    const response = await axios({
      url: `${igdbConfig.apiUrl}/platforms`,
      method: 'POST',
      headers: { Accept: 'application/json', 'Client-ID': clientId, Authorization: `Bearer ${token}` },
      data: 'fields name; limit 1;',
    });

    return response.status === 200
      ? { connected: true, message: 'API IGDB conectada com sucesso' }
      : { connected: false, message: `API IGDB retornou status ${response.status}` };
  } catch (error) {
    const igdbError = toIGDBError(error);
    appLog.error('Erro ao verificar conexão com a API IGDB:', igdbError);
    return { connected: false, message: igdbError.message };
  }
};

/** Executes an IGDB query. Empty arrays are valid results; failures reject with IGDBError. */
export const queryIGDB = async <T = unknown>(
  endpoint: string,
  query: string,
  useCache = true,
): Promise<T[]> => {
  if (!endpoint.trim() || !query.trim()) {
    throw new IGDBError('validation', 'Endpoint e consulta IGDB são obrigatórios.');
  }

  const cacheKey = `${STORAGE_KEYS.API_CACHE_PREFIX}${endpoint}_${encodeToBase64(query)}`;
  if (useCache) {
    const cachedData = await getCachedData<T[]>(cacheKey);
    if (cachedData !== null && cachedData !== undefined) return cachedData;
  }

  try {
    const credentials = await getIGDBCredentials();
    const clientId = credentials.clientId || igdbConfig.clientId;
    if (!clientId) {
      throw new IGDBError('configuration', 'Credenciais da API IGDB não configuradas.');
    }

    const token = await getIGDBToken();
    if (!token) {
      throw new IGDBError('authentication', 'Não foi possível obter o token de autenticação IGDB.');
    }

    const response = await axios({
      url: `${igdbConfig.apiUrl}/${endpoint}`,
      method: 'POST',
      headers: { Accept: 'application/json', 'Client-ID': clientId, Authorization: `Bearer ${token}` },
      data: query,
    });

    if (!Array.isArray(response.data)) {
      throw new IGDBError('api', 'A API IGDB retornou uma resposta inválida.', response.status);
    }

    if (useCache) await cacheData(cacheKey, response.data);
    return response.data as T[];
  } catch (error) {
    const igdbError = toIGDBError(error);
    if (igdbError.kind === 'authentication') await clearIGDBToken();
    appLog.error(`Erro na consulta IGDB (${endpoint}):`, igdbError);
    throw igdbError;
  }
};

const gameFields = 'name, cover.url, cover.image_id, first_release_date, platforms.name, genres.name, summary';
const gameDetailFields = `${gameFields}, storyline, rating, rating_count, aggregated_rating, aggregated_rating_count, total_rating, total_rating_count, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, screenshots.image_id, videos.video_id, similar_games.name, similar_games.cover.image_id, game_modes.name, player_perspectives.name, themes.name, age_ratings.rating, age_ratings.category, websites.url, websites.category`;
const platformFields = 'name, platform_logo.url, platform_logo.image_id, summary, generation, platform_family.name';

export const searchGames = async (gameName: string, limit = DEFAULT_SEARCH_LIMIT, useCache = true): Promise<IGDBGame[]> => {
  const term = escapeSearchTerm(gameName);
  if (!term) return [];
  return queryIGDB<IGDBGame>('games', `search "${term}"; fields ${gameFields}; limit ${clampLimit(limit)};`, useCache);
};

export const getGameDetails = async (gameId: number, useCache = true): Promise<IGDBGame | null> => {
  if (!isPositiveInteger(gameId)) return null;
  const results = await queryIGDB<IGDBGame>('games', `fields ${gameDetailFields}; where id = ${gameId};`, useCache);
  return results[0] ?? null;
};

export const getPlatformDetails = async (platformId: number, useCache = true): Promise<IGDBPlatform | null> => {
  if (!isPositiveInteger(platformId)) return null;
  const results = await queryIGDB<IGDBPlatform>(
    'platforms',
    `fields ${platformFields}, category, versions.name, versions.platform_version_release_dates.date, versions.platform_version_release_dates.region, versions.summary, websites.url, websites.category; where id = ${platformId};`,
    useCache,
  );
  return results[0] ?? null;
};

export const searchGamesDetailed = async (gameName: string, limit = DEFAULT_SEARCH_LIMIT, useCache = true): Promise<IGDBGame[]> => {
  const term = escapeSearchTerm(gameName);
  if (!term) return [];
  return queryIGDB<IGDBGame>('games', `search "${term}"; fields ${gameDetailFields}; limit ${clampLimit(limit)};`, useCache);
};

export const searchPlatforms = async (platformName: string, limit = DEFAULT_SEARCH_LIMIT, useCache = true): Promise<IGDBPlatform[]> => {
  const term = escapeSearchTerm(platformName);
  if (!term) return [];
  return queryIGDB<IGDBPlatform>('platforms', `search "${term}"; fields ${platformFields}; limit ${clampLimit(limit)};`, useCache);
};

export const searchPlatformsDetailed = async (platformName: string, limit = DEFAULT_SEARCH_LIMIT, useCache = true): Promise<IGDBPlatform[]> =>
  searchPlatforms(platformName, limit, useCache);

export const formatImageUrl = (imageId: string, size: keyof typeof igdbConfig.imageSizes = 'coverBig'): string => {
  if (!imageId) return '';
  return `${igdbConfig.imageUrl}/${igdbConfig.imageSizes[size]}/${imageId}.jpg`;
};

export const searchCompanies = async (companyName: string, limit = DEFAULT_SEARCH_LIMIT, useCache = true): Promise<Array<{ id: number; name: string }>> => {
  const term = escapeSearchTerm(companyName);
  if (!term) return [];
  return queryIGDB('companies', `search "${term}"; fields name, logo.url, logo.image_id, description, country, start_date, developed.name, published.name; limit ${clampLimit(limit)};`, useCache);
};
