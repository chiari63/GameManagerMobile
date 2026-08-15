import { prepareBackupItems, restoreBackupItems } from '../backup';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
}));

describe('backup image transformations', () => {
  it('keeps a remote HTTPS image URL in exported data', async () => {
    await expect(
      prepareBackupItems([
        { id: 'game-1', name: 'Game', imageUrl: 'https://images.igdb.com/cover.jpg' },
      ]),
    ).resolves.toEqual([
      { id: 'game-1', name: 'Game', imageUrl: 'https://images.igdb.com/cover.jpg' },
    ]);
  });

  it('does not export insecure HTTP image URLs', async () => {
    await expect(
      prepareBackupItems([
        { id: 'game-1', name: 'Game', imageUrl: 'http://images.igdb.com/cover.jpg' },
      ]),
    ).resolves.toEqual([{ id: 'game-1', name: 'Game' }]);
  });

  it('keeps a validated remote HTTPS image URL when no base64 payload exists', async () => {
    await expect(
      restoreBackupItems([
        { id: 'game-1', name: 'Game', imageUrl: 'https://images.igdb.com/cover.jpg' },
      ]),
    ).resolves.toEqual([
      { id: 'game-1', name: 'Game', imageUrl: 'https://images.igdb.com/cover.jpg' },
    ]);
  });
});
