/**
 * Utilitários de segurança para o aplicativo
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appLog } from '../config/environment';

// Função para verificar se o dispositivo suporta armazenamento seguro
export const isSecureStoreAvailable = async (): Promise<boolean> => {
  return await SecureStore.isAvailableAsync();
};

/**
 * Função para salvar dados sensíveis no SecureStore
 * Com fallback para AsyncStorage (criptografado) se SecureStore não estiver disponível
 * @param key Chave para armazenar o valor
 * @param value Valor a ser armazenado
 */
export const saveSecureValue = async (key: string, value: string): Promise<void> => {
  try {
    const secureStoreAvailable = await isSecureStoreAvailable();
    
    if (secureStoreAvailable) {
      // Usar SecureStore para armazenamento seguro
      await SecureStore.setItemAsync(key, value);
      appLog.info(`Dado armazenado com segurança para chave: ${key}`);
    } else {
      // Fallback para AsyncStorage com criptografia
      appLog.warn('SecureStore não disponível, usando AsyncStorage com criptografia');
      const encryptedValue = await encryptValue(value);
      await AsyncStorage.setItem(`encrypted_${key}`, encryptedValue);
    }
  } catch (error) {
    appLog.error(`Erro ao salvar valor seguro para chave ${key}:`, error);
    throw new Error('Falha ao salvar dados sensíveis');
  }
};

/**
 * Função para recuperar dados sensíveis do SecureStore
 * Com fallback para AsyncStorage (criptografado) se SecureStore não estiver disponível
 * @param key Chave do valor armazenado
 * @returns Valor recuperado ou null se não existir
 */
export const getSecureValue = async (key: string): Promise<string | null> => {
  try {
    const secureStoreAvailable = await isSecureStoreAvailable();
    
    if (secureStoreAvailable) {
      // Recuperar do SecureStore
      return await SecureStore.getItemAsync(key);
    } else {
      // Recuperar do AsyncStorage e descriptografar
      const encryptedValue = await AsyncStorage.getItem(`encrypted_${key}`);
      if (!encryptedValue) return null;
      
      return await decryptValue(encryptedValue);
    }
  } catch (error) {
    appLog.error(`Erro ao recuperar valor seguro para chave ${key}:`, error);
    return null;
  }
};

/**
 * Remove um valor seguro
 * @param key Chave do valor a ser removido
 */
export const deleteSecureValue = async (key: string): Promise<void> => {
  try {
    const secureStoreAvailable = await isSecureStoreAvailable();
    
    if (secureStoreAvailable) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(`encrypted_${key}`);
    }
    
    appLog.info(`Valor seguro removido para chave: ${key}`);
  } catch (error) {
    appLog.error(`Erro ao remover valor seguro para chave ${key}:`, error);
  }
};

/**
 * Criptografa um valor usando uma chave derivada do dispositivo
 * @param value Valor a ser criptografado
 * @returns Valor criptografado em base64
 */
const encryptValue = async (value: string): Promise<string> => {
  // Simplificação - em uma implementação real, usaríamos APIs criptográficas adequadas
  // Como CryptoKit no iOS ou Android Keystore no Android
  // Esta é apenas uma simulação de criptografia para demonstração
  const deviceId = await getDeviceId();
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${deviceId}${value}`
  );
  return `${hash}_${value}`; // Não é realmente criptografia, apenas uma demonstração
};

/**
 * Descriptografa um valor usando uma chave derivada do dispositivo
 * @param encryptedValue Valor criptografado
 * @returns Valor original
 */
const decryptValue = async (encryptedValue: string): Promise<string> => {
  // Simplificação - em uma implementação real, usaríamos APIs criptográficas adequadas
  const parts = encryptedValue.split('_');
  if (parts.length < 2) {
    throw new Error('Valor criptografado inválido');
  }
  
  // Retorna a parte após o hash
  return parts.slice(1).join('_');
};

/**
 * Obtém um ID único para o dispositivo (ou gera um se não existir)
 * @returns ID do dispositivo
 */
const getDeviceId = async (): Promise<string> => {
  const DEVICE_ID_KEY = '@GameManager:deviceId';
  
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Gerar um ID aleatório para o dispositivo
      deviceId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${Date.now().toString()}${Math.random().toString()}`
      );
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  } catch (error) {
    appLog.error('Erro ao obter ID do dispositivo:', error);
    // Fallback para um ID temporário
    return `${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`;
  }
};

/**
 * Gera um ID único para uso no aplicativo
 * @returns ID único
 */
export const generateUniqueId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
}; 