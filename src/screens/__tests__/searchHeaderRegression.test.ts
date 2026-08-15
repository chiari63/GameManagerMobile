import fs from 'node:fs';
import path from 'node:path';

const screens = ['GamesScreen.tsx', 'ConsolesScreen.tsx', 'AccessoriesScreen.tsx'];

describe('headers de listas pesquisáveis', () => {
  it.each(screens)('preserva a instância do Searchbar em %s', (screen) => {
    const source = fs.readFileSync(path.join(__dirname, '..', screen), 'utf8');

    expect(source).toContain('ListHeaderComponent={renderHeader()}');
    expect(source).not.toContain('ListHeaderComponent={renderHeader}');
  });
});
