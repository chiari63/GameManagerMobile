import { Accessory, Console, Game, WishlistItem } from '../types';

const MAX_IMAGE_BASE64_LENGTH = 5_000_000;
const MAX_TOTAL_IMAGE_BASE64_LENGTH = 10_000_000;
const MAX_COLLECTION_ITEMS = 1_000;
const SUPPORTED_BACKUP_VERSIONS = new Set(['1.4.0']);

type BackupItem = Record<string, unknown> & {
  id: string;
  name: string;
  imageUrl?: string;
  imageBase64?: string;
};

export interface ValidatedBackupData {
  version: string;
  timestamp: string;
  consoles: Console[];
  games: Game[];
  accessories: Accessory[];
  wishlist: WishlistItem[];
  preferences?: unknown;
  themeMode?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSafeImageUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const validateItem = (value: unknown): BackupItem => {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim() ||
      typeof value.name !== 'string' || !value.name.trim()) {
    throw new Error('Estrutura de item de backup inválida');
  }

  if (value.imageUrl !== undefined &&
      (typeof value.imageUrl !== 'string' || !isSafeImageUrl(value.imageUrl))) {
    throw new Error('URL de imagem inválida');
  }

  if (value.imageBase64 !== undefined &&
      (typeof value.imageBase64 !== 'string' || value.imageBase64.length > MAX_IMAGE_BASE64_LENGTH)) {
    throw new Error('Imagem de backup excede o tamanho permitido');
  }

  return value as BackupItem;
};

const validateCollection = <T>(value: unknown): T[] => {
  if (!Array.isArray(value)) {
    throw new Error('Estrutura de backup inválida');
  }
  if (value.length > MAX_COLLECTION_ITEMS) {
    throw new Error('Coleção de backup excede o limite de itens');
  }

  return value.map(validateItem) as T[];
};

const getImageBase64Length = (item: unknown): number => {
  if (!isRecord(item) || typeof item.imageBase64 !== 'string') {
    return 0;
  }
  return item.imageBase64.length;
};

export const validateBackupData = (value: unknown): ValidatedBackupData => {
  if (!isRecord(value) || typeof value.version !== 'string' || typeof value.timestamp !== 'string') {
    throw new Error('Arquivo de backup inválido');
  }

  if (!SUPPORTED_BACKUP_VERSIONS.has(value.version) || Number.isNaN(Date.parse(value.timestamp))) {
    throw new Error('Versão ou data de backup inválida');
  }

  const consoles = validateCollection<Console>(value.consoles);
  const games = validateCollection<Game>(value.games);
  const accessories = validateCollection<Accessory>(value.accessories);
  const wishlist = validateCollection<WishlistItem>(value.wishlist);
  const totalBase64Length = [
    ...(value.consoles as unknown[]),
    ...(value.games as unknown[]),
    ...(value.accessories as unknown[]),
    ...(value.wishlist as unknown[]),
  ].reduce<number>((total, item) => total + getImageBase64Length(item), 0);

  if (totalBase64Length > MAX_TOTAL_IMAGE_BASE64_LENGTH) {
    throw new Error('Backup excede o tamanho total permitido');
  }

  return {
    version: value.version,
    timestamp: value.timestamp,
    consoles,
    games,
    accessories,
    wishlist,
    ...(value.preferences === undefined ? {} : { preferences: value.preferences }),
    ...(value.themeMode === undefined ? {} : { themeMode: validateThemeMode(value.themeMode) }),
  };
};

const validateThemeMode = (value: unknown): string => {
  if (typeof value !== 'string' || !['dark', 'light', 'system'].includes(value)) {
    throw new Error('Tema de backup inválido');
  }
  return value;
};
