import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, TouchableWithoutFeedback, Alert, RefreshControl } from 'react-native';
import { Text, Card, useTheme, IconButton } from 'react-native-paper';
import { getGames, getConsoles, getAccessories, getWishlistItems } from '../services/storage';
import { Gamepad, Disc3, Gamepad2, Heart, Menu as MenuIcon, X, Settings, Save, Upload, RefreshCw } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { appColors } from '../theme';
import { appConfig } from '../config/app';
import { createBackup, restoreBackup, backupEventEmitter, BACKUP_EVENTS } from '../services/backup';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.7;

type MainTabParamList = {
  Home: undefined;
  Games: undefined;
  ConsolesStack: undefined;
  AccessoriesStack: undefined;
  Wishlist: undefined;
};

type HomeScreenNavigationProp = BottomTabNavigationProp<MainTabParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    games: 0,
    consoles: 0,
    accessories: 0,
    wishlist: 0,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(0)).current;

  // Adicionar listener para o botão de menu na barra de navegação
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <IconButton
          icon={() => <MenuIcon color={theme.colors.onSurface} size={24} />}
          onPress={() => toggleDrawer()}
          style={{ marginLeft: 8 }}
        />
      ),
    });
  }, [navigation, theme]);

  // Adiciona listener para o evento de restauração
  useEffect(() => {
    const handleRestore = () => {
      loadStats();
    };

    backupEventEmitter.on(BACKUP_EVENTS.RESTORE_COMPLETED, handleRestore);

    return () => {
      backupEventEmitter.off(BACKUP_EVENTS.RESTORE_COMPLETED, handleRestore);
    };
  }, []);

  // Adicionar log na montagem do componente
  useEffect(() => {
    console.log('[HomeScreen] Componente montado');
    loadStats().finally(() => {
      setIsLoading(false);
    });

    return () => {
      console.log('[HomeScreen] Componente desmontado');
    };
  }, []);

  const loadStats = async () => {
    console.log('[HomeScreen] Iniciando carregamento de estatísticas');
    try {
      setError(null);
      const [games, consoles, accessories, wishlist] = await Promise.all([
        getGames(),
        getConsoles(),
        getAccessories(),
        getWishlistItems(),
      ]);

      console.log('[HomeScreen] Dados carregados:', {
        games: games.length,
        consoles: consoles.length,
        accessories: accessories.length,
        wishlist: wishlist.length,
      });

      setStats({
        games: games.length,
        consoles: consoles.length,
        accessories: accessories.length,
        wishlist: wishlist.length,
      });
    } catch (error) {
      console.error('[HomeScreen] Erro ao carregar estatísticas:', error);
      setError('Não foi possível carregar as informações');
      Alert.alert(
        'Erro ao carregar dados',
        'Não foi possível carregar as informações. Por favor, tente novamente.'
      );
    }
  };

  // Remover useFocusEffect para evitar múltiplas chamadas
  // e substituir por um botão de atualização manual
  const handleRefresh = () => {
    setIsLoading(true);
    loadStats().finally(() => {
      setIsLoading(false);
    });
  };

  const toggleDrawer = () => {
    const toValue = drawerOpen ? 0 : 1;
    Animated.timing(drawerAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setDrawerOpen(!drawerOpen);
  };

  const translateX = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  const handleCreateBackup = async () => {
    try {
      await createBackup();
      Alert.alert('Sucesso', 'Backup criado com sucesso!');
      toggleDrawer();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar o backup.');
    }
  };

  const handleRestoreBackup = async () => {
    try {
      await restoreBackup();
      Alert.alert('Sucesso', 'Backup restaurado com sucesso!');
      toggleDrawer();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível restaurar o backup.');
    }
  };

  const renderDrawer = () => {
    return (
      <>
        {drawerOpen && (
          <TouchableWithoutFeedback onPress={toggleDrawer}>
            <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
          </TouchableWithoutFeedback>
        )}
        <Animated.View 
          style={[
            styles.drawer, 
            { 
              transform: [{ translateX }],
              backgroundColor: theme.colors.surface,
            }
          ]}
        >
          <View style={[styles.drawerHeader, { borderBottomColor: 'rgba(255, 255, 255, 0.05)' }]}>
            <Text style={[styles.drawerTitle, { color: theme.colors.onSurface }]}>Menu</Text>
            <IconButton
              icon={() => <X color={theme.colors.onSurface} size={20} />}
              onPress={toggleDrawer}
              style={styles.closeButton}
            />
          </View>
          <View style={styles.drawerContent}>
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={handleCreateBackup}
            >
              <View style={styles.drawerItemIcon}>
                <Save color={theme.colors.onSurfaceVariant} size={20} />
              </View>
              <View style={styles.drawerItemContent}>
                <Text style={styles.drawerItemTitle}>Criar Backup</Text>
                <Text style={styles.drawerItemDescription}>
                  Exportar dados do aplicativo
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerItem}
              onPress={handleRestoreBackup}
            >
              <View style={styles.drawerItemIcon}>
                <Upload color={theme.colors.onSurfaceVariant} size={20} />
              </View>
              <View style={styles.drawerItemContent}>
                <Text style={styles.drawerItemTitle}>Restaurar Backup</Text>
                <Text style={styles.drawerItemDescription}>
                  Importar dados de um backup
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.drawerFooter}>
            <Text style={styles.versionText}>
              Versão {appConfig.version} ({appConfig.buildNumber})
            </Text>
          </View>
        </Animated.View>
      </>
    );
  };

  const handleNavigateToAccessories = () => {
    navigation.navigate('AccessoriesStack');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Text>
            <IconButton
              icon={() => <RefreshCw color={theme.colors.primary} size={24} />}
              onPress={handleRefresh}
              style={{ margin: 0 }}
            />
          </View>
        ) : (
          <>
            <View style={styles.titleContainer}>
              <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                Organize sua coleção de jogos, consoles e acessórios
              </Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statsCard}>
                <Text style={styles.statsNumber}>{stats.games + stats.consoles + stats.accessories}</Text>
                <Text style={styles.statsLabel}>Total de Itens</Text>
              </View>
              <View style={styles.statsCard}>
                <Text style={styles.statsNumber}>{stats.wishlist}</Text>
                <Text style={styles.statsLabel}>Lista de Desejos</Text>
              </View>
            </View>

            <View style={styles.categoriesContainer}>
              <TouchableOpacity
                style={styles.categoryCard}
                onPress={() => navigation.navigate('ConsolesStack')}
              >
                <Card 
                  style={[
                    styles.card, 
                    { 
                      backgroundColor: theme.colors.surface,
                      borderRadius: 16,
                    }
                  ]}
                >
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconWrapper, { backgroundColor: 'rgba(74, 155, 255, 0.1)' }]}>
                        <Gamepad color={appColors.primary} size={24} />
                      </View>
                      <View style={[styles.counterBadge, { backgroundColor: appColors.primary }]}>
                        <Text style={styles.counterText}>{stats.consoles}</Text>
                      </View>
                    </View>
                    <Text style={styles.categoryTitle}>Consoles</Text>
                    <Text style={styles.categoryDescription}>
                      Gerenciar sua coleção de consoles
                    </Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.categoryCard}
                onPress={handleNavigateToAccessories}
              >
                <Card 
                  style={[
                    styles.card, 
                    { 
                      backgroundColor: theme.colors.surface,
                      borderRadius: 16,
                    }
                  ]}
                >
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconWrapper, { backgroundColor: 'rgba(74, 155, 255, 0.1)' }]}>
                        <Gamepad2 color={appColors.primary} size={24} />
                      </View>
                      <View style={[styles.counterBadge, { backgroundColor: appColors.primary }]}>
                        <Text style={styles.counterText}>{stats.accessories}</Text>
                      </View>
                    </View>
                    <Text style={styles.categoryTitle}>Acessórios</Text>
                    <Text style={styles.categoryDescription}>
                      Organizar seus acessórios e controles
                    </Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.categoryCard}
                onPress={() => navigation.navigate('Games')}
              >
                <Card 
                  style={[
                    styles.card, 
                    { 
                      backgroundColor: theme.colors.surface,
                      borderRadius: 16,
                    }
                  ]}
                >
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconWrapper, { backgroundColor: 'rgba(74, 155, 255, 0.1)' }]}>
                        <Disc3 color={appColors.primary} size={24} />
                      </View>
                      <View style={[styles.counterBadge, { backgroundColor: appColors.primary }]}>
                        <Text style={styles.counterText}>{stats.games}</Text>
                      </View>
                    </View>
                    <Text style={styles.categoryTitle}>Jogos</Text>
                    <Text style={styles.categoryDescription}>
                      Catalogar sua biblioteca de jogos
                    </Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.categoryCard}
                onPress={() => navigation.navigate('Wishlist')}
              >
                <Card 
                  style={[
                    styles.card, 
                    { 
                      backgroundColor: theme.colors.surface,
                      borderRadius: 16,
                    }
                  ]}
                >
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255, 87, 87, 0.1)' }]}>
                        <Heart color="#ff5757" size={24} />
                      </View>
                      <View style={[styles.counterBadge, { backgroundColor: '#ff5757' }]}>
                        <Text style={styles.counterText}>{stats.wishlist}</Text>
                      </View>
                    </View>
                    <Text style={styles.categoryTitle}>Lista de Desejos</Text>
                    <Text style={styles.categoryDescription}>
                      Itens que você deseja adquirir
                    </Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      {renderDrawer()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statsCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(74, 155, 255, 0.1)',
    padding: 16,
    borderRadius: 16,
    minWidth: 140,
  },
  statsNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4a9bff',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  categoriesContainer: {
    padding: 24,
  },
  categoryCard: {
    marginBottom: 16,
  },
  card: {
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
    color: '#ffffff',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    opacity: 0.8,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DRAWER_WIDTH,
    height: '100%',
    zIndex: 1000,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  closeButton: {
    margin: 0,
  },
  drawerContent: {
    padding: 24,
    flex: 1,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  drawerItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  drawerItemContent: {
    flex: 1,
  },
  drawerItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  drawerItemDescription: {
    fontSize: 14,
    color: '#94a3b8',
    opacity: 0.8,
  },
  drawerFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#94a3b8',
    opacity: 0.8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default HomeScreen; 