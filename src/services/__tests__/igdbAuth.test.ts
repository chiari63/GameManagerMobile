import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { clearIGDBToken } from '../igdbAuth';

describe('clearIGDBToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.isAvailableAsync as jest.Mock).mockResolvedValue(true);
  });

  it('removes tokens from SecureStore instead of AsyncStorage', async () => {
    await clearIGDBToken();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('igdb_access_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('igdb_token_expiry');
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });
});
