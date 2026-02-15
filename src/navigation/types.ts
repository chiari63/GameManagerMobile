import { Game, Console, Accessory } from '../types';

// Definição dos tipos para as pilhas de navegação
export type HomeStackParamList = {
  HomeMain: undefined;
  Accessories: { autoOpenAdd?: boolean; editingAccessory?: Accessory };
  AccessoryDetails: { accessory: Accessory };
  Maintenance: undefined;
  Notifications: undefined;
  ApisConfig: undefined;
  ApiConfig: undefined;
};

export type MainTabParamList = {
  ConsolesStack: undefined;
  GamesStack: undefined;
  HomeStack: undefined;
  Wishlist: undefined;
  MainTabs: undefined;
  GameDetails: { game: Game };
  ConsoleDetails: { console: Console };
  AccessoryDetails: { accessory: Accessory };
  IGDBSearch: { onSelect: (gameData: any) => void; searchType: string };
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  Games: undefined;
  GameDetails: { id: string };
  Consoles: undefined;
  ConsoleDetails: { id: string };
  Accessories: { autoOpenAdd?: boolean; editingAccessory?: Accessory };
  AccessoryDetails: { id: string };
  Maintenance: undefined;
  Notifications: undefined;
  ApisConfig: undefined;
  ApiConfig: undefined;
  IGDBSearch: {
    onSelect: (data: any) => void;
    searchType: 'game' | 'platform';
  };
};

export type ConsolesStackParamList = {
  ConsolesList: { autoOpenAdd?: boolean; editingConsole?: Console };
  ConsoleDetails: {
    console: Console;
  };
};

export type GamesStackParamList = {
  GamesList: { autoOpenAdd?: boolean; editingGame?: Game };
  GameDetails: {
    game: Game;
  };
}; 