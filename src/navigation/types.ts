import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Game, Console, Accessory } from '../types';

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
  ConsolesStack: NavigatorScreenParams<ConsolesStackParamList> | undefined;
  GamesStack: NavigatorScreenParams<GamesStackParamList> | undefined;
  HomeStack: NavigatorScreenParams<HomeStackParamList> | undefined;
  Wishlist: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Games: undefined;
  GameDetails: { game: Game };
  Consoles: undefined;
  ConsoleDetails: { console: Console };
  Accessories: { autoOpenAdd?: boolean; editingAccessory?: Accessory } | undefined;
  AccessoryDetails: { accessory: Accessory };
  Maintenance: undefined;
  Notifications: undefined;
  ApisConfig: undefined;
  ApiConfig: undefined;
  IGDBSearch: {
    onSelect: (data: unknown) => void;
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