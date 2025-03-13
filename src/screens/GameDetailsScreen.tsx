import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Disc3, Calendar, Tag, MapPin, Gamepad } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Game } from '../types';
import { appColors } from '../theme';
import { commonStyles } from '../theme/commonStyles';
import { getConsoles } from '../services/storage';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Games: undefined;
  GameDetails: { game: Game };
};

type GameDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GameDetails'>;

type GameDetailsScreenProps = {
  route: {
    params: {
      game: Game;
    };
  };
  navigation: GameDetailsScreenNavigationProp;
};

const GameDetailsScreen = ({ route, navigation }: GameDetailsScreenProps) => {
  const { game } = route.params;
  const theme = useTheme();
  const [consoleName, setConsoleName] = useState<string>('');

  useEffect(() => {
    const loadConsoleName = async () => {
      try {
        const consoles = await getConsoles();
        const console = consoles.find(c => c.id === game.consoleId);
        setConsoleName(console?.name || 'N/A');
      } catch (error) {
        console.error('Erro ao carregar nome do console:', error);
        setConsoleName('N/A');
      }
    };
    loadConsoleName();
  }, [game.consoleId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {game.imageUrl ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: game.imageUrl }} style={styles.image} resizeMode="cover" />
        </View>
      ) : (
        <View style={styles.placeholderImage}>
          <Disc3 color={appColors.primary} size={64} />
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{game.name}</Text>
        <View style={styles.badgeRow}>
          <View style={[commonStyles.badge, { marginRight: 8 }]}>
            <Text style={commonStyles.badgeText}>{game.genre}</Text>
          </View>
          <View style={[commonStyles.badge, { marginRight: 8 }]}>
            <Text style={commonStyles.badgeText}>{consoleName}</Text>
          </View>
          {game.region && (
            <View style={commonStyles.badge}>
              <Text style={commonStyles.badgeText}>{game.region}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.sectionTitle}>Informações Gerais</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Ano de Lançamento</Text>
            <Text style={styles.infoValue}>{game.releaseYear || 'Não informado'}</Text>

            <Text style={[styles.infoLabel, { marginTop: 12 }]}>Data de Aquisição</Text>
            <Text style={styles.infoValue}>{formatDate(game.purchaseDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Tag size={20} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.sectionTitle}>Detalhes</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Formato</Text>
            <Text style={styles.infoValue}>
              {game.isPhysical ? 'Físico' : 'Digital'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 300,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: 300,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#ffffff',
  },
});

export default GameDetailsScreen; 