import { isSafeExternalUrl } from '../urlSecurity';

describe('isSafeExternalUrl', () => {
  it.each([
    'https://www.igdb.com',
    'https://example.com/path?source=igdb',
  ])('accepts HTTPS URLs: %s', (url) => {
    expect(isSafeExternalUrl(url)).toBe(true);
  });

  it.each([
    '',
    'http://example.com',
    'intent://malicious',
    'tel:+5511999999999',
    'sms:+5511999999999',
    'javascript:alert(1)',
    'file:///data/user/0/app/private.txt',
    'not a URL',
  ])('rejects unsafe or malformed URLs: %s', (url) => {
    expect(isSafeExternalUrl(url)).toBe(false);
  });
});
