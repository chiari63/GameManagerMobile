import { Game, Console, Accessory } from '../types';

// Definição dos tipos para as pilhas de navegação
export type MainTabParamList = {
  ConsolesStack: undefined;
  AccessoriesStack: undefined;
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
  MainTabs: undefined;
  Games: undefined;
  GameDetails: { id: string };
  Consoles: undefined;
  ConsoleDetails: { id: string };
  Accessories: undefined;
  AccessoryDetails: { id: string };
  Maintenance: undefined;
  Notifications: undefined;
  IGDBSearch: { 
    onSelect: (data: any) => void;
    searchType: 'game' | 'platform';
  };
};

export type ConsolesStackParamList = {
  ConsolesList: undefined;
  ConsoleDetails: {
    console: Console;
  };
};

export type AccessoriesStackParamList = {
  AccessoriesList: undefined;
  AccessoryDetails: {
    accessory: Accessory;
  };
};

export type GamesStackParamList = {
  GamesList: undefined;
  GameDetails: {
    game: Game;
  };
}; 