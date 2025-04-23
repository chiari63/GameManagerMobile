/**
 * Utilitários avançados para armazenamento e persistência de dados
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appLog } from '../config/environment';
import { generateUniqueId } from './securityUtils';
import { debounce } from './performanceUtils';

/**
 * Interface para o gerenciador de armazenamento em lote
 */
interface BatchOperationManager {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
  remove: (key: string) => Promise<void>;
  commit: () => Promise<void>;
  clear: () => void;
}

/**
 * Gerenciador de operações em lote para o AsyncStorage
 * Otimiza múltiplas operações ao agrupá-las em um único commit
 * 
 * @returns Objeto com métodos para operações em lote
 */
export const createBatchStorageManager = (): BatchOperationManager => {
  // Cache de dados e operações pendentes
  const operations: { 
    type: 'set' | 'remove'; 
    key: string; 
    value?: any; 
  }[] = [];
  
  const localCache: Record<string, any> = {};
  
  // Retornar a API do gerenciador
  return {
    /**
     * Obtém valor de uma chave (primeiro do cache, depois do armazenamento)
     */
    get: async (key: string) => {
      // Verificar se temos no cache local
      if (key in localCache) {
        appLog.debug(`BatchStorageManager - Cache hit para chave: ${key}`);
        return localCache[key];
      }
      
      try {
        // Buscar do AsyncStorage
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
          try {
            // Parsear o valor se for JSON
            const parsedValue = JSON.parse(value);
            localCache[key] = parsedValue;
            return parsedValue;
          } catch {
            // Se não for JSON, retornar como string
            localCache[key] = value;
            return value;
          }
        }
        return null;
      } catch (error) {
        appLog.error(`BatchStorageManager - Erro ao obter chave ${key}:`, error);
        return null;
      }
    },
    
    /**
     * Define valor para uma chave (armazena no cache e agenda para commit)
     */
    set: async (key: string, value: any) => {
      localCache[key] = value;
      
      // Adicionar à lista de operações pendentes
      // Remover operações anteriores sobre a mesma chave
      const filteredOps = operations.filter(op => op.key !== key);
      filteredOps.push({ type: 'set', key, value });
      operations.length = 0;
      operations.push(...filteredOps);
      
      appLog.debug(`BatchStorageManager - Operação set agendada para chave: ${key}`);
    },
    
    /**
     * Remove uma chave (agenda para commit)
     */
    remove: async (key: string) => {
      delete localCache[key];
      
      // Adicionar à lista de operações pendentes
      // Remover operações anteriores sobre a mesma chave
      const filteredOps = operations.filter(op => op.key !== key);
      filteredOps.push({ type: 'remove', key });
      operations.length = 0;
      operations.push(...filteredOps);
      
      appLog.debug(`BatchStorageManager - Operação remove agendada para chave: ${key}`);
    },
    
    /**
     * Executa todas as operações pendentes em uma única transação
     */
    commit: async () => {
      if (operations.length === 0) {
        appLog.debug('BatchStorageManager - Nenhuma operação pendente para commit');
        return;
      }
      
      appLog.debug(`BatchStorageManager - Executando commit de ${operations.length} operações`);
      
      try {
        // Preparar operações multiGet e multiSet
        const setOps: [string, string][] = [];
        const removeKeys: string[] = [];
        
        // Separar em operações de set e remove
        operations.forEach(op => {
          if (op.type === 'set') {
            let valueToStore: string;
            
            // Garantir que o valor seja string
            if (typeof op.value === 'string') {
              valueToStore = op.value;
            } else {
              valueToStore = JSON.stringify(op.value);
            }
            
            setOps.push([op.key, valueToStore]);
          } else if (op.type === 'remove') {
            removeKeys.push(op.key);
          }
        });
        
        // Executar operações em paralelo
        const promises: Promise<void>[] = [];
        
        if (setOps.length > 0) {
          promises.push(AsyncStorage.multiSet(setOps));
        }
        
        if (removeKeys.length > 0) {
          promises.push(AsyncStorage.multiRemove(removeKeys));
        }
        
        await Promise.all(promises);
        
        // Limpar a lista de operações
        operations.length = 0;
        
        appLog.debug('BatchStorageManager - Commit concluído com sucesso');
      } catch (error) {
        appLog.error('BatchStorageManager - Erro durante o commit:', error);
        throw error;
      }
    },
    
    /**
     * Limpa todas as operações pendentes sem executá-las
     */
    clear: () => {
      operations.length = 0;
      appLog.debug('BatchStorageManager - Operações pendentes limpas');
    }
  };
};

/**
 * Cria um gerenciador de objetos para armazenamento
 * Facilita persistir e recuperar objetos complexos com tipagem
 * 
 * @param prefix Prefixo para as chaves de armazenamento
 * @returns Interface para manipulação de objetos no storage
 */
export const createObjectStorage = <T extends { id: string }>(prefix: string) => {
  return {
    /**
     * Salva um objeto
     */
    saveObject: async (object: T): Promise<T> => {
      try {
        // Garantir que o objeto tenha um ID
        if (!object.id) {
          object = { ...object, id: generateUniqueId() };
        }
        
        const key = `${prefix}:${object.id}`;
        await AsyncStorage.setItem(key, JSON.stringify(object));
        appLog.debug(`ObjectStorage - Objeto salvo com chave: ${key}`);
        return object;
      } catch (error) {
        appLog.error(`ObjectStorage - Erro ao salvar objeto:`, error);
        throw new Error('Falha ao salvar objeto no armazenamento');
      }
    },
    
    /**
     * Obtém um objeto pelo ID
     */
    getObject: async (id: string): Promise<T | null> => {
      try {
        const key = `${prefix}:${id}`;
        const item = await AsyncStorage.getItem(key);
        
        if (!item) {
          return null;
        }
        
        return JSON.parse(item) as T;
      } catch (error) {
        appLog.error(`ObjectStorage - Erro ao obter objeto com ID ${id}:`, error);
        return null;
      }
    },
    
    /**
     * Lista todos os objetos deste tipo
     */
    getAllObjects: async (): Promise<T[]> => {
      try {
        // Obter todas as chaves do AsyncStorage
        const allKeys = await AsyncStorage.getAllKeys();
        
        // Filtrar apenas as chaves que correspondem ao prefixo
        const objectKeys = allKeys.filter(key => key.startsWith(`${prefix}:`));
        
        if (objectKeys.length === 0) {
          return [];
        }
        
        // Obter todos os objetos em uma única operação
        const results = await AsyncStorage.multiGet(objectKeys);
        
        // Converter para objetos
        return results
          .map(([_, value]) => {
            if (!value) return null;
            try {
              return JSON.parse(value) as T;
            } catch {
              return null;
            }
          })
          .filter((item): item is T => item !== null);
      } catch (error) {
        appLog.error(`ObjectStorage - Erro ao listar objetos:`, error);
        return [];
      }
    },
    
    /**
     * Remove um objeto pelo ID
     */
    removeObject: async (id: string): Promise<void> => {
      try {
        const key = `${prefix}:${id}`;
        await AsyncStorage.removeItem(key);
        appLog.debug(`ObjectStorage - Objeto removido com chave: ${key}`);
      } catch (error) {
        appLog.error(`ObjectStorage - Erro ao remover objeto com ID ${id}:`, error);
        throw new Error('Falha ao remover objeto do armazenamento');
      }
    }
  };
};

/**
 * Utilitário para persistência com expiração - útil para cache de dados
 */
export const createExpiringStorage = (defaultExpiryMs: number = 24 * 60 * 60 * 1000) => {
  return {
    /**
     * Salva um valor com tempo de expiração
     */
    set: async (key: string, value: any, expiryMs: number = defaultExpiryMs): Promise<void> => {
      try {
        const item = {
          value,
          expiry: Date.now() + expiryMs
        };
        
        await AsyncStorage.setItem(key, JSON.stringify(item));
      } catch (error) {
        appLog.error(`ExpiringStorage - Erro ao salvar item com chave ${key}:`, error);
        throw error;
      }
    },
    
    /**
     * Obtém um valor se não estiver expirado
     */
    get: async <T>(key: string): Promise<T | null> => {
      try {
        const itemStr = await AsyncStorage.getItem(key);
        
        if (!itemStr) {
          return null;
        }
        
        const item = JSON.parse(itemStr);
        const now = Date.now();
        
        // Verificar se o item expirou
        if (now > item.expiry) {
          // Item expirado, removê-lo
          await AsyncStorage.removeItem(key);
          return null;
        }
        
        return item.value as T;
      } catch (error) {
        appLog.error(`ExpiringStorage - Erro ao recuperar item com chave ${key}:`, error);
        return null;
      }
    },
    
    /**
     * Verifica se um item está disponível e não expirado
     */
    isValid: async (key: string): Promise<boolean> => {
      try {
        const itemStr = await AsyncStorage.getItem(key);
        
        if (!itemStr) {
          return false;
        }
        
        const item = JSON.parse(itemStr);
        return Date.now() <= item.expiry;
      } catch {
        return false;
      }
    }
  };
};

/**
 * Cria um gerenciador de storage com salvamento debounced para reduzir operações frequentes
 * @param saveDelayMs Tempo em ms para agrupar operações de salvamento
 */
export const createDebouncedStorage = (saveDelayMs: number = 500) => {
  // Criar um debouncer para as operações de salvamento
  const debouncedSave = debounce(async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
      appLog.debug(`DebouncedStorage - Item salvo com chave: ${key}`);
    } catch (error) {
      appLog.error(`DebouncedStorage - Erro ao salvar item com chave ${key}:`, error);
    }
  }, saveDelayMs);
  
  return {
    /**
     * Salva um valor com debounce
     */
    setItem: async (key: string, value: any): Promise<void> => {
      const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
      debouncedSave(key, valueToStore);
    },
    
    /**
     * Obtém um valor (sem debounce)
     */
    getItem: async <T>(key: string, defaultValue: T | null = null): Promise<T | null> => {
      try {
        const value = await AsyncStorage.getItem(key);
        
        if (value === null) {
          return defaultValue;
        }
        
        try {
          // Tentar parsear como JSON
          return JSON.parse(value) as T;
        } catch {
          // Se falhar, retornar como string
          return value as unknown as T;
        }
      } catch (error) {
        appLog.error(`DebouncedStorage - Erro ao recuperar item com chave ${key}:`, error);
        return defaultValue;
      }
    },
    
    /**
     * Remove um valor (sem debounce)
     */
    removeItem: async (key: string): Promise<void> => {
      try {
        await AsyncStorage.removeItem(key);
        appLog.debug(`DebouncedStorage - Item removido com chave: ${key}`);
      } catch (error) {
        appLog.error(`DebouncedStorage - Erro ao remover item com chave ${key}:`, error);
      }
    }
  };
}; 