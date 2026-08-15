import { isPreviewableImageUri } from '../ImagePreviewModal';

describe('isPreviewableImageUri', () => {
  it('aceita URI de imagem não vazia', () => {
    expect(isPreviewableImageUri('file:///data/user/0/app/image.jpg')).toBe(true);
    expect(isPreviewableImageUri('https://images.example.com/console.jpg')).toBe(true);
  });

  it('rejeita URI ausente ou em branco', () => {
    expect(isPreviewableImageUri(undefined)).toBe(false);
    expect(isPreviewableImageUri('   ')).toBe(false);
  });
});
