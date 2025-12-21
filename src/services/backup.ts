import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConsoles, getGames, getAccessories, getWishlistItems } from './storage';
import { StorageData } from '../types';

// Implementação simplificada do EventEmitter
class EventEmitter {
  private listeners: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(...args));
  }
}

// Criando um emitter global para notificar as telas sobre a restauração
export const backupEventEmitter = new EventEmitter();
export const BACKUP_EVENTS = {
  RESTORE_COMPLETED: 'RESTORE_COMPLETED',
  DATA_CHANGED: 'DATA_CHANGED',
};

// Chave do AsyncStorage
const STORAGE_KEY = '@GameManager:data';

// Função para converter imagem em base64
const imageToBase64 = async (uri: string): Promise<string | undefined> => {
  try {
    if (!uri) return undefined;
    
    // Verificar se é uma URL remota
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      try {
        // Para URLs remotas, vamos pular a conversão para base64
        // e retornar undefined para evitar erros
        console.log('Pulando conversão de URL remota:', uri);
        return undefined;
      } catch (error) {
        console.error('Erro ao baixar imagem remota:', error);
        return undefined;
      }
    }
    
    // Para arquivos locais, continua com a leitura normal
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Erro ao converter imagem para base64:', error);
    return undefined;
  }
};

// Função para salvar imagem base64 no dispositivo
const base64ToImage = async (base64: string, itemId: string = 'default'): Promise<string> => {
  try {
    if (!FileSystem.documentDirectory) {
      throw new Error('Diretório de documentos não disponível');
    }
    // Usar o ID do item como parte do nome do arquivo para garantir unicidade
    const fileName = `${FileSystem.documentDirectory}${itemId}_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(fileName, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fileName;
  } catch (error) {
    console.error('Erro ao converter base64 para imagem:', error);
    throw error;
  }
};

// Função para processar imagens dos itens
const processItemsWithImages = async (items: any[]): Promise<any[]> => {
  const processedItems = [];
  
  for (const item of items) {
    if (item.imageUrl) {
      try {
        const base64Image = await imageToBase64(item.imageUrl);
        if (base64Image) {
          processedItems.push({
            ...item,
            imageBase64: base64Image,
            imageUrl: undefined // Removemos a URL original
          });
          continue;
        }
      } catch (error) {
        console.error(`Erro ao processar imagem para o item ${item.id}:`, error);
      }
    }
    // Se não tiver imagem ou ocorrer erro, adiciona o item sem modificações
    processedItems.push({ ...item, imageUrl: undefined });
  }
  
  return processedItems;
};

// Função para restaurar imagens dos itens
const restoreItemsWithImages = async (items: any[]): Promise<any[]> => {
  // Primeiro, limpar qualquer imagem antiga que possa estar no diretório
  try {
    if (!FileSystem.documentDirectory) {
      console.error('Diretório de documentos não disponível');
    } else {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
      const imageFiles = files.filter(file => file.endsWith('.jpg'));
      
      console.log(`Encontradas ${imageFiles.length} imagens antigas para limpar`);
      
      // Não vamos excluir as imagens antigas ainda, apenas registrar que existem
    }
  } catch (error) {
    console.error('Erro ao listar diretório de imagens:', error);
  }
  
  const restoredItems = [];
  
  for (const item of items) {
    // Verificar se o item tem uma imagem em base64 válida
    if (item.imageBase64 && typeof item.imageBase64 === 'string' && item.id) {
      try {
        // Passar o ID do item para garantir nomes de arquivo únicos
        const imageUrl = await base64ToImage(item.imageBase64, item.id);
        console.log(`Imagem restaurada para o item ${item.id}: ${imageUrl}`);
        restoredItems.push({
          ...item,
          imageUrl,
          imageBase64: undefined // Removemos o base64 após restaurar
        });
        continue;
      } catch (error) {
        console.error(`Erro ao restaurar imagem para o item ${item.id}:`, error);
      }
    }
    // Se não tiver imagem em base64 ou ocorrer erro, adiciona o item sem imagem
    restoredItems.push({ ...item, imageBase64: undefined, imageUrl: undefined });
  }
  
  return restoredItems;
};

export const createBackup = async () => {
  try {
    // Coleta todos os dados
    const [consoles, games, accessories, wishlist] = await Promise.all([
      getConsoles(),
      getGames(),
      getAccessories(),
      getWishlistItems(),
    ]);

    console.log('Dados coletados para backup:', {
      consoles: consoles.length,
      games: games.length,
      accessories: accessories.length,
      wishlist: wishlist.length
    });

    // Processa as imagens de cada coleção
    const [
      processedConsoles,
      processedGames,
      processedAccessories,
      processedWishlist
    ] = await Promise.all([
      processItemsWithImages(consoles),
      processItemsWithImages(games),
      processItemsWithImages(accessories),
      processItemsWithImages(wishlist)
    ]);

    // Cria o objeto de backup
    const backupData = {
      consoles: processedConsoles,
      games: processedGames,
      accessories: processedAccessories,
      wishlist: processedWishlist,
      timestamp: new Date().toISOString(),
      version: '1.2.0', // Atualizamos a versão para indicar suporte a imagens melhorado
    };

    // Converte para JSON
    const backupJson = JSON.stringify(backupData);

    // Cria o nome do arquivo com a data atual
    const date = new Date();
    const fileName = `gamemanager_backup_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.json`;

    // Cria o arquivo de backup
    if (!FileSystem.documentDirectory) {
      throw new Error('Diretório de documentos não disponível');
    }
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, backupJson);
    console.log('Arquivo de backup criado:', fileUri);

    // Compartilha o arquivo
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Salvar backup',
      UTI: 'public.json'
    });

    return true;
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    throw new Error('Não foi possível criar o backup');
  }
};

export const restoreBackup = async () => {
  try {
    // Seleciona o arquivo de backup
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true
    });

    if (result.canceled) {
      throw new Error('Seleção de arquivo cancelada');
    }

    if (!result.assets || result.assets.length === 0 || !result.assets[0].uri) {
      throw new Error('Arquivo de backup inválido ou não selecionado');
    }

    console.log('Arquivo de backup selecionado:', result.assets[0].uri);

    // Lê o conteúdo do arquivo
    const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const backupData = JSON.parse(fileContent);

    console.log('Dados do backup:', {
      consoles: backupData.consoles?.length || 0,
      games: backupData.games?.length || 0,
      accessories: backupData.accessories?.length || 0,
      wishlist: backupData.wishlist?.length || 0,
      version: backupData.version,
      timestamp: backupData.timestamp
    });

    // Valida a versão do backup
    if (!backupData.version || !backupData.timestamp) {
      throw new Error('Arquivo de backup inválido');
    }

    // Valida se todos os arrays necessários existem
    if (!Array.isArray(backupData.consoles) || 
        !Array.isArray(backupData.games) || 
        !Array.isArray(backupData.accessories) || 
        !Array.isArray(backupData.wishlist)) {
      throw new Error('Arquivo de backup com estrutura inválida');
    }

    // Restaura as imagens de cada coleção
    const [
      restoredConsoles,
      restoredGames,
      restoredAccessories,
      restoredWishlist
    ] = await Promise.all([
      restoreItemsWithImages(backupData.consoles),
      restoreItemsWithImages(backupData.games),
      restoreItemsWithImages(backupData.accessories),
      restoreItemsWithImages(backupData.wishlist)
    ]);

    // Prepara os dados para restauração
    const storageData: StorageData = {
      consoles: restoredConsoles,
      games: restoredGames,
      accessories: restoredAccessories,
      wishlist: restoredWishlist
    };

    // Restaura os dados usando a mesma chave do storage
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));

    // Verifica se os dados foram salvos corretamente
    const restoredData = await AsyncStorage.getItem(STORAGE_KEY);
    const parsedData = JSON.parse(restoredData || '{"consoles":[],"games":[],"accessories":[],"wishlist":[]}');

    console.log('Dados restaurados:', {
      consoles: parsedData.consoles.length,
      games: parsedData.games.length,
      accessories: parsedData.accessories.length,
      wishlist: parsedData.wishlist.length
    });

    // Emite o evento de restauração completa
    backupEventEmitter.emit(BACKUP_EVENTS.RESTORE_COMPLETED);
    console.log('Evento de restauração emitido');

    return true;
  } catch (error: any) {
    console.error('Erro ao restaurar backup:', error);
    throw new Error(`Não foi possível restaurar o backup: ${error.message}`);
  }
}; 