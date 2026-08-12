import { validateBackupData } from '../backupSchema';

const validBackup = {
  version: '1.4.0',
  timestamp: '2026-08-09T12:00:00.000Z',
  consoles: [],
  games: [
    {
      id: 'game-1',
      name: 'Remote Cover Game',
      purchaseDate: '2026-08-09',
      imageUrl: 'https://images.igdb.com/cover.jpg',
    },
  ],
  accessories: [],
  wishlist: [],
};

describe('validateBackupData', () => {
  it('preserves a valid remote HTTPS image URL', () => {
    const backup = validateBackupData(validBackup);

    expect(backup.games[0].imageUrl).toBe('https://images.igdb.com/cover.jpg');
  });

  it('rejects unsafe image URL schemes before restore writes data', () => {
    expect(() =>
      validateBackupData({
        ...validBackup,
        games: [{ ...validBackup.games[0], imageUrl: 'intent://malicious' }],
      }),
    ).toThrow('URL de imagem inválida');
  });

  it('rejects backups with oversized base64 payloads', () => {
    expect(() =>
      validateBackupData({
        ...validBackup,
        games: [{ ...validBackup.games[0], imageBase64: 'a'.repeat(5_000_001) }],
      }),
    ).toThrow('Imagem de backup excede o tamanho permitido');
  });

  it('rejects aggregate base64 payloads that exceed the backup budget', () => {
    expect(() =>
      validateBackupData({
        ...validBackup,
        games: Array.from({ length: 3 }, (_, index) => ({
          ...validBackup.games[0],
          id: `game-${index}`,
          imageBase64: 'a'.repeat(4_000_000),
        })),
      }),
    ).toThrow('Backup excede o tamanho total permitido');
  });

  it('rejects malformed collection structures', () => {
    expect(() => validateBackupData({ ...validBackup, consoles: {} })).toThrow(
      'Estrutura de backup inválida',
    );
  });
});
