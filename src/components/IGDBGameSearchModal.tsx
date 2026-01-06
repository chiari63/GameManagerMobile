import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Modal, Portal, Text, Searchbar, Button, useTheme } from 'react-native-paper';
import { Gamepad, Search, X } from 'lucide-react-native';
import { searchGames, getGameDetails } from '../services/igdbApi';
import { appColors } from '../theme';

// Interface para os dados do jogo
interface GameData {
  name: string;
  genre: string;
  releaseYear: string;
  imageUrl: string;
  igdbId?: number;
  igdbData?: any; // Dados completos do IGDB
}

interface IGDBGameSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (gameData: GameData) => void;
}

// Função para obter URL da imagem
const getImageUrl = (imageId: string, size: string): string => {
  const baseUrl = 'https://images.igdb.com/igdb/image/upload';
  const sizeMap: Record<string, string> = {
    cover_small: 't_cover_small',
    cover_big: 't_cover_big',
    logo_medium: 't_logo_med',
    screenshot_big: 't_screenshot_big'
  };
  
  const sizeParam = sizeMap[size] || 't_thumb';
  return `${baseUrl}/${sizeParam}/${imageId}.jpg`;
};

const IGDBGameSearchModal = ({ visible, onClose, onSelect }: IGDBGameSearchModalProps) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Digite um termo de busca');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const results = await searchGames(searchQuery);
      setSearchResults(results);
      
      // Adicionar à história de busca se não existir
      if (!searchHistory.includes(searchQuery)) {
        setSearchHistory(prev => [searchQuery, ...prev].slice(0, 5));
      }
    } catch (err) {
      console.error('Erro na busca IGDB:', err);
      setError('Erro ao buscar na API IGDB. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearResults = () => {
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSelectItem = async (item: any) => {
    console.log('Item IGDB selecionado:', item);
    console.log('ID IGDB do jogo:', item.id);
    
    setLoading(true);
    
    try {
      // Buscar detalhes completos do jogo
      const fullDetails = await getGameDetails(item.id, false);
      
      const gameData: GameData = {
        name: item.name,
        genre: item.genres?.length > 0 ? item.genres[0].name : '',
        releaseYear: item.first_release_date 
          ? new Date(item.first_release_date * 1000).getFullYear().toString() 
          : '',
        imageUrl: item.cover ? getImageUrl(item.cover.image_id, 'cover_big') : '',
        igdbId: item.id,
        igdbData: fullDetails || item, // Usar detalhes completos se disponível, senão usar o item básico
      };
      
      console.log('Dados do jogo a serem passados:', gameData);
      onSelect(gameData);
      onClose();
    } catch (error) {
      console.error('Erro ao buscar detalhes completos do jogo:', error);
      // Em caso de erro, usar os dados básicos
      const gameData: GameData = {
        name: item.name,
        genre: item.genres?.length > 0 ? item.genres[0].name : '',
        releaseYear: item.first_release_date 
          ? new Date(item.first_release_date * 1000).getFullYear().toString() 
          : '',
        imageUrl: item.cover ? getImageUrl(item.cover.image_id, 'cover_big') : '',
        igdbId: item.id,
        igdbData: item, // Usar dados básicos em caso de erro
      };
      onSelect(gameData);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const imageUrl = item.cover
      ? getImageUrl(item.cover.image_id, 'cover_small')
      : null;

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleSelectItem(item)}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.itemImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Gamepad size={24} color={theme.colors.onSurfaceVariant} />
          </View>
        )}
        <View style={styles.itemDetails}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
          {item.genres && item.genres.length > 0 && (
            <Text style={styles.itemSubtitle} numberOfLines={1}>
              {item.genres[0].name}
            </Text>
          )}
          {item.first_release_date && (
            <Text style={styles.itemSubtitle}>
              {new Date(item.first_release_date * 1000).getFullYear()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.background }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Buscar Jogo</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={theme.colors.onBackground} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Nome do jogo"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            icon={() => <Search size={20} color={theme.colors.onSurfaceVariant} />}
            clearIcon={() => <X size={20} color={theme.colors.onSurfaceVariant} />}
            onSubmitEditing={handleSearch}
          />
          <Button 
            mode="contained" 
            onPress={handleSearch} 
            style={styles.searchButton}
            labelStyle={{ fontWeight: 'bold' }}
            disabled={loading}
          >
            Buscar
          </Button>
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={appColors.primary} />
            <Text style={styles.loadingText}>Buscando...</Text>
          </View>
        ) : (
          <>
            {searchResults.length > 0 ? (
              <>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsCount}>
                    {searchResults.length} {searchResults.length === 1 ? 'resultado' : 'resultados'}
                  </Text>
                  <Button 
                    mode="text" 
                    onPress={handleClearResults}
                    compact
                  >
                    Limpar
                  </Button>
                </View>
                <FlatList
                  data={searchResults}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.resultsList}
                  style={styles.list}
                />
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery.trim() 
                    ? 'Nenhum resultado encontrado' 
                    : 'Digite o nome do jogo para buscar'}
                </Text>
                
                {searchHistory.length > 0 && (
                  <View style={styles.historyContainer}>
                    <Text style={styles.historyTitle}>Buscas recentes:</Text>
                    {searchHistory.map((query, index) => (
                      <TouchableOpacity 
                        key={index}
                        style={styles.historyItem}
                        onPress={() => {
                          setSearchQuery(query);
                          setSearchResults([]);
                        }}
                      >
                        <Text style={styles.historyText}>{query}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}

        <View style={styles.footer}>
          <Button 
            mode="outlined" 
            onPress={onClose}
            style={styles.cancelButton}
          >
            Cancelar
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 8,
    padding: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  searchbar: {
    flex: 1,
    marginRight: 8,
    elevation: 2,
  },
  searchButton: {
    height: 50,
    justifyContent: 'center',
    minWidth: 100,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultsCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  list: {
    maxHeight: 400,
  },
  resultsList: {
    paddingBottom: 8,
  },
  resultItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  loadingContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  historyContainer: {
    width: '100%',
    marginTop: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  historyItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  historyText: {
    fontSize: 14,
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    minWidth: 100,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default IGDBGameSearchModal; 