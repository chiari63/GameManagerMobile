import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { formatImageUrl } from '../services/igdbApi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interface para os resultados da busca
interface SearchResult {
  id: number;
  name: string;
  cover?: {
    id: number;
    image_id: string;
  };
  first_release_date?: number;
  platforms?: Array<{ id: number; name: string }>;
  genres?: Array<{ id: number; name: string }>;
  summary?: string;
}

// Props do componente
interface IGDBSearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  onSelectItem: (item: SearchResult) => void;
  emptyMessage?: string;
}

/**
 * Componente para exibir os resultados da busca na API IGDB
 */
const IGDBSearchResults: React.FC<IGDBSearchResultsProps> = ({
  results,
  isLoading,
  onSelectItem,
  emptyMessage = 'Nenhum resultado encontrado'
}) => {
  const theme = useTheme();

  // Formatar data de lançamento
  const formatReleaseDate = (timestamp?: number): string => {
    if (!timestamp) return 'Data desconhecida';
    
    try {
      const date = new Date(timestamp * 1000); // Converter de segundos para milissegundos
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Renderizar um item da lista
  const renderItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity onPress={() => onSelectItem(item)}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          {item.cover?.image_id ? (
            <Image
              source={{ uri: formatImageUrl(item.cover.image_id, 'coverSmall') }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>Sem imagem</Text>
            </View>
          )}
          
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
            
            {item.first_release_date && (
              <Text style={styles.releaseDate}>
                Lançamento: {formatReleaseDate(item.first_release_date)}
              </Text>
            )}
            
            {item.platforms && item.platforms.length > 0 && (
              <Text style={styles.platforms} numberOfLines={1}>
                Plataformas: {item.platforms.map(p => p.name).join(', ')}
              </Text>
            )}
            
            {item.genres && item.genres.length > 0 && (
              <Text style={styles.genres} numberOfLines={1}>
                Gêneros: {item.genres.map(g => g.name).join(', ')}
              </Text>
            )}
            
            {item.summary && (
              <Text style={styles.summary} numberOfLines={2}>
                {item.summary}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  // Renderizar o estado de carregamento
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Buscando dados...</Text>
      </View>
    );
  }

  // Renderizar mensagem quando não há resultados
  if (results.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  // Renderizar a lista de resultados
  return (
    <FlatList
      data={results}
      renderItem={renderItem}
      keyExtractor={item => item.id.toString()}
      contentContainerStyle={styles.listContainer}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 8,
  },
  coverImage: {
    width: 90,
    height: 128,
    borderRadius: 4,
  },
  coverPlaceholder: {
    width: 90,
    height: 128,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  releaseDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  platforms: {
    fontSize: 12,
    marginBottom: 4,
  },
  genres: {
    fontSize: 12,
    marginBottom: 4,
  },
  summary: {
    fontSize: 12,
    marginTop: 4,
  },
  separator: {
    height: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default IGDBSearchResults; 