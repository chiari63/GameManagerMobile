import AsyncStorage from '@react-native-async-storage/async-storage';
import { Game, Console, Accessory, WishlistItem, StorageData } from '../types';
import {
  calculateNextMaintenanceDate,
  cancelMaintenanceNotification,
  clearMaintenanceItemsCache,
  scheduleMaintenanceNotification,
} from './notifications';
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
let writeQueue: Promise<void> = Promise.resolve();

const emptyStorageData = (): StorageData => ({ games: [], consoles: [], accessories: [], wishlist: [] });

const enqueueStorageWrite = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = writeQueue.then(operation, operation);
  // Preserve serialization after failures without surfacing an unhandled rejected queue.
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
};

/** Serializa toda mutação read-modify-write contra o snapshot mais recente no disco. */
const mutateStorageData = <T>(mutation: (data: StorageData) => { data: StorageData; result: T }): Promise<T> =>
  enqueueStorageWrite(async () => {
    const serialized = await AsyncStorage.getItem(STORAGE_KEY);
    const currentData: StorageData = serialized ? JSON.parse(serialized) : emptyStorageData();
    const next = mutation(currentData);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next.data));
    memoryCache = next.data;
    clearMaintenanceItemsCache();
    appEvents.emit(APP_EVENTS.DATA_CHANGED);
    return next.result;
  });

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
  try {
    await enqueueStorageWrite(async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      memoryCache = data;
      clearMaintenanceItemsCache();
      appEvents.emit(APP_EVENTS.DATA_CHANGED);
    });
    appLog.debug('[Storage] Dados persistidos com sucesso');
  } catch (error) {
    appLog.error('[Storage] Erro crítico ao salvar dados:', error);
    throw new Error('Falha ao salvar no armazenamento local');
  }
};

export const restoreStorageData = async (
  restore: StorageData | (() => Promise<StorageData>),
): Promise<void> => {
  await enqueueStorageWrite(async () => {
    const data = typeof restore === 'function' ? await restore() : restore;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    memoryCache = data;
    clearMaintenanceItemsCache();
    appEvents.emit(APP_EVENTS.DATA_CHANGED);
  });
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

  const newGame = { ...gameData, id: generateId() };
  return mutateStorageData((data) => ({
    data: { ...data, games: [...(data.games || []), newGame] },
    result: newGame,
  }));
};

export const updateGame = async (id: string, gameData: Partial<Game>): Promise<void> => {
  await mutateStorageData((data) => ({
    data: { ...data, games: (data.games || []).map(game => game.id === id ? { ...game, ...gameData } : game) },
    result: undefined,
  }));
};

export const deleteGame = async (id: string): Promise<void> => {
  await mutateStorageData((data) => ({
    data: { ...data, games: (data.games || []).filter(game => game.id !== id) },
    result: undefined,
  }));
};

// Funções para consoles
export const getConsoles = async (): Promise<Console[]> => {
  const data = await getStorageData();
  return data.consoles ? [...data.consoles] : [];
};

export const addConsole = async (consoleData: Omit<Console, 'id'>): Promise<Console> => {
  if (!consoleData.name || consoleData.name.trim() === '') throw new Error('Nome do console é obrigatório');
  const nextMaintenanceDate = consoleData.lastMaintenanceDate && consoleData.maintenanceInterval
    ? calculateNextMaintenanceDate(consoleData.lastMaintenanceDate, consoleData.maintenanceInterval)
    : undefined;
  const newConsole = { ...consoleData, id: generateId(), nextMaintenanceDate };
  await mutateStorageData((data) => ({
    data: { ...data, consoles: [...(data.consoles || []), newConsole] },
    result: undefined,
  }));
  if (newConsole.notifyMaintenance && newConsole.nextMaintenanceDate) {
    await scheduleMaintenanceNotification(newConsole.id, newConsole.name, 'console', newConsole.nextMaintenanceDate);
  }
  return newConsole;
};

export const updateConsole = async (id: string, consoleData: Partial<Console>): Promise<void> => {
  const updatedConsole = await mutateStorageData((data) => {
    const current = (data.consoles || []).find(item => item.id === id);
    if (!current) throw new Error('Console não encontrado');
    const maintenanceChanged = Object.prototype.hasOwnProperty.call(consoleData, 'lastMaintenanceDate') || Object.prototype.hasOwnProperty.call(consoleData, 'maintenanceInterval');
    const nextMaintenanceDate = maintenanceChanged
      ? calculateNextMaintenanceDate(consoleData.lastMaintenanceDate ?? current.lastMaintenanceDate, consoleData.maintenanceInterval ?? current.maintenanceInterval)
      : Object.prototype.hasOwnProperty.call(consoleData, 'nextMaintenanceDate') ? consoleData.nextMaintenanceDate : current.nextMaintenanceDate;
    const updated = { ...current, ...consoleData, nextMaintenanceDate };
    return {
      data: { ...data, consoles: (data.consoles || []).map(item => item.id === id ? updated : item) },
      result: updated,
    };
  });
  if (updatedConsole.notifyMaintenance && updatedConsole.nextMaintenanceDate) {
    await scheduleMaintenanceNotification(updatedConsole.id, updatedConsole.name, 'console', updatedConsole.nextMaintenanceDate);
  } else {
    await cancelMaintenanceNotification(id);
  }
};

export const deleteConsole = async (id: string): Promise<void> => {
  await mutateStorageData((data) => ({
    data: { ...data, consoles: (data.consoles || []).filter(item => item.id !== id) },
    result: undefined,
  }));
  await cancelMaintenanceNotification(id);
};

// Funções para acessórios
export const getAccessories = async (): Promise<Accessory[]> => {
  const data = await getStorageData();
  return data.accessories ? [...data.accessories] : [];
};

export const addAccessory = async (accessoryData: Omit<Accessory, 'id'>): Promise<Accessory> => {
  if (!accessoryData.name || accessoryData.name.trim() === '') throw new Error('Nome do acessório é obrigatório');
  const nextMaintenanceDate = accessoryData.lastMaintenanceDate && accessoryData.maintenanceInterval
    ? calculateNextMaintenanceDate(accessoryData.lastMaintenanceDate, accessoryData.maintenanceInterval)
    : undefined;
  const newAccessory = { ...accessoryData, id: generateId(), nextMaintenanceDate };
  await mutateStorageData((data) => ({
    data: { ...data, accessories: [...(data.accessories || []), newAccessory] },
    result: undefined,
  }));
  if (newAccessory.notifyMaintenance && newAccessory.nextMaintenanceDate) {
    await scheduleMaintenanceNotification(newAccessory.id, newAccessory.name, 'accessory', newAccessory.nextMaintenanceDate);
  }
  return newAccessory;
};

export const updateAccessory = async (id: string, accessoryData: Partial<Accessory>): Promise<void> => {
  const updatedAccessory = await mutateStorageData((data) => {
    const current = (data.accessories || []).find(item => item.id === id);
    if (!current) throw new Error('Acessório não encontrado');
    const maintenanceChanged = Object.prototype.hasOwnProperty.call(accessoryData, 'lastMaintenanceDate') || Object.prototype.hasOwnProperty.call(accessoryData, 'maintenanceInterval');
    const nextMaintenanceDate = maintenanceChanged
      ? calculateNextMaintenanceDate(accessoryData.lastMaintenanceDate ?? current.lastMaintenanceDate, accessoryData.maintenanceInterval ?? current.maintenanceInterval)
      : Object.prototype.hasOwnProperty.call(accessoryData, 'nextMaintenanceDate') ? accessoryData.nextMaintenanceDate : current.nextMaintenanceDate;
    const updated = { ...current, ...accessoryData, nextMaintenanceDate };
    return {
      data: { ...data, accessories: (data.accessories || []).map(item => item.id === id ? updated : item) },
      result: updated,
    };
  });
  if (updatedAccessory.notifyMaintenance && updatedAccessory.nextMaintenanceDate) {
    await scheduleMaintenanceNotification(updatedAccessory.id, updatedAccessory.name, 'accessory', updatedAccessory.nextMaintenanceDate);
  } else {
    await cancelMaintenanceNotification(id);
  }
};

export const deleteAccessory = async (id: string): Promise<void> => {
  await mutateStorageData((data) => ({
    data: { ...data, accessories: (data.accessories || []).filter(item => item.id !== id) },
    result: undefined,
  }));
  await cancelMaintenanceNotification(id);
};

// Funções para lista de desejos
export const getWishlistItems = async (): Promise<WishlistItem[]> => {
  const data = await getStorageData();
  return data.wishlist ? [...data.wishlist] : [];
};

export const addWishlistItem = async (itemData: Omit<WishlistItem, 'id'>): Promise<WishlistItem> => {
  const newItem = { ...itemData, id: generateId() };
  return mutateStorageData((data) => ({
    data: { ...data, wishlist: [...(data.wishlist || []), newItem] },
    result: newItem,
  }));
};

export const updateWishlistItem = async (id: string, itemData: Partial<WishlistItem>): Promise<void> => {
  await mutateStorageData((data) => ({
    data: { ...data, wishlist: (data.wishlist || []).map(item => item.id === id ? { ...item, ...itemData } : item) },
    result: undefined,
  }));
};

export const deleteWishlistItem = async (id: string): Promise<void> => {
  await mutateStorageData((data) => ({
    data: { ...data, wishlist: (data.wishlist || []).filter(item => item.id !== id) },
    result: undefined,
  }));
};

/**
 * Limpa todos os dados do armazenamento (coleção completa)
 */
export const clearAllData = async (): Promise<void> => {
  try {
    const removedIds = await mutateStorageData((data) => ({
      data: emptyStorageData(),
      result: [...(data.consoles || []), ...(data.accessories || [])].map(item => item.id),
    }));
    await Promise.all(removedIds.map(cancelMaintenanceNotification));
    appLog.debug('[Storage] Coleção limpa com sucesso');
  } catch (error) {
    appLog.error('[Storage] Erro ao limpar todos os dados:', error);
    throw new Error('Falha ao limpar a coleção');
  }
};