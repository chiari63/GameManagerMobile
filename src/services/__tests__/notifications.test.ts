import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { checkAndNotifyOverdue } from '../notifications';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
}));

jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const scheduleNotification = Notifications.scheduleNotificationAsync as jest.MockedFunction<typeof Notifications.scheduleNotificationAsync>;

describe('overdue maintenance nudge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 0, 10, 12));
    storage.clear();
    scheduleNotification.mockResolvedValue('overdue-nudge');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends at most one nudge per overdue item IDs and calendar day across app checks', async () => {
    const consoles = [{ id: 'console-1', name: 'Console atrasado', purchaseDate: '01/01/2025', nextMaintenanceDate: '01/01/2026' }];

    await checkAndNotifyOverdue(consoles, []);
    await checkAndNotifyOverdue(consoles, []);

    expect(scheduleNotification).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(
      '@GameManager:overdue-nudge',
      expect.stringContaining('console-1'),
    );
  });
});
