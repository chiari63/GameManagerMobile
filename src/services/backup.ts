import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConsoles, getGames, getAccessories, getWishlistItems, restoreStorageData } from './storage';
import { StorageData } from '../types';
import { STORAGE_KEYS } from '../constants/storage';
import { rescheduleAllNotifications } from './notifications';
import { appLog } from '../config/environment';
import { appEvents, APP_EVENTS } from './events';
import { validateBackupData } from './backupSchema';

const MAX_BACKUP_FILE_SIZE_BYTES = 15_000_000;

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
        appLog.debug('Pulando conversão de URL remota:', uri);
        return undefined;
      } catch (error) {
        appLog.error('Erro ao baixar imagem remota:', error);
        return undefined;
      }
    }

    // Para arquivos locais, continua com a leitura normal
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    appLog.error('Erro ao converter imagem para base64:', error);
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
    appLog.error('Erro ao converter base64 para imagem:', error);
    throw error;
  }
};

// Mantém URLs HTTPS remotas e converte somente arquivos locais em base64.
export const prepareBackupItems = async (items: any[]): Promise<any[]> => {
  const processedItems = [];

  for (const item of items) {
    if (typeof item.imageUrl === 'string' && item.imageUrl.startsWith('https://')) {
      processedItems.push({ ...item });
      continue;
    }

    if (typeof item.imageUrl === 'string' && item.imageUrl.startsWith('http://')) {
      const { imageUrl, ...itemWithoutUnsafeUrl } = item;
      processedItems.push(itemWithoutUnsafeUrl);
      continue;
    }

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
        appLog.error(`Erro ao processar imagem para o item ${item.id}:`, error);
      }
    }
    // Não descarta uma referência que não tenha podido ser convertida.
    processedItems.push({ ...item });
  }

  return processedItems;
};

// Materializa imagens locais e preserva URLs HTTPS validadas.
export const restoreBackupItems = async (items: any[]): Promise<any[]> => {
  const restoredItems = [];

  for (const item of items) {
    // Verificar se o item tem uma imagem em base64 válida
    if (item.imageBase64 && typeof item.imageBase64 === 'string' && item.id) {
      try {
        // Passar o ID do item para garantir nomes de arquivo únicos
        const imageUrl = await base64ToImage(item.imageBase64, item.id);
        appLog.debug(`Imagem restaurada para o item ${item.id}: ${imageUrl}`);
        restoredItems.push({
          ...item,
          imageUrl,
          imageBase64: undefined // Removemos o base64 após restaurar
        });
        continue;
      } catch (error) {
        appLog.error(`Erro ao restaurar imagem para o item ${item.id}:`, error);
      }
    }
    // Sem base64, a URL remota já validada permanece intacta.
    const { imageBase64, ...itemWithoutBase64 } = item;
    restoredItems.push(itemWithoutBase64);
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

    // Coleta preferências e tema (usando as chaves do constants/storage)
    const [preferences, themeMode] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES),
      AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE),
    ]);

    appLog.info('Dados coletados para backup:', {
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
      prepareBackupItems(consoles),
      prepareBackupItems(games),
      prepareBackupItems(accessories),
      prepareBackupItems(wishlist)
    ]);

    // Cria o objeto de backup
    const backupData = {
      consoles: processedConsoles,
      games: processedGames,
      accessories: processedAccessories,
      wishlist: processedWishlist,
      preferences: preferences ? JSON.parse(preferences) : undefined,
      themeMode: themeMode,
      timestamp: new Date().toISOString(),
      version: '1.4.0', // Atualizado para incluir preferências e tema
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
    appLog.info('Arquivo de backup criado:', fileUri);

    // Compartilha o arquivo
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Salvar backup',
      UTI: 'public.json'
    });

    return true;
  } catch (error) {
    appLog.error('Erro ao criar backup:', error);
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
    if (typeof result.assets[0].size === 'number' && result.assets[0].size > MAX_BACKUP_FILE_SIZE_BYTES) {
      throw new Error('Arquivo de backup excede o tamanho permitido');
    }

    appLog.info('Arquivo de backup selecionado:', result.assets[0].uri);

    // Lê o conteúdo do arquivo
    const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const backupData = validateBackupData(JSON.parse(fileContent));

    appLog.info('Dados do backup:', {
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

    let restoredConsoles: StorageData['consoles'] = [];
    let restoredAccessories: StorageData['accessories'] = [];

    // A materialização de imagens e a substituição dos dados compartilham a mesma fila
    // das demais mutações, evitando que uma gravação concorrente seja perdida.
    await restoreStorageData(async () => {
      const [consoles, games, accessories, wishlist] = await Promise.all([
        restoreBackupItems(backupData.consoles),
        restoreBackupItems(backupData.games),
        restoreBackupItems(backupData.accessories),
        restoreBackupItems(backupData.wishlist),
      ]);
      restoredConsoles = consoles;
      restoredAccessories = accessories;
      return { consoles, games, accessories, wishlist } as StorageData;
    });

    // Verifica se os dados foram salvos corretamente
    const restoredData = await AsyncStorage.getItem(STORAGE_KEY);
    const parsedData = JSON.parse(restoredData || '{"consoles":[],"games":[],"accessories":[],"wishlist":[]}');

    appLog.info('Dados restaurados:', {
      consoles: parsedData.consoles.length,
      games: parsedData.games.length,
      accessories: parsedData.accessories.length,
      wishlist: parsedData.wishlist.length
    });

    // Restaura preferências e tema se existirem no backup
    if (backupData.preferences) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(backupData.preferences));
    }
    if (backupData.themeMode) {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, backupData.themeMode);
    }

    // Emite o evento de restauração completa
    appEvents.emit(APP_EVENTS.RESTORE_COMPLETED);
    appLog.info('Evento de restauração emitido');

    // Re-agenda todas as notificações após a restauração
    appLog.info('Iniciando reagendamento de notificações...');
    await rescheduleAllNotifications(restoredConsoles, restoredAccessories);
    appLog.info('Notificações reagendadas com sucesso');

    return true;
  } catch (error: any) {
    appLog.error('Erro ao restaurar backup:', error);
    throw new Error(`Não foi possível restaurar o backup: ${error.message}`);
  }
}; 