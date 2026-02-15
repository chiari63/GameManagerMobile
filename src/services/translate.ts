/**
 * Serviço de tradução utilizando a API do Google Translate
 */
import axios from 'axios';
import { appLog } from '../config/environment';

/**
 * Traduz um texto de um idioma para outro (padrão: en -> pt)
 * @param text Texto a ser traduzido
 * @param targetLanguage Idioma de destino (padrão: pt)
 * @param sourceLanguage Idioma de origem (padrão: en)
 * @returns Texto traduzido ou original em caso de erro
 */
export const translateText = async (
    text: string,
    targetLanguage: string = 'pt',
    sourceLanguage: string = 'en'
): Promise<string> => {
    if (!text || text.trim() === '') return '';

    try {
        const response = await axios.get(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`
        );

        if (response.data && response.data[0]) {
            // O Google Translate retorna um array de arrays para textos longos
            return response.data[0].map((item: any) => item[0]).join('');
        }

        return text;
    } catch (error) {
        appLog.error('Erro ao traduzir texto:', error);
        return text; // Fallback para o texto original
    }
};
