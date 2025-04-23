import { useState, useCallback } from 'react';
import { 
  searchGames, 
  searchPlatforms, 
  getGameDetails, 
  getPlatformDetails,
  checkIGDBConnection,
  searchGamesDetailed,
  searchPlatformsDetailed,
  formatImageUrl
} from '../services/igdbApi';
import { appLog } from '../config/environment';

/**
 * Hook personalizado para acesso à API IGDB com gerenciamento de estado
 */
export const useIGDB = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);

  /**
   * Verifica a conexão com a API IGDB
   */
  const checkConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await checkIGDBConnection();
      setConnectionStatus(result.connected);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      setConnectionStatus(false);
      return { connected: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Busca jogos por nome
   */
  const searchGamesByName = useCallback(async (name: string, limit = 10) => {
    if (!name.trim()) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const games = await searchGames(name, limit);
      return games;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar jogos';
      setError(errorMessage);
      appLog.error(`Erro na busca de jogos: ${errorMessage}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Busca jogos por nome com detalhes adicionais
   */
  const searchGamesWithDetails = useCallback(async (name: string, limit = 10) => {
    if (!name.trim()) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const games = await searchGamesDetailed(name, limit);
      return games;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar jogos';
      setError(errorMessage);
      appLog.error(`Erro na busca detalhada de jogos: ${errorMessage}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Busca plataformas/consoles por nome
   */
  const searchPlatformsByName = useCallback(async (name: string, limit = 10) => {
    if (!name.trim()) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const platforms = await searchPlatforms(name, limit);
      return platforms;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar plataformas';
      setError(errorMessage);
      appLog.error(`Erro na busca de plataformas: ${errorMessage}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Busca plataformas/consoles por nome com detalhes adicionais
   */
  const searchPlatformsWithDetails = useCallback(async (name: string, limit = 10) => {
    if (!name.trim()) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const platforms = await searchPlatformsDetailed(name, limit);
      return platforms;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar plataformas';
      setError(errorMessage);
      appLog.error(`Erro na busca detalhada de plataformas: ${errorMessage}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtém detalhes de um jogo específico
   */
  const getGameDetailsById = useCallback(async (gameId: number) => {
    if (!gameId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const game = await getGameDetails(gameId);
      return game;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao obter detalhes do jogo';
      setError(errorMessage);
      appLog.error(`Erro ao obter detalhes do jogo: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtém detalhes de uma plataforma específica
   */
  const getPlatformDetailsById = useCallback(async (platformId: number) => {
    if (!platformId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const platform = await getPlatformDetails(platformId);
      return platform;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao obter detalhes da plataforma';
      setError(errorMessage);
      appLog.error(`Erro ao obter detalhes da plataforma: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Formata URL de imagem da IGDB
   */
  const getImageUrl = useCallback((imageId: string, size?: keyof typeof import('../config/igdbConfig').igdbConfig.imageSizes) => {
    if (!imageId) return '';
    return formatImageUrl(imageId, size);
  }, []);

  /**
   * Limpa o erro atual
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Estado
    loading,
    error,
    connectionStatus,
    
    // Ações
    checkConnection,
    searchGamesByName,
    searchGamesWithDetails,
    searchPlatformsByName,
    searchPlatformsWithDetails,
    getGameDetailsById,
    getPlatformDetailsById,
    getImageUrl,
    clearError,
  };
}; 