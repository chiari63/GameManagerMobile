import { Game, Console, Accessory } from '../types';

// Definição dos tipos para as pilhas de navegação
export type MainTabParamList = {
  ConsolesStack: undefined;
  GamesStack: undefined;
  Home: undefined;
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
  Accessories: { autoOpenAdd?: boolean };
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
  ConsolesList: { autoOpenAdd?: boolean };
  ConsoleDetails: {
    console: Console;
  };
};

export type GamesStackParamList = {
  GamesList: { autoOpenAdd?: boolean };
  GameDetails: {
    game: Game;
  };
}; 