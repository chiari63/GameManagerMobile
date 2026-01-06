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
  igdbId?: number;
  pricePaid?: number;
  // Dados completos do IGDB salvos localmente
  igdbData?: {
    id: number;
    name: string;
    summary?: string;
    storyline?: string;
    cover?: {
      url?: string;
      image_id?: string;
    };
    first_release_date?: number;
    platforms?: Array<{ name: string }>;
    genres?: Array<{ name: string }>;
    rating?: number;
    rating_count?: number;
    aggregated_rating?: number;
    aggregated_rating_count?: number;
    total_rating?: number;
    total_rating_count?: number;
    involved_companies?: Array<{
      company: { name: string };
      developer?: boolean;
      publisher?: boolean;
    }>;
    screenshots?: Array<{ image_id: string }>;
    videos?: Array<{ video_id: string }>;
    similar_games?: Array<{ name: string; cover?: { image_id: string } }>;
    game_modes?: Array<{ name: string }>;
    player_perspectives?: Array<{ name: string }>;
    themes?: Array<{ name: string }>;
    age_ratings?: Array<{ rating: number; category: number }>;
    websites?: Array<{ url: string; category: number }>;
  };
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
  maintenanceInterval?: number;
  notifyMaintenance?: boolean;
  nextMaintenanceDate?: string;
  imageUrl?: string;
  condition?: string;
  pricePaid?: number;
}

export interface Accessory {
  id: string;
  name: string;
  type: string;
  consoleId: string;
  purchaseDate: string;
  lastMaintenanceDate?: string;
  maintenanceDescription?: string;
  maintenanceInterval?: number;
  notifyMaintenance?: boolean;
  nextMaintenanceDate?: string;
  imageUrl?: string;
  condition?: string;
  pricePaid?: number;
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
  notifications?: Notification[];
}

export interface MaintenanceItem {
  id: string;
  name: string;
  type: 'console' | 'accessory';
  itemType?: string;
  nextMaintenanceDate: string;
  daysRemaining: number;
  lastMaintenanceDate?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
  itemId?: string;
  itemType?: 'console' | 'accessory';
  maintenanceDate?: string;
} 