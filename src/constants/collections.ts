export const REGIOES = ['Americano', 'Japonês'] as const;
export const GENEROS = ['Ação', 'Aventura', 'RPG', 'Estratégia', 'Esporte', 'Corrida', 'Luta', 'Plataforma', 'Outros'] as const;
export const FABRICANTES = ['Sony', 'Microsoft', 'Nintendo', 'Sega', 'Tectoy', 'Outros'] as const;
export const MODELOS = ['Fat', 'Slim', 'Super Slim', 'Pró', 'Meio de geração'] as const;
export const TIPOS_ACESSORIOS = ['Controles', 'Cabos', 'Memorycards', 'Outros'] as const;
export const TIPOS_WISHLIST = ['game', 'console', 'accessory', 'other'] as const;
export const PRIORIDADES = ['baixa', 'média', 'alta'] as const;

export type Regiao = typeof REGIOES[number];
export type Genero = typeof GENEROS[number];
export type Fabricante = typeof FABRICANTES[number];
export type Modelo = typeof MODELOS[number];
export type TipoAcessorio = typeof TIPOS_ACESSORIOS[number];
export type TipoWishlist = typeof TIPOS_WISHLIST[number];
export type Prioridade = typeof PRIORIDADES[number]; 