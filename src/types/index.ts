export interface Game {
  id: string;
  name: string;
  consoleId: string;
  genre: string;
  region: string;
  releaseYear: string;
  purchaseDate: string;
  isPhysical: boolean;
  imageUrl?: string;
}

export interface Console {
  id: string;
  name: string;
  brand: string;
  model: string;
  region?: string;
  purchaseDate: string;
  lastMaintenanceDate?: string;
  maintenanceDescription?: string;
  imageUrl?: string;
}

export interface Accessory {
  id: string;
  name: string;
  type: string;
  consoleId: string;
  purchaseDate: string;
  lastMaintenanceDate?: string;
  maintenanceDescription?: string;
  imageUrl?: string;
}

export interface WishlistItem {
  id: string;
  name: string;
  type: 'game' | 'console' | 'accessory' | 'other';
  description?: string;
  priority?: 'baixa' | 'média' | 'alta';
  estimatedPrice?: number;
}

export interface StorageData {
  games: Game[];
  consoles: Console[];
  accessories: Accessory[];
  wishlist: WishlistItem[];
} 