import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { saveSecureValue } from '../securityUtils';

describe('saveSecureValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects sensitive persistence when SecureStore is unavailable', async () => {
    (SecureStore.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    await expect(saveSecureValue('igdb_client_secret', 'super-secret'))
      .rejects.toThrow(/armazenamento seguro/i);

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
