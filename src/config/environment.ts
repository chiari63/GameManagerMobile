/**
 * Configurações de ambiente para o aplicativo
 */

// Determina se o ambiente é de desenvolvimento
export const isDevelopment = __DEV__;

// Define o nível de detalhamento dos logs
const LOG_LEVELS = {
  VERBOSE: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Nível de log atual (produção: apenas erros, desenvolvimento: tudo)
const currentLogLevel = isDevelopment ? LOG_LEVELS.VERBOSE : LOG_LEVELS.ERROR;

// Função de log para controlar saída baseada no ambiente
export const appLog = {
  debug: (message: string, ...args: any[]) => {
    if (currentLogLevel <= LOG_LEVELS.VERBOSE) {
      console.debug(message, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      console.info(message, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      console.warn(message, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(message, ...args);
  }
}; 