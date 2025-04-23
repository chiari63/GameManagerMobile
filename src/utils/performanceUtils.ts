/**
 * Utilitários para otimização de performance e gestão de memória
 */
import { Platform, InteractionManager } from 'react-native';
import { appLog } from '../config/environment';

/**
 * Executa uma tarefa depois que as interações da UI estiverem concluídas,
 * com fallback para setTimeout em casos onde o InteractionManager pode ser bloqueado.
 * 
 * @param task Função a ser executada
 * @param fallbackTimeout Tempo de fallback em ms (padrão: 300ms)
 */
export const runAfterInteractions = (task: () => any, fallbackTimeout = 300): void => {
  // Em iOS, o InteractionManager funciona bem, em Android às vezes falha
  if (Platform.OS === 'ios') {
    InteractionManager.runAfterInteractions(() => {
      task();
    });
  } else {
    // No Android, usamos uma combinação de InteractionManager com um fallback de setTimeout
    const handle = InteractionManager.runAfterInteractions(() => {
      clearTimeout(fallbackTimeoutId);
      task();
    });
    
    const fallbackTimeoutId = setTimeout(() => {
      // Se o InteractionManager estiver demorando muito, cancele e execute
      if (handle?.cancel) {
        handle.cancel();
      }
      task();
      appLog.debug('performanceUtils - Usado fallback setTimeout para executar tarefa');
    }, fallbackTimeout);
  }
};

/**
 * Memoiza uma função para evitar recálculos caros
 * 
 * @param fn Função a ser memoizada
 * @param getKey Função para gerar a chave do cache (opcional)
 * @returns Função memoizada
 */
export function memoize<T, R>(
  fn: (...args: T[]) => R,
  getKey: (...args: T[]) => string = (...args) => JSON.stringify(args)
): (...args: T[]) => R {
  const cache = new Map<string, R>();
  
  return (...args: T[]): R => {
    const key = getKey(...args);
    
    if (cache.has(key)) {
      appLog.debug(`performanceUtils - Cache hit para memoização: ${key}`);
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    appLog.debug(`performanceUtils - Cache miss para memoização: ${key}`);
    
    return result;
  };
}

/**
 * Cria uma versão debounced de uma função
 * 
 * @param fn Função a ser debounced
 * @param delay Atraso em milissegundos
 * @returns Função com debounce
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Cria uma versão throttled de uma função
 * 
 * @param fn Função a ser throttled
 * @param limit Limite de tempo em milissegundos
 * @returns Função com throttle
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let waiting = false;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    if (waiting) {
      lastArgs = args;
      lastThis = this;
      return;
    }
    
    fn.apply(this, args);
    waiting = true;
    
    setTimeout(() => {
      waiting = false;
      if (lastArgs) {
        fn.apply(lastThis, lastArgs);
        lastArgs = null;
        lastThis = null;
      }
    }, limit);
  };
}

/**
 * Monitora tempo de execução de operações críticas
 * 
 * @param name Nome da operação
 * @param operation Função a ser monitorada
 * @returns Resultado da operação
 */
export async function measurePerformance<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    return await operation();
  } finally {
    const duration = Date.now() - startTime;
    appLog.debug(`performanceUtils - ${name} levou ${duration}ms para completar`);
    
    // Registrar operações que levam mais de 500ms como potenciais problemas
    if (duration > 500) {
      appLog.warn(`performanceUtils - Operação lenta detectada: ${name} (${duration}ms)`);
    }
  }
} 