import axios from 'axios';
import { getGameDetails, queryIGDB, searchGames } from '../igdbApi';

jest.mock('axios', () => {
  const request = jest.fn();
  return Object.assign(request, { isAxiosError: jest.fn(() => false) });
});

jest.mock('../igdbAuth', () => ({
  getIGDBToken: jest.fn().mockResolvedValue('access-token'),
  clearIGDBToken: jest.fn(),
  getIGDBCredentials: jest.fn().mockResolvedValue({ clientId: 'client-id' }),
}));

jest.mock('../cacheService', () => ({
  cacheData: jest.fn(),
  getCachedData: jest.fn().mockResolvedValue(null),
}));

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe('IGDB API contract', () => {
  beforeEach(() => {
    mockedAxios.mockReset();
  });

  it('returns null for an invalid game id without issuing a request', async () => {
    await expect(getGameDetails(12.5, false)).resolves.toBeNull();
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  it('returns null for a missing game without making an unfiltered fallback query', async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: [] } as never);

    await expect(getGameDetails(42, false)).resolves.toBeNull();

    expect(mockedAxios).toHaveBeenCalledTimes(1);
    const request = mockedAxios.mock.calls[0]?.[0] as unknown as { data: string };
    expect(request.data).toContain('where id = 42;');
    expect(request.data).not.toContain('limit 1;');
  });

  it('keeps a valid empty API response distinct from an API failure', async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: [] } as never);
    await expect(searchGames('nothing here', 10, false)).resolves.toEqual([]);

    mockedAxios.mockRejectedValue(new Error('network unavailable'));
    await expect(queryIGDB('games', 'fields name; limit 1;', false)).rejects.toEqual(
      expect.objectContaining({ kind: 'network' }),
    );
  });

  it('escapes quote characters in search terms and clamps the result limit', async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: [] } as never);

    await searchGames('Metal Gear "Solid"', 999, false);

    const request = mockedAxios.mock.calls[0]?.[0] as unknown as { data: string };
    expect(request.data).toContain('search "Metal Gear \\"Solid\\"";');
    expect(request.data).toContain('limit 50;');
  });
});
