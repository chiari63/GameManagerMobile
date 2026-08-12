/**
 * Utilitários de persistência segura para o aplicativo.
 */
import * as SecureStore from 'expo-secure-store';
import { appLog } from '../config/environment';

export const isSecureStoreAvailable = async (): Promise<boolean> =>
  SecureStore.isAvailableAsync();

/**
 * Salva dados sensíveis somente no armazenamento protegido do sistema.
 * Nunca faz fallback para AsyncStorage, que não oferece confidencialidade.
 */
export const saveSecureValue = async (key: string, value: string): Promise<void> => {
  try {
    if (!(await isSecureStoreAvailable())) {
      throw new Error('Armazenamento seguro não está disponível neste dispositivo');
    }

    await SecureStore.setItemAsync(key, value);
    appLog.info(`Dado armazenado com segurança para chave: ${key}`);
  } catch (error) {
    appLog.error(`Erro ao salvar valor seguro para chave ${key}:`, error);
    throw error;
  }
};

/**
 * Recupera dados sensíveis do armazenamento protegido, quando disponível.
 */
export const getSecureValue = async (key: string): Promise<string | null> => {
  try {
    if (!(await isSecureStoreAvailable())) {
      return null;
    }

    return SecureStore.getItemAsync(key);
  } catch (error) {
    appLog.error(`Erro ao recuperar valor seguro para chave ${key}:`, error);
    return null;
  }
};

/**
 * Remove um valor sensível do armazenamento protegido.
 */
export const deleteSecureValue = async (key: string): Promise<void> => {
  try {
    if (!(await isSecureStoreAvailable())) {
      return;
    }

    await SecureStore.deleteItemAsync(key);
    appLog.info(`Valor seguro removido para chave: ${key}`);
  } catch (error) {
    appLog.error(`Erro ao remover valor seguro para chave ${key}:`, error);
  }
};

/**
 * Gera um ID único para uso no aplicativo.
 */
export const generateUniqueId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
};
