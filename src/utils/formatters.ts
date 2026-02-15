/**
 * Utilitários de formatação de datas e moedas
 */
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Valida se uma string de data está no formato DD/MM/YYYY
 * @param dateString String de data para validar
 * @returns boolean
 */
export const isValidDate = (dateString: string): boolean => {
    if (!dateString) return false;
    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    return dateRegex.test(dateString);
};

/**
 * Formata uma string de data para exibição no formato pt-BR
 * Suporta formatos ISO e DD/MM/YYYY
 * @param dateString String de data original
 * @returns String formatada ou mensagem de erro
 */
export const formatDate = (dateString: string): string => {
    if (!dateString) return 'Data não disponível';

    try {
        // Se já estiver no formato brasileiro DD/MM/YYYY, retorna como está
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return dateString;

        const date = new Date(dateString);

        // Se a data for inválida via construtor Date, tenta parsing manual
        if (isNaN(date.getTime())) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const [day, month, year] = parts;
                const newDate = new Date(Number(year), Number(month) - 1, Number(day));
                if (!isNaN(newDate.getTime())) return dateString;
            }
            return 'Data inválida';
        }

        return date.toLocaleDateString('pt-BR');
    } catch (error) {
        return 'Data inválida';
    }
};

/**
 * Formata uma data para o formato longo (ex: 15 de Fevereiro de 2024)
 * @param dateString String de data original
 * @returns String formatada
 */
export const formatLongDate = (dateString: string): string => {
    if (!dateString) return 'Data não disponível';
    try {
        let date: Date;
        if (dateString.includes('/') && dateString.split('/').length === 3) {
            const [day, month, year] = dateString.split('/');
            date = new Date(Number(year), Number(month) - 1, Number(day));
        } else {
            date = new Date(dateString);
        }

        if (isNaN(date.getTime())) return 'Data inválida';

        return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (error) {
        return 'Data inválida';
    }
};

/**
 * Formata um valor numérico para moeda brasileira (BRL)
 * @param value Valor numérico ou string
 * @param showSymbol Se deve mostrar o símbolo R$ (padrão: true)
 * @returns String formatada
 */
export const formatCurrency = (value: number | string | undefined | null, showSymbol: boolean = true): string => {
    if (value === undefined || value === null || value === '') return 'Preço N/A';

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) return 'Preço N/A';

    const formatted = numValue.toFixed(2).replace('.', ',');
    return showSymbol ? `R$ ${formatted}` : formatted;
};
