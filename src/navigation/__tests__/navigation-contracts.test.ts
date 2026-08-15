import type { MainTabParamList, RootStackParamList } from '../types';

const gameSnapshot = {
  id: 'game-1',
  name: 'Example game',
  purchaseDate: '01/01/2026',
};

const nestedGamesRoute: MainTabParamList['GamesStack'] = {
  screen: 'GamesList',
  params: { autoOpenAdd: true },
};

const rootGameDetailsRoute: RootStackParamList['GameDetails'] = {
  game: gameSnapshot,
};

describe('navigation contracts', () => {
  it('supports nested game creation and entity snapshot details', () => {
    expect(nestedGamesRoute).toEqual({
      screen: 'GamesList',
      params: { autoOpenAdd: true },
    });
    expect(rootGameDetailsRoute).toEqual({ game: gameSnapshot });
  });
});
