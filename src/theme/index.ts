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

// Cores para o tema claro
const lightColors = {
  // Cores primárias
  primary: '#3b82f6', // Azul primário mais escuro para contraste
  secondary: '#2563eb', // Azul secundário mais escuro
  
  // Cores de fundo e texto
  background: '#f8fafc', // Fundo claro
  foreground: '#0f172a', // Texto escuro
  
  // Cores de cartões
  card: '#ffffff', // Fundo dos cards branco
  cardForeground: '#0f172a', // Texto dos cards escuro
  
  // Cores de destaque
  accent: '#e2e8f0', // Cor de destaque para elementos secundários
  accentForeground: '#0f172a', // Texto sobre elementos de destaque
  
  // Cores de alerta/erro
  destructive: '#e11d48', // Vermelho para alertas/erros
  destructiveForeground: '#ffffff', // Texto sobre alertas
  
  // Cores de elementos de interface
  muted: '#f1f5f9', // Elementos com menor destaque
  mutedForeground: '#64748b', // Texto com menor destaque
  
  // Cores de borda e entrada
  border: '#e2e8f0', // Cor das bordas
  input: '#f1f5f9', // Cor de fundo dos inputs
  
  // Cores para gráficos (mantidas do tema escuro)
  chartColors: colors.chartColors,
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

// Tema claro personalizado
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.primary,
    onPrimary: '#ffffff',
    primaryContainer: lightColors.primary + '15', // Versão com transparência
    onPrimaryContainer: lightColors.primary,
    secondary: lightColors.secondary,
    onSecondary: '#ffffff',
    secondaryContainer: lightColors.secondary + '15', // Versão com transparência
    onSecondaryContainer: lightColors.secondary,
    tertiary: lightColors.accent,
    onTertiary: lightColors.accentForeground,
    tertiaryContainer: lightColors.accent + '30', // Versão com transparência
    onTertiaryContainer: lightColors.accentForeground,
    error: lightColors.destructive,
    onError: lightColors.destructiveForeground,
    errorContainer: lightColors.destructive + '15', // Versão com transparência
    onErrorContainer: lightColors.destructive,
    background: lightColors.background,
    onBackground: lightColors.foreground,
    surface: lightColors.card,
    onSurface: lightColors.cardForeground,
    surfaceVariant: lightColors.muted,
    onSurfaceVariant: lightColors.mutedForeground,
    outline: lightColors.border,
    outlineVariant: lightColors.border + '80', // Versão com transparência
    elevation: {
      level0: 'transparent',
      level1: lightColors.card,
      level2: lightColors.card,
      level3: lightColors.card,
      level4: lightColors.card,
      level5: lightColors.card,
    },
  },
};

// Exportando as cores para uso em outros componentes
export const appColors = colors;
export const appLightColors = lightColors;

// Tema padrão (escuro)
export default darkTheme; 