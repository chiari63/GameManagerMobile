import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addGame,
  clearMemoryCache,
  restoreStorageData,
  deleteAccessory,
  deleteConsole,
  updateAccessory,
  updateConsole,
} from '../storage';
import { cancelMaintenanceNotification } from '../notifications';

jest.mock('../notifications', () => ({
  calculateNextMaintenanceDate: jest.fn(),
  scheduleMaintenanceNotification: jest.fn(),
  cancelMaintenanceNotification: jest.fn(),
  clearMaintenanceItemsCache: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const cancelReminder = cancelMaintenanceNotification as jest.MockedFunction<typeof cancelMaintenanceNotification>;

const emptyData = () => ({ games: [], consoles: [], accessories: [], wishlist: [] });

describe('storage write serialization', () => {
  let persisted = JSON.stringify(emptyData());

  beforeEach(() => {
    clearMemoryCache();
    persisted = JSON.stringify(emptyData());
    storage.getItem.mockImplementation(async () => persisted);
    storage.setItem.mockImplementation(async (_key, value) => {
      persisted = value;
    });
  });

  it('persists both games when mutations start concurrently', async () => {
    await Promise.all([
      addGame({ name: 'Primeiro', purchaseDate: '01/01/2026' }),
      addGame({ name: 'Segundo', purchaseDate: '01/01/2026' }),
    ]);

    const lastWrite = storage.setItem.mock.calls.at(-1)?.[1];
    expect(JSON.parse(lastWrite ?? '{}').games.map((game: { name: string }) => game.name).sort()).toEqual([
      'Primeiro',
      'Segundo',
    ]);
  });

  it('applies a mutation queued after a restore to the restored snapshot', async () => {
    const restored = { ...emptyData(), games: [{ id: 'restored-game', name: 'Restaurado', purchaseDate: '01/01/2026' }] };

    await Promise.all([
      restoreStorageData(restored),
      addGame({ name: 'Criado depois', purchaseDate: '01/01/2026' }),
    ]);

    expect(JSON.parse(persisted).games.map((game: { name: string }) => game.name).sort()).toEqual([
      'Criado depois',
      'Restaurado',
    ]);
  });

  it('cancels a console reminder after persisting a disabled reminder setting', async () => {
    persisted = JSON.stringify({
      ...emptyData(),
      consoles: [{ id: 'console-1', name: 'Console', purchaseDate: '01/01/2026', notifyMaintenance: true, nextMaintenanceDate: '01/02/2026' }],
    });

    await updateConsole('console-1', { notifyMaintenance: false });

    expect(JSON.parse(persisted).consoles[0].notifyMaintenance).toBe(false);
    expect(cancelReminder).toHaveBeenCalledWith('console-1');
  });

  it('cancels an accessory reminder after persisting a missing maintenance date', async () => {
    persisted = JSON.stringify({
      ...emptyData(),
      accessories: [{ id: 'accessory-1', name: 'Accessory', purchaseDate: '01/01/2026', notifyMaintenance: true, nextMaintenanceDate: '01/02/2026' }],
    });

    await updateAccessory('accessory-1', { nextMaintenanceDate: undefined });

    expect(JSON.parse(persisted).accessories[0].nextMaintenanceDate).toBeUndefined();
    expect(cancelReminder).toHaveBeenCalledWith('accessory-1');
  });

  it('cancels reminders when consoles and accessories are deleted', async () => {
    persisted = JSON.stringify({
      ...emptyData(),
      consoles: [{ id: 'console-1', name: 'Console', purchaseDate: '01/01/2026' }],
      accessories: [{ id: 'accessory-1', name: 'Accessory', purchaseDate: '01/01/2026' }],
    });

    await deleteConsole('console-1');
    await deleteAccessory('accessory-1');

    expect(cancelReminder).toHaveBeenCalledWith('console-1');
    expect(cancelReminder).toHaveBeenCalledWith('accessory-1');
  });
});
