import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

// Cores extraídas da versão web mostrada na imagem
const colors = {
  // Cores primárias
  primary: '#4a9bff', // Azul mais claro usado nos ícones e elementos interativos
  secondary: '#3b82f6', // Azul secundário
  
  // Cores de fundo e texto
  background: '#0a0e1a', // Fundo muito escuro (quase preto) com tom azulado
  foreground: '#ffffff', // Texto branco
  
  // Cores de cartões
  card: '#121a2b', // Fundo dos cards um pouco mais claro que o background
  cardForeground: '#ffffff', // Texto dos cards em branco
  
  // Cores de destaque
  accent: '#1e293b', // Cor de destaque para elementos secundários
  accentForeground: '#ffffff', // Texto sobre elementos de destaque
  
  // Cores de alerta/erro
  destructive: '#f43f5e', // Vermelho para alertas/erros
  destructiveForeground: '#fafafa', // Texto sobre alertas
  
  // Cores de elementos de interface
  muted: '#121a2b', // Elementos com menor destaque
  mutedForeground: '#94a3b8', // Texto com menor destaque
  
  // Cores de borda e entrada
  border: '#1e293b', // Cor das bordas
  input: '#1e293b', // Cor de fundo dos inputs
  
  // Cores para gráficos (baseadas nos gráficos da imagem)
  chartColors: [
    '#4a9bff', // Azul (35%)
    '#25d07c', // Verde (25%)
    '#f59e0b', // Laranja/Amarelo (20%)
    '#ff5757', // Vermelho (10%)
    '#d957ff', // Rosa/Roxo (5%)
    '#90caf9', // Azul claro (90% no gráfico de região)
    '#26a69a', // Verde-azulado (10% no gráfico de região)
  ],
};

// Tema escuro personalizado
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    onPrimary: colors.foreground,
    primaryContainer: colors.primary + '20', // Versão com transparência
    onPrimaryContainer: colors.primary,
    secondary: colors.secondary,
    onSecondary: colors.foreground,
    secondaryContainer: colors.secondary + '20', // Versão com transparência
    onSecondaryContainer: colors.secondary,
    tertiary: colors.accent,
    onTertiary: colors.accentForeground,
    tertiaryContainer: colors.accent + '20', // Versão com transparência
    onTertiaryContainer: colors.accent,
    error: colors.destructive,
    onError: colors.destructiveForeground,
    errorContainer: colors.destructive + '20', // Versão com transparência
    onErrorContainer: colors.destructive,
    background: colors.background,
    onBackground: colors.foreground,
    surface: colors.card,
    onSurface: colors.cardForeground,
    surfaceVariant: colors.muted,
    onSurfaceVariant: colors.mutedForeground,
    outline: colors.border,
    outlineVariant: colors.border + '80', // Versão com transparência
    elevation: {
      level0: 'transparent',
      level1: colors.card,
      level2: colors.card,
      level3: colors.card,
      level4: colors.card,
      level5: colors.card,
    },
  },
};

// Exportando as cores para uso em outros componentes
export const appColors = colors;

// Tema padrão (escuro)
export default darkTheme; 