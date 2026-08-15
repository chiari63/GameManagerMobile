/**
 * Verifica se uma URL pode ser aberta externamente pelo dispositivo.
 * Links vindos de metadados remotos devem usar HTTPS; esquemas do sistema
 * (como intent:, tel: e file:) nunca são encaminhados ao Linking.
 */
export const isSafeExternalUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};
