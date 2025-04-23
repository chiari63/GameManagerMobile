/**
 * Utilitários para melhorar a acessibilidade no aplicativo
 */
import { AccessibilityInfo, Platform } from 'react-native';
import { appLog } from '../config/environment';

/**
 * Verifica se o usuário está usando um leitor de tela
 * @returns Promise que resolve para boolean indicando se o leitor de tela está ativo
 */
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch (error) {
    appLog.error('Erro ao verificar status do leitor de tela:', error);
    return false;
  }
};

/**
 * Anuncia uma mensagem para usuários com leitor de tela
 * @param message Mensagem a ser anunciada
 */
export const announceForAccessibility = (message: string): void => {
  try {
    AccessibilityInfo.announceForAccessibility(message);
    appLog.debug(`Mensagem anunciada para leitor de tela: ${message}`);
  } catch (error) {
    appLog.error('Erro ao anunciar mensagem para leitor de tela:', error);
  }
};

/**
 * Configura atributos de acessibilidade para componentes
 * @param label Label de acessibilidade 
 * @param hint Dica de acessibilidade opcional
 * @param role Role de acessibilidade opcional
 * @returns Objeto com props de acessibilidade para serem passados para componentes React Native
 */
export const getAccessibilityProps = (
  label: string,
  hint?: string,
  role?: 'none' | 'button' | 'link' | 'search' | 'image' | 'keyboardkey' | 'text' | 'adjustable' | 'imagebutton' | 'header' | 'summary' | 'alert' | 'checkbox' | 'combobox' | 'menu' | 'menubar' | 'menuitem' | 'progressbar' | 'radio' | 'radiogroup' | 'scrollbar' | 'spinbutton' | 'switch' | 'tab' | 'tablist' | 'timer' | 'toolbar'
) => {
  if (Platform.OS === 'ios') {
    return {
      accessible: true,
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityRole: role,
    };
  } else {
    // Android
    return {
      accessible: true,
      accessibilityLabel: hint ? `${label}, ${hint}` : label,
      accessibilityRole: role,
    };
  }
};

/**
 * Cria um label de acessibilidade para um valor monetário
 * @param value Valor monetário a ser formatado
 * @param prefix Prefixo a ser adicionado (ex: "R$")
 * @returns Label de acessibilidade formatado para valor monetário
 */
export const getMoneyAccessibilityLabel = (value: number, prefix: string = 'R$ '): string => {
  if (value === undefined || value === null) {
    return 'Valor não definido';
  }
  
  // Formatar o número com duas casas decimais
  const formattedValue = value.toFixed(2).replace('.', ',');
  
  // Criar uma versão para leitores de tela que leia corretamente o valor
  const integerPart = Math.floor(value);
  const decimalPart = Math.round((value - integerPart) * 100);
  
  // Construir o string para o leitor de tela
  let accessibilityLabel = `${prefix}${integerPart}`;
  
  if (decimalPart > 0) {
    accessibilityLabel += ` e ${decimalPart} centavos`;
  }
  
  return accessibilityLabel;
};

/**
 * Cria um label de acessibilidade para uma data
 * @param dateString String de data (formato DD/MM/YYYY)
 * @returns Label de acessibilidade formatado para a data
 */
export const getDateAccessibilityLabel = (dateString: string): string => {
  if (!dateString) {
    return 'Data não definida';
  }
  
  try {
    // Espera formato DD/MM/YYYY
    const [day, month, year] = dateString.split('/');
    const monthNames = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    
    // Corrigir para índice 0-based e garantir valores numéricos
    const monthIndex = parseInt(month, 10) - 1;
    const monthName = monthNames[monthIndex] || 'mês inválido';
    
    return `${parseInt(day, 10)} de ${monthName} de ${year}`;
  } catch (error) {
    appLog.error(`Erro ao formatar data para acessibilidade: ${dateString}`, error);
    return dateString; // Retorna o valor original em caso de erro
  }
};

/**
 * Define o comportamento de acessibilidade para listas e grids
 * @param total Total de itens na lista
 * @param index Índice do item atual (0-based)
 * @returns Props de acessibilidade para elementos de lista/grid
 */
export const getListItemAccessibilityProps = (total: number, index: number) => {
  return {
    accessibilityState: { selected: false },
    accessibilityHint: `Item ${index + 1} de ${total}`,
  };
};

/**
 * Adiciona um estado de acessibilidade para componentes
 * @param isDisabled Indica se o componente está desabilitado
 * @param isSelected Indica se o componente está selecionado
 * @returns Objeto com estado de acessibilidade
 */
export const getAccessibilityState = (isDisabled?: boolean, isSelected?: boolean) => {
  const state: { disabled?: boolean; selected?: boolean } = {};
  
  if (isDisabled !== undefined) {
    state.disabled = isDisabled;
  }
  
  if (isSelected !== undefined) {
    state.selected = isSelected;
  }
  
  return { accessibilityState: state };
}; 