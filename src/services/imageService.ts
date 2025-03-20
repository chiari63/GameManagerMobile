import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { formatImageUrl } from './igdbApi';

// Diretório para armazenar as imagens baixadas
const IMAGE_DIRECTORY = `${FileSystem.documentDirectory}igdb_images/`;

/**
 * Garante que o diretório de imagens exista
 */
export const ensureImageDirectoryExists = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIRECTORY);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(IMAGE_DIRECTORY, { intermediates: true });
      console.log('Diretório de imagens IGDB criado');
    }
  } catch (error) {
    console.error('Erro ao criar diretório de imagens:', error);
  }
};

/**
 * Baixa uma imagem da IGDB e a armazena localmente
 * @param imageId ID da imagem na IGDB
 * @param size Tamanho da imagem
 * @param itemId ID do item ao qual a imagem pertence
 * @returns URI da imagem local
 */
export const downloadIGDBImage = async (
  imageId: string,
  size: keyof typeof import('../config/igdbConfig').igdbConfig.imageSizes = 'coverBig',
  itemId: string
): Promise<string> => {
  try {
    if (!imageId) {
      throw new Error('ID da imagem não fornecido');
    }
    
    // Garantir que o diretório exista
    await ensureImageDirectoryExists();
    
    // Gerar nome de arquivo único
    const fileName = `${IMAGE_DIRECTORY}${itemId}_${imageId}_${size}.jpg`;
    
    // Verificar se a imagem já existe
    const fileInfo = await FileSystem.getInfoAsync(fileName);
    if (fileInfo.exists) {
      console.log(`Imagem já existe localmente: ${fileName}`);
      return fileName;
    }
    
    // Obter URL da imagem
    const imageUrl = formatImageUrl(imageId, size);
    
    // Baixar a imagem
    console.log(`Baixando imagem: ${imageUrl}`);
    const downloadResult = await FileSystem.downloadAsync(imageUrl, fileName);
    
    if (downloadResult.status !== 200) {
      throw new Error(`Falha ao baixar imagem: ${downloadResult.status}`);
    }
    
    // Processar a imagem para garantir tamanho e formato adequados
    const processedImage = await ImageManipulator.manipulateAsync(
      fileName,
      [{ resize: { width: 800, height: 600 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    // Remover o arquivo original e salvar o processado
    await FileSystem.deleteAsync(fileName);
    await FileSystem.moveAsync({
      from: processedImage.uri,
      to: fileName
    });
    
    console.log(`Imagem baixada e processada: ${fileName}`);
    return fileName;
  } catch (error) {
    console.error('Erro ao baixar imagem da IGDB:', error);
    throw error;
  }
};

/**
 * Limpa todas as imagens baixadas da IGDB
 */
export const clearIGDBImages = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIRECTORY);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(IMAGE_DIRECTORY, { idempotent: true });
      await FileSystem.makeDirectoryAsync(IMAGE_DIRECTORY, { intermediates: true });
      console.log('Diretório de imagens IGDB limpo');
    }
  } catch (error) {
    console.error('Erro ao limpar diretório de imagens:', error);
  }
}; 