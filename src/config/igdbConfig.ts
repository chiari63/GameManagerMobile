/**
 * Configurações da API IGDB
 */
export const igdbConfig = {
  // Credenciais da API (valores padrão, serão substituídos pelas configurações do usuário)
  clientId: '',
  clientSecret: '',
  
  // URL base da API
  apiUrl: 'https://api.igdb.com/v4',
  
  // URL base para imagens
  imageUrl: 'https://images.igdb.com/igdb/image/upload',
  
  // Tamanhos de imagem disponíveis
  imageSizes: {
    coverSmall: 't_cover_small', // 90x128
    coverBig: 't_cover_big',     // 264x374
    screenshot: 't_screenshot_big', // 889x500
    logo: 't_logo_med',          // 284x160
    thumb: 't_thumb',            // 90x90
  }
}; 