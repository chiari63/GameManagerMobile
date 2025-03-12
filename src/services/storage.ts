import AsyncStorage from '@react-native-async-storage/async-storage';
import { Game, Console, Accessory, WishlistItem, StorageData } from '../types';

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
    console.error('Erro ao inicializar armazenamento:', error);
  }
};

// Função para obter todos os dados do armazenamento
export const getStorageData = async (): Promise<StorageData> => {
  console.log('[Storage] Tentando obter dados do armazenamento');
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) {
      console.log('[Storage] Nenhum dado encontrado, inicializando armazenamento');
      await initializeStorage();
      return { games: [], consoles: [], accessories: [], wishlist: [] };
    }
    console.log('[Storage] Dados obtidos com sucesso');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Storage] Erro crítico ao obter dados:', error);
    throw new Error('Falha ao acessar o armazenamento local');
  }
};

// Função para salvar todos os dados no armazenamento
export const saveStorageData = async (data: StorageData): Promise<void> => {
  console.log('[Storage] Tentando salvar dados no armazenamento');
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('[Storage] Dados salvos com sucesso');
  } catch (error) {
    console.error('[Storage] Erro crítico ao salvar dados:', error);
    throw new Error('Falha ao salvar no armazenamento local');
  }
};

// Funções para jogos
export const getGames = async (): Promise<Game[]> => {
  const data = await getStorageData();
  return data.games || [];
};

export const addGame = async (gameData: Omit<Game, 'id'>): Promise<Game> => {
  const data = await getStorageData();
  const newGame = { ...gameData, id: generateId() };
  data.games.push(newGame);
  await saveStorageData(data);
  return newGame;
};

export const updateGame = async (id: string, gameData: Partial<Game>): Promise<void> => {
  const data = await getStorageData();
  data.games = data.games.map(game => 
    game.id === id ? { ...game, ...gameData } : game
  );
  await saveStorageData(data);
};

export const deleteGame = async (id: string): Promise<void> => {
  const data = await getStorageData();
  data.games = data.games.filter(game => game.id !== id);
  await saveStorageData(data);
};

// Funções para consoles
export const getConsoles = async (): Promise<Console[]> => {
  const data = await getStorageData();
  return data.consoles || [];
};

export const addConsole = async (consoleData: Omit<Console, 'id'>): Promise<Console> => {
  const data = await getStorageData();
  const newConsole = { ...consoleData, id: generateId() };
  data.consoles.push(newConsole);
  await saveStorageData(data);
  return newConsole;
};

export const updateConsole = async (id: string, consoleData: Partial<Console>): Promise<void> => {
  const data = await getStorageData();
  data.consoles = data.consoles.map(console => 
    console.id === id ? { ...console, ...consoleData } : console
  );
  await saveStorageData(data);
};

export const deleteConsole = async (id: string): Promise<void> => {
  const data = await getStorageData();
  data.consoles = data.consoles.filter(console => console.id !== id);
  await saveStorageData(data);
};

// Funções para acessórios
export const getAccessories = async (): Promise<Accessory[]> => {
  const data = await getStorageData();
  return data.accessories || [];
};

export const addAccessory = async (accessoryData: Omit<Accessory, 'id'>): Promise<Accessory> => {
  const data = await getStorageData();
  const newAccessory = { ...accessoryData, id: generateId() };
  data.accessories.push(newAccessory);
  await saveStorageData(data);
  return newAccessory;
};

export const updateAccessory = async (id: string, accessoryData: Partial<Accessory>): Promise<void> => {
  const data = await getStorageData();
  data.accessories = data.accessories.map(accessory => 
    accessory.id === id ? { ...accessory, ...accessoryData } : accessory
  );
  await saveStorageData(data);
};

export const deleteAccessory = async (id: string): Promise<void> => {
  const data = await getStorageData();
  data.accessories = data.accessories.filter(accessory => accessory.id !== id);
  await saveStorageData(data);
};

// Funções para lista de desejos
export const getWishlistItems = async (): Promise<WishlistItem[]> => {
  const data = await getStorageData();
  return data.wishlist || [];
};

export const addWishlistItem = async (itemData: Omit<WishlistItem, 'id'>): Promise<WishlistItem> => {
  const data = await getStorageData();
  const newItem = { ...itemData, id: generateId() };
  data.wishlist.push(newItem);
  await saveStorageData(data);
  return newItem;
};

export const updateWishlistItem = async (id: string, itemData: Partial<WishlistItem>): Promise<void> => {
  const data = await getStorageData();
  data.wishlist = data.wishlist.map(item => 
    item.id === id ? { ...item, ...itemData } : item
  );
  await saveStorageData(data);
};

export const deleteWishlistItem = async (id: string): Promise<void> => {
  const data = await getStorageData();
  data.wishlist = data.wishlist.filter(item => item.id !== id);
  await saveStorageData(data);
}; 