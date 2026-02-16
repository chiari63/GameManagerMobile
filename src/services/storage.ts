import AsyncStorage from '@react-native-async-storage/async-storage';
import { Game, Console, Accessory, WishlistItem, StorageData } from '../types';
import { calculateNextMaintenanceDate, scheduleMaintenanceNotification } from './notifications';
import { appLog } from '../config/environment';
import { appEvents, APP_EVENTS } from './events';

// Função para gerar ID único
const generateId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
};

// Chave para armazenar os dados no AsyncStorage
const STORAGE_KEY = '@GameManager:data';

// Função para inicializar o armazenamento com dados vazios
export const initializeStorage = async (): Promise<void> => {
  const emptyData: StorageData = {
    games: [],
    consoles: [],
    accessories: [],
    wishlist: []
  };

  try {
    const existingData = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existingData) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(emptyData));
    }
  } catch (error) {
    appLog.error('Erro ao inicializar armazenamento:', error);
  }
};

// Cache em memória para evitar leituras repetidas do disco
let memoryCache: StorageData | null = null;

// Função para limpar o cache (útil para reload forçado)
export const clearMemoryCache = () => {
  memoryCache = null;
};

// Função para obter todos os dados do armazenamento
export const getStorageData = async (): Promise<StorageData> => {
  // Se temos dados em cache, retorna eles imediatamente
  if (memoryCache) {
    return memoryCache;
  }

  appLog.debug('[Storage] Cache vazio, lendo do disco...');
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) {
      appLog.debug('[Storage] Nenhum dado encontrado, inicializando armazenamento');
      await initializeStorage();
      memoryCache = { games: [], consoles: [], accessories: [], wishlist: [] };
      return memoryCache;
    }

    memoryCache = JSON.parse(data);
    appLog.debug('[Storage] Dados carregados para o cache');
    return memoryCache!;
  } catch (error) {
    appLog.error('[Storage] Erro crítico ao obter dados:', error);
    throw new Error('Falha ao acessar o armazenamento local');
  }
};

// Função para salvar todos os dados no armazenamento
export const saveStorageData = async (data: StorageData): Promise<void> => {
  // Atualiza cache imediatamente
  memoryCache = data;

  // Persiste no disco
  // Nota: Em uma aplicação maior, poderíamos usar debounce aqui
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    appLog.debug('[Storage] Dados persistidos com sucesso');

    // Notifica que os dados mudaram
    appEvents.emit(APP_EVENTS.DATA_CHANGED);
  } catch (error) {
    appLog.error('[Storage] Erro crítico ao salvar dados:', error);
    throw new Error('Falha ao salvar no armazenamento local');
  }
};

// Funções para jogos
export const getGames = async (): Promise<Game[]> => {
  const data = await getStorageData();
  return data.games ? [...data.games] : [];
};

export const addGame = async (gameData: Omit<Game, 'id'>): Promise<Game> => {
  if (!gameData.name || gameData.name.trim() === '') {
    throw new Error('Nome do jogo é obrigatório');
  }
  const data = await getStorageData();
  const newGame = { ...gameData, id: generateId() };

  const updatedData = {
    ...data,
    games: [...(data.games || []), newGame]
  };

  await saveStorageData(updatedData);
  return newGame;
};

export const updateGame = async (id: string, gameData: Partial<Game>): Promise<void> => {
  const data = await getStorageData();
  const updatedData = {
    ...data,
    games: (data.games || []).map(game =>
      game.id === id ? { ...game, ...gameData } : game
    )
  };
  await saveStorageData(updatedData);
};

export const deleteGame = async (id: string): Promise<void> => {
  const data = await getStorageData();
  const updatedData = {
    ...data,
    games: (data.games || []).filter(game => game.id !== id)
  };
  await saveStorageData(updatedData);
};

// Funções para consoles
export const getConsoles = async (): Promise<Console[]> => {
  const data = await getStorageData();
  return data.consoles ? [...data.consoles] : [];
};

export const addConsole = async (consoleData: Omit<Console, 'id'>): Promise<Console> => {
  if (!consoleData.name || consoleData.name.trim() === '') {
    throw new Error('Nome do console é obrigatório');
  }
  const data = await getStorageData();

  // Calcular próxima data de manutenção se aplicável
  let nextMaintenanceDate = undefined;
  if (consoleData.lastMaintenanceDate && consoleData.maintenanceInterval) {
    nextMaintenanceDate = calculateNextMaintenanceDate(
      consoleData.lastMaintenanceDate,
      consoleData.maintenanceInterval
    );
  }

  const newConsole = {
    ...consoleData,
    id: generateId(),
    nextMaintenanceDate
  };

  const updatedData = {
    ...data,
    consoles: [...(data.consoles || []), newConsole]
  };

  await saveStorageData(updatedData);

  // Agendar notificação se necessário
  if (newConsole.notifyMaintenance && newConsole.nextMaintenanceDate) {
    await scheduleMaintenanceNotification(
      newConsole.id,
      newConsole.name,
      'console',
      newConsole.nextMaintenanceDate
    );
  }

  return newConsole;
};

export const updateConsole = async (id: string, consoleData: Partial<Console>): Promise<void> => {
  const data = await getStorageData();

  // Encontrar o console atual
  const currentConsole = data.consoles.find(consoleItem => consoleItem.id === id);
  if (!currentConsole) {
    throw new Error('Console não encontrado');
  }

  // Verificar se precisamos recalcular a próxima data de manutenção
  let nextMaintenanceDate = currentConsole.nextMaintenanceDate;
  const shouldRecalculate =
    (consoleData.lastMaintenanceDate && consoleData.lastMaintenanceDate !== currentConsole.lastMaintenanceDate) ||
    (consoleData.maintenanceInterval && consoleData.maintenanceInterval !== currentConsole.maintenanceInterval);

  if (shouldRecalculate) {
    const lastMaintenanceDate = consoleData.lastMaintenanceDate || currentConsole.lastMaintenanceDate;
    const maintenanceInterval = consoleData.maintenanceInterval || currentConsole.maintenanceInterval;

    if (lastMaintenanceDate && maintenanceInterval) {
      nextMaintenanceDate = calculateNextMaintenanceDate(lastMaintenanceDate, maintenanceInterval);
    }
  }

  // Atualizar o console
  const updatedConsole = {
    ...currentConsole,
    ...consoleData,
    nextMaintenanceDate
  };

  const updatedData = {
    ...data,
    consoles: (data.consoles || []).map(consoleItem =>
      consoleItem.id === id ? updatedConsole : consoleItem
    )
  };

  await saveStorageData(updatedData);

  // Atualizar notificação se necessário
  if (updatedConsole.notifyMaintenance && updatedConsole.nextMaintenanceDate) {
    await scheduleMaintenanceNotification(
      updatedConsole.id,
      updatedConsole.name,
      'console',
      updatedConsole.nextMaintenanceDate
    );
  }
};

export const deleteConsole = async (id: string): Promise<void> => {
  const data = await getStorageData();
  const updatedData = {
    ...data,
    consoles: (data.consoles || []).filter(consoleItem => consoleItem.id !== id)
  };
  await saveStorageData(updatedData);
};

// Funções para acessórios
export const getAccessories = async (): Promise<Accessory[]> => {
  const data = await getStorageData();
  return data.accessories ? [...data.accessories] : [];
};

export const addAccessory = async (accessoryData: Omit<Accessory, 'id'>): Promise<Accessory> => {
  if (!accessoryData.name || accessoryData.name.trim() === '') {
    throw new Error('Nome do acessório é obrigatório');
  }
  const data = await getStorageData();

  // Calcular próxima data de manutenção se aplicável
  let nextMaintenanceDate = undefined;
  if (accessoryData.lastMaintenanceDate && accessoryData.maintenanceInterval) {
    nextMaintenanceDate = calculateNextMaintenanceDate(
      accessoryData.lastMaintenanceDate,
      accessoryData.maintenanceInterval
    );
  }

  const newAccessory = {
    ...accessoryData,
    id: generateId(),
    nextMaintenanceDate
  };

  const updatedData = {
    ...data,
    accessories: [...(data.accessories || []), newAccessory]
  };

  await saveStorageData(updatedData);

  // Agendar notificação se necessário
  if (newAccessory.notifyMaintenance && newAccessory.nextMaintenanceDate) {
    await scheduleMaintenanceNotification(
      newAccessory.id,
      newAccessory.name,
      'accessory',
      newAccessory.nextMaintenanceDate
    );
  }

  return newAccessory;
};

export const updateAccessory = async (id: string, accessoryData: Partial<Accessory>): Promise<void> => {
  const data = await getStorageData();

  // Encontrar o acessório atual
  const currentAccessory = data.accessories.find(accessory => accessory.id === id);
  if (!currentAccessory) {
    throw new Error('Acessório não encontrado');
  }

  // Verificar se precisamos recalcular a próxima data de manutenção
  let nextMaintenanceDate = currentAccessory.nextMaintenanceDate;
  const shouldRecalculate =
    (accessoryData.lastMaintenanceDate && accessoryData.lastMaintenanceDate !== currentAccessory.lastMaintenanceDate) ||
    (accessoryData.maintenanceInterval && accessoryData.maintenanceInterval !== currentAccessory.maintenanceInterval);

  if (shouldRecalculate) {
    const lastMaintenanceDate = accessoryData.lastMaintenanceDate || currentAccessory.lastMaintenanceDate;
    const maintenanceInterval = accessoryData.maintenanceInterval || currentAccessory.maintenanceInterval;

    if (lastMaintenanceDate && maintenanceInterval) {
      nextMaintenanceDate = calculateNextMaintenanceDate(lastMaintenanceDate, maintenanceInterval);
    }
  }

  // Atualizar o acessório
  const updatedAccessory = {
    ...currentAccessory,
    ...accessoryData,
    nextMaintenanceDate
  };

  const updatedData = {
    ...data,
    accessories: (data.accessories || []).map(accessory =>
      accessory.id === id ? updatedAccessory : accessory
    )
  };

  await saveStorageData(updatedData);

  // Atualizar notificação se necessário
  if (updatedAccessory.notifyMaintenance && updatedAccessory.nextMaintenanceDate) {
    await scheduleMaintenanceNotification(
      updatedAccessory.id,
      updatedAccessory.name,
      'accessory',
      updatedAccessory.nextMaintenanceDate
    );
  }
};

export const deleteAccessory = async (id: string): Promise<void> => {
  const data = await getStorageData();
  const updatedData = {
    ...data,
    accessories: (data.accessories || []).filter(accessory => accessory.id !== id)
  };
  await saveStorageData(updatedData);
};

// Funções para lista de desejos
export const getWishlistItems = async (): Promise<WishlistItem[]> => {
  const data = await getStorageData();
  return data.wishlist ? [...data.wishlist] : [];
};

export const addWishlistItem = async (itemData: Omit<WishlistItem, 'id'>): Promise<WishlistItem> => {
  const data = await getStorageData();
  const newItem = { ...itemData, id: generateId() };
  const updatedData = {
    ...data,
    wishlist: [...(data.wishlist || []), newItem]
  };
  await saveStorageData(updatedData);
  return newItem;
};

export const updateWishlistItem = async (id: string, itemData: Partial<WishlistItem>): Promise<void> => {
  const data = await getStorageData();
  const updatedData = {
    ...data,
    wishlist: (data.wishlist || []).map(item =>
      item.id === id ? { ...item, ...itemData } : item
    )
  };
  await saveStorageData(updatedData);
};

export const deleteWishlistItem = async (id: string): Promise<void> => {
  const data = await getStorageData();
  const updatedData = {
    ...data,
    wishlist: (data.wishlist || []).filter(item => item.id !== id)
  };
  await saveStorageData(updatedData);
};

/**
 * Limpa todos os dados do armazenamento (coleção completa)
 */
export const clearAllData = async (): Promise<void> => {
  try {
    const emptyData: StorageData = {
      games: [],
      consoles: [],
      accessories: [],
      wishlist: []
    };

    // Limpar cache em memória
    memoryCache = emptyData;

    // Persistir dados vazios no disco
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(emptyData));
    appLog.debug('[Storage] Coleção limpa com sucesso');
  } catch (error) {
    appLog.error('[Storage] Erro ao limpar todos os dados:', error);
    throw new Error('Falha ao limpar a coleção');
  }
}; 