import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Text, Searchbar, Button, useTheme } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Gamepad, ArrowLeft, Search, X } from 'lucide-react-native';
import { commonStyles } from '../theme/commonStyles';
import { appColors } from '../theme';
import { searchGames, searchPlatforms, getGameDetails } from '../services/igdbApi';

// Definição do tipo para os parâmetros da rota
type RootStackParamList = {
  IGDBSearch: {
    onSelect: (data: any) => void;
    searchType: 'game' | 'platform';
  };
};

type IGDBSearchScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'IGDBSearch'>;
  route: RouteProp<RootStackParamList, 'IGDBSearch'>;
};

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

const IGDBSearchScreen = ({ navigation, route }: IGDBSearchScreenProps) => {
  const theme = useTheme();
  const { onSelect, searchType = 'game' } = route.params || {};
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: searchType === 'game' ? 'Buscar Jogos' : 'Buscar Consoles',
      headerLeft: () => (
        <TouchableOpacity 
          style={{ marginLeft: 16 }} 
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, searchType, theme]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Digite um termo de busca');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      if (searchType === 'game') {
        const results = await searchGames(searchQuery);
        setSearchResults(results);
      } else {
        const results = await searchPlatforms(searchQuery);
        setSearchResults(results);
      }
    } catch (err) {
      console.error('Erro na busca IGDB:', err);
      setError('Erro ao buscar na API IGDB. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = async (item: any) => {
    if (searchType === 'game') {
      setLoading(true);
      try {
        // Buscar detalhes completos do jogo
        const fullDetails = await getGameDetails(item.id, false);
        
        const gameData = {
          name: item.name,
          genre: item.genres?.length > 0 ? item.genres[0].name : '',
          releaseYear: item.first_release_date 
            ? new Date(item.first_release_date * 1000).getFullYear().toString() 
            : '',
          imageUrl: item.cover ? getImageUrl(item.cover.image_id, 'cover_big') : '',
          igdbId: item.id,
          igdbData: fullDetails || item, // Incluir dados completos do IGDB
        };
        
        if (onSelect) onSelect(gameData);
      } catch (error) {
        console.error('Erro ao buscar detalhes completos do jogo:', error);
        // Em caso de erro, usar dados básicos
        const gameData = {
          name: item.name,
          genre: item.genres?.length > 0 ? item.genres[0].name : '',
          releaseYear: item.first_release_date 
            ? new Date(item.first_release_date * 1000).getFullYear().toString() 
            : '',
          imageUrl: item.cover ? getImageUrl(item.cover.image_id, 'cover_big') : '',
          igdbId: item.id,
          igdbData: item, // Usar dados básicos em caso de erro
        };
        if (onSelect) onSelect(gameData);
      } finally {
        setLoading(false);
      }
    } else {
      const platformData = {
        name: item.name,
        brand: item.platform_family?.name || item.platform_logo?.name || '',
        imageUrl: item.platform_logo 
          ? getImageUrl(item.platform_logo.image_id, 'logo_medium') 
          : '',
      };
      
      if (onSelect) onSelect(platformData);
    }
    
    navigation.goBack();
  };

  const renderItem = ({ item }: { item: any }) => {
    const imageUrl = searchType === 'game' && item.cover
      ? getImageUrl(item.cover.image_id, 'cover_small')
      : searchType === 'platform' && item.platform_logo
        ? getImageUrl(item.platform_logo.image_id, 'logo_medium')
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
          {searchType === 'game' && item.genres && item.genres.length > 0 && (
            <Text style={styles.itemSubtitle} numberOfLines={1}>
              {item.genres[0].name}
            </Text>
          )}
          {searchType === 'game' && item.first_release_date && (
            <Text style={styles.itemSubtitle}>
              {new Date(item.first_release_date * 1000).getFullYear()}
            </Text>
          )}
          {searchType === 'platform' && item.platform_family && (
            <Text style={styles.itemSubtitle}>{item.platform_family.name}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={searchType === 'game' ? "Nome do jogo" : "Nome do console"}
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
            <FlatList
              data={searchResults}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.resultsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery.trim() 
                  ? 'Nenhum resultado encontrado' 
                  : `Digite o nome do ${searchType === 'game' ? 'jogo' : 'console'} para buscar`}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  resultsList: {
    paddingBottom: 16,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default IGDBSearchScreen; 