import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity, RefreshControl, Animated, Dimensions, TouchableWithoutFeedback, ImageBackground } from 'react-native';
import { Text, Card, useTheme, IconButton, Button, Portal, Modal, Avatar, Searchbar, Chip, FAB, Divider } from 'react-native-paper';
import { getGames, getConsoles, getAccessories, getWishlistItems, clearAllData } from '../services/storage';
import { checkAndNotifyOverdue, getOverdueMaintenanceItems } from '../services/notifications';
import { SearchItem, Game, Console, Accessory } from '../types';
import { Search, Menu as MenuIcon, Save, Upload, X, Gamepad, Gamepad2, Disc3, Settings, Eye, Wrench, Calendar, Plus, ChevronRight, LayoutGrid, Heart, Sparkles, Package, DollarSign, AlertTriangle, RefreshCw, Clock, Trash2, TrendingUp, Info } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { appColors } from '../theme';
import { appConfig } from '../config/app';
import { createBackup, restoreBackup, backupEventEmitter, BACKUP_EVENTS } from '../services/backup';
import NotificationIcon from '../components/NotificationIcon';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAlert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';


const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.7;

type MainTabParamList = {
  Home: undefined;
  GamesStack: undefined;
  ConsolesStack: undefined;
  Wishlist: undefined;
  GameDetails: { game: Game };
  ConsoleDetails: { console: Console };
  AccessoryDetails: { accessory: Accessory };
};



type RootStackParamList = {
  MainTabs: undefined;
  Maintenance: undefined;
  Notifications: undefined;
  ApisConfig: undefined;
  ApiConfig: undefined;
  Accessories: undefined;
  GameDetails: { game: Game };
  ConsoleDetails: { console: Console };
  AccessoryDetails: { accessory: Accessory };
};

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const theme = useTheme();
  const { showAlert } = useAlert();
  const { showValues, toggleValuesVisibility } = useValuesVisibility();
  const { currentUser, resetAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    games: 0,
    consoles: 0,
    accessories: 0,
    wishlist: 0,
    totalInvested: 0,
    totalInvestedAccessories: 0,
    totalInvestedGames: 0,
    totalEstimatedWishlist: 0,
    recentGames: [] as Game[],
    wishlistItems: [] as SearchItem[],
  });
  const [overdueCount, setOverdueCount] = useState(0);
  const [randomGameModalVisible, setRandomGameModalVisible] = useState(false);
  const [selectedRandomGame, setSelectedRandomGame] = useState<Game | null>(null);
  const [fabOpen, setFabOpen] = useState(false);

  // Dynamic Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = currentUser.username || 'Gamer';
    if (hour < 5) return `Boa noite, ${name}!`;
    if (hour < 12) return `Bom dia, ${name}!`;
    if (hour < 18) return `Boa tarde, ${name}!`;
    return `Boa noite, ${name}!`;
  };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(0)).current;

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [allItems, setAllItems] = useState<SearchItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SearchItem[]>([]);

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
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
          <NotificationIcon size={24} />
        </View>
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

    // Adicionar log para verificar o valor de totalInvestedAccessories
    console.log('[HomeScreen] Total investido em acessórios:', stats.totalInvestedAccessories);

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

      // Verificar manutenções atrasadas (Nudge e Banner)
      const overdueItems = await getOverdueMaintenanceItems(consoles, accessories);
      setOverdueCount(overdueItems.length);
      checkAndNotifyOverdue(consoles, accessories);

      // Verificar manutenções atrasadas (Nudge)
      checkAndNotifyOverdue(consoles, accessories);

      // Adicionar log para verificar os acessórios e seus preços
      console.log('[HomeScreen] Acessórios carregados:', accessories.map(a => ({ id: a.id, name: a.name, pricePaid: a.pricePaid })));

      // Calcular o total investido em consoles
      const totalInvested = consoles.reduce((total, console) => {
        return total + (console.pricePaid || 0);
      }, 0);

      // Calcular o total investido em acessórios
      const totalInvestedAccessories = accessories.reduce((total, accessory) => {
        return total + (accessory.pricePaid || 0);
      }, 0);

      // Calcular o total investido em jogos
      const totalInvestedGames = games.reduce((total, game) => {
        return total + (game.pricePaid || 0);
      }, 0);

      // Calcular o total estimado da lista de desejos
      const totalEstimatedWishlist = wishlist.reduce((total, item) => {
        return total + (item.estimatedPrice || 0);
      }, 0);

      // Adicionar log para verificar o valor calculado
      console.log('[HomeScreen] Total investido em acessórios (calculado):', totalInvestedAccessories);
      console.log('[HomeScreen] Total investido em jogos (calculado):', totalInvestedGames);
      console.log('[HomeScreen] Total estimado da lista de desejos (calculado):', totalEstimatedWishlist);
      console.log('[HomeScreen] Total de itens cadastrados:', games.length + consoles.length + accessories.length);

      console.log('[HomeScreen] Dados carregados:', {
        games: games.length,
        consoles: consoles.length,
        accessories: accessories.length,
        wishlist: wishlist.length,
        totalInvested,
        totalInvestedAccessories,
        totalInvestedGames,
        totalEstimatedWishlist,
      });

      // Get last 5 games (recent)
      const recentGames = [...games].reverse().slice(0, 5);

      setStats({
        games: games.length,
        consoles: consoles.length,
        accessories: accessories.length,
        wishlist: wishlist.length,
        totalInvested,
        totalInvestedAccessories,
        totalInvestedGames,
        totalEstimatedWishlist,

        recentGames,
        wishlistItems: wishlist.map(w => ({ id: w.id, name: w.name, type: w.type, image: w.imageUrl, originalItem: w })),
      });

      // Prepare items for global search
      const searchItems: SearchItem[] = [
        ...games.map(g => ({ id: g.id, name: g.name, type: 'game' as const, image: g.imageUrl, originalItem: g })),
        ...consoles.map(c => ({ id: c.id, name: c.name, type: 'console' as const, image: c.imageUrl, originalItem: c })),
        ...accessories.map(a => ({ id: a.id, name: a.name, type: 'accessory' as const, image: a.imageUrl, originalItem: a })),
      ];
      setAllItems(searchItems);
    } catch (error) {
      console.error('[HomeScreen] Erro ao carregar estatísticas:', error);
      setError('Não foi possível carregar as informações');
      showAlert({
        title: 'Erro ao carregar dados',
        message: 'Não foi possível carregar as informações. Por favor, tente novamente.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
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
      showAlert({
        title: 'Sucesso',
        message: 'Backup criado com sucesso!',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
      toggleDrawer();
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível criar o backup.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
    }
  };

  const handleRestoreBackup = async () => {
    try {
      await restoreBackup();
      showAlert({
        title: 'Sucesso',
        message: 'Backup restaurado com sucesso!',
        buttons: [{ text: 'OK', onPress: () => loadStats() }]
      });
      toggleDrawer();
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível restaurar o backup.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
    }
  };

  const confirmRestoreBackup = () => {
    showAlert({
      title: 'Restaurar Backup',
      message: 'Tem certeza que deseja restaurar o backup? Isso substituirá todos os dados atuais.',
      buttons: [
        { text: 'Cancelar', onPress: () => { }, style: 'cancel' },
        { text: 'Restaurar', onPress: handleRestoreBackup, style: 'destructive' },
      ]
    });
  };

  const handleBackupMenu = () => {
    toggleDrawer(); // Fechar o drawer primeiro
    setBackupModalVisible(true);
  };

  const handleCreateBackupFromModal = async () => {
    setBackupModalVisible(false);
    await handleCreateBackup();
  };
  const getColorForType = (type: string) => {
    switch (type) {
      case 'game': return appColors.primary;
      case 'console': return appColors.console;
      case 'accessory': return '#f59e0b'; // Orange
      default: return appColors.mutedForeground;
    }
  };

  const getIconForType = (type: string, color?: string) => {
    const iconColor = color || '#ffffff';
    switch (type) {
      case 'game': return <Disc3 size={20} color={iconColor} />;
      case 'console': return <Gamepad2 size={20} color={iconColor} />;
      case 'accessory': return <Package size={20} color={iconColor} />;
      default: return <Info size={20} color={iconColor} />;
    }
  };

  const handleRestoreBackupFromModal = () => {
    setBackupModalVisible(false);
    confirmRestoreBackup();
  };

  const handleClearCollection = () => {
    showAlert({
      title: 'Limpar Coleção',
      message: 'Tem certeza que deseja apagar TODOS os itens da sua coleção? Esta ação é irreversível.',
      buttons: [
        { text: 'Cancelar', onPress: () => { }, style: 'cancel' },
        {
          text: 'Apagar',
          onPress: async () => {
            try {
              await clearAllData();
              await resetAuth();
              await loadStats();
              toggleDrawer();
              showAlert({
                title: 'Sucesso',
                message: 'Sua coleção foi limpa com sucesso.',
                buttons: [{ text: 'OK', onPress: () => { } }]
              });
            } catch (error) {
              console.error('Erro ao limpar coleção:', error);
            }
          },
          style: 'destructive'
        },
      ]
    });
  };

  const handlePickRandomGame = () => {
    const allGames = allItems.filter(i => i.type === 'game');
    if (allGames.length > 0) {
      const randomIndex = Math.floor(Math.random() * allGames.length);
      const randomGame = allGames[randomIndex].originalItem as Game;
      setSelectedRandomGame(randomGame);
      setRandomGameModalVisible(true);
    }
  };

  const renderRandomGameModal = () => {
    if (!selectedRandomGame) return null;

    return (
      <Portal>
        <Modal
          visible={randomGameModalVisible}
          onDismiss={() => setRandomGameModalVisible(false)}
          contentContainerStyle={styles.randomModalContainer}
        >
          <View style={styles.randomModalContent}>
            <Text style={styles.randomModalTitle}>Sugestão para Hoje</Text>

            <View style={styles.randomGameImageContainer}>
              {selectedRandomGame.imageUrl ? (
                <Card.Cover
                  source={{ uri: selectedRandomGame.imageUrl }}
                  style={styles.randomGameImage}
                />
              ) : (
                <View style={[styles.randomGameImage, styles.randomGamePlaceholder]}>
                  <Gamepad color={appColors.primary} size={48} />
                </View>
              )}
            </View>

            <Text style={styles.randomGameName}>{selectedRandomGame.name}</Text>
            <Text style={styles.randomGamePrompt}>Que tal jogar este título agora?</Text>

            <View style={styles.randomModalButtons}>
              <Button
                mode="contained"
                onPress={() => {
                  setRandomGameModalVisible(false);
                  navigation.navigate('GameDetails', { game: selectedRandomGame });
                }}
                style={styles.randomPrimaryButton}
                labelStyle={styles.randomButtonLabel}
              >
                Ver Detalhes
              </Button>

              <View style={styles.randomSecondaryRow}>
                <Button
                  mode="outlined"
                  onPress={handlePickRandomGame}
                  style={styles.randomSecondaryButton}
                  labelStyle={styles.randomSecondaryLabel}
                  icon={() => <RefreshCw size={16} color={theme.colors.primary} />}
                >
                  Trocar
                </Button>

                <Button
                  mode="text"
                  onPress={() => setRandomGameModalVisible(false)}
                  style={styles.randomSecondaryButton}
                  labelStyle={[styles.randomSecondaryLabel, { color: theme.colors.error }]}
                >
                  Sair
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      </Portal>
    );
  };

  const renderDrawer = () => {
    return (
      <>
        <TouchableWithoutFeedback onPress={toggleDrawer}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                display: drawerOpen ? 'flex' : 'none',
              },
            ]}
          />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [
                {
                  translateX: drawerAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-300, 0],
                  }),
                },
              ],
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>{currentUser.username || 'Game Manager'}</Text>
            <IconButton
              icon={() => <X color={theme.colors.onSurface} size={24} />}
              onPress={toggleDrawer}
              style={{ margin: 0 }}
            />
          </View>
          <View style={styles.drawerContent}>
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={handleBackupMenu}
            >
              <View style={styles.drawerItemIcon}>
                <Save color={theme.colors.onSurfaceVariant} size={20} />
              </View>
              <View style={styles.drawerItemContent}>
                <Text style={styles.drawerItemTitle}>Backup e Restauração</Text>
                <Text style={styles.drawerItemDescription}>
                  Criar ou restaurar backup dos dados
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                navigation.navigate('Maintenance');
                toggleDrawer();
              }}
            >
              <View style={styles.drawerItemIcon}>
                <Wrench color={theme.colors.onSurfaceVariant} size={20} />
              </View>
              <View style={styles.drawerItemContent}>
                <Text style={styles.drawerItemTitle}>Manutenções</Text>
                <Text style={styles.drawerItemDescription}>
                  Gerenciar manutenções preventivas
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                toggleValuesVisibility();
                toggleDrawer();
              }}
            >
              <View style={styles.drawerItemIcon}>
                <Eye color={theme.colors.onSurfaceVariant} size={20} />
              </View>
              <View style={styles.drawerItemContent}>
                <Text style={styles.drawerItemTitle}>
                  {showValues ? 'Ocultar Valores' : 'Mostrar Valores'}
                </Text>
                <Text style={styles.drawerItemDescription}>
                  {showValues ? 'Esconder informações de preço' : 'Exibir informações de preço'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                navigation.navigate('ApisConfig');
                toggleDrawer();
              }}
            >
              <View style={styles.drawerItemIcon}>
                <Settings color={theme.colors.onSurfaceVariant} size={20} />
              </View>
              <View style={styles.drawerItemContent}>
                <Text style={styles.drawerItemTitle}>Configurar APIs</Text>
                <Text style={styles.drawerItemDescription}>
                  Configure integrações opcionais (ex.: IGDB)
                </Text>
              </View>
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <Divider style={{ marginVertical: 8, backgroundColor: 'rgba(255,255,255,0.05)' }} />

            <TouchableOpacity
              style={styles.drawerItem}
              onPress={handleClearCollection}
            >
              <View style={[styles.drawerItemIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Trash2 color="#ef4444" size={20} />
              </View>
              <View style={styles.drawerItemContent}>
                <Text style={[styles.drawerItemTitle, { color: '#ef4444' }]}>Limpar Coleção</Text>
                <Text style={styles.drawerItemDescription}>
                  Apagar todos os itens da coleção
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
        <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
          <Searchbar
            placeholder="Buscar na coleção..."
            onChangeText={(query) => {
              setSearchQuery(query);
              if (query.trim() === '') {
                setFilteredItems([]);
              } else {
                const lower = query.toLowerCase();
                setFilteredItems(allItems.filter(item => item.name.toLowerCase().includes(lower)));
              }
            }}
            value={searchQuery}
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: 12,
              elevation: 0,
              height: 48,
            }}
            inputStyle={{ minHeight: 0 }}
          />
        </View>

        {searchQuery.trim().length > 0 ? (
          <View style={{ paddingHorizontal: 24 }}>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              {filteredItems.length} resultados encontrados
            </Text>
            {filteredItems.map((item) => (
              <TouchableOpacity
                key={`${item.type}-${item.id}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.surface,
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 8,
                }}
                onPress={() => {
                  if (item.type === 'game') {
                    // @ts-ignore - Navigation types might need strict check but this works for demo
                    navigation.navigate('GameDetails', { game: item.originalItem });
                  } else if (item.type === 'console') {
                    // @ts-ignore
                    navigation.navigate('ConsoleDetails', { console: item.originalItem });
                  } else if (item.type === 'accessory') {
                    // @ts-ignore
                    navigation.navigate('AccessoryDetails', { accessory: item.originalItem });
                  }
                }}
              >
                {item.image ? (
                  <Card.Cover source={{ uri: item.image }} style={{ width: 50, height: 50, borderRadius: 8 }} />
                ) : (
                  <View style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: theme.colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' }}>
                    {item.type === 'game' && <Disc3 size={24} color={appColors.primary} />}
                    {item.type === 'console' && <Gamepad size={24} color={appColors.primary} />}
                    {item.type === 'accessory' && <DollarSign size={24} color={appColors.primary} />}
                  </View>
                )}
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>{item.name}</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, textTransform: 'capitalize' }}>{item.type}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          /* Main Dashboard Content */
          <>
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
                  <Text style={styles.welcomeText}>{getGreeting()}</Text>
                  <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                    Gerencie sua coleção
                  </Text>
                </View>

                {/* Overdue Maintenance Banner */}
                {overdueCount > 0 && (
                  <TouchableOpacity
                    style={styles.overdueBanner}
                    onPress={() => navigation.navigate('Maintenance')}
                  >
                    <View style={styles.overdueBannerContent}>
                      <AlertTriangle color="#ffffff" size={24} />
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.overdueBannerTitle}>Atenção!</Text>
                        <Text style={styles.overdueBannerText}>
                          Você tem {overdueCount} {overdueCount === 1 ? 'item' : 'itens'} com manutenção atrasada.
                        </Text>
                      </View>
                      <ChevronRight color="rgba(255,255,255,0.7)" size={20} />
                    </View>
                  </TouchableOpacity>
                )}

                {/* Quick Actions Row */}
                <View style={styles.quickActionsContainer}>
                  <TouchableOpacity
                    style={[styles.quickActionButton, { backgroundColor: `${appColors.primary}20`, flex: 1 }]}
                    onPress={handlePickRandomGame}
                  >
                    <Sparkles color={appColors.primary} size={20} />
                    <Text style={[styles.quickActionText, { color: appColors.primary }]}>O que jogar?</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Stats Row */}
                <View style={styles.quickStatsRow}>
                  <View style={[styles.quickStatCard, { backgroundColor: `${appColors.primary}15` }]}>
                    <Disc3 color={appColors.primary} size={24} />
                    <Text style={styles.quickStatValue}>{stats.games}</Text>
                    <Text style={styles.quickStatLabel}>Jogos</Text>
                  </View>

                  <View style={[styles.quickStatCard, { backgroundColor: `${appColors.console}15` }]}>
                    <Gamepad color={appColors.console} size={24} />
                    <Text style={styles.quickStatValue}>{stats.consoles}</Text>
                    <Text style={styles.quickStatLabel}>Consoles</Text>
                  </View>

                  <View style={[styles.quickStatCard, { backgroundColor: 'rgba(37, 208, 124, 0.1)' }]}>
                    <DollarSign color="#25d07c" size={24} />
                    <Text style={styles.quickStatValue}>
                      {showValues ?
                        `R$ ${Math.floor(stats.totalInvested + stats.totalInvestedAccessories + stats.totalInvestedGames)}` :
                        '••••'}
                    </Text>
                    <Text style={styles.quickStatLabel}>Total</Text>
                  </View>
                </View>

                {/* Categories Section (Moved to top) */}
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <LayoutGrid color={appColors.primary} size={18} />
                      <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Categorias</Text>
                    </View>
                  </View>

                  <View style={styles.categoriesContainer}>
                    {/* Consoles - Large Feature Card */}
                    <TouchableOpacity
                      style={styles.featuredCategoryCard}
                      onPress={() => navigation.navigate('ConsolesStack')}
                    >
                      <ImageBackground
                        source={require('../../assets/Consoles.jpg')}
                        style={styles.categoryBgImage}
                        imageStyle={{ borderRadius: 20 }}
                      >
                        <View style={styles.categoryOverlay}>
                          <View style={styles.categoryInfo}>
                            <Text style={styles.categoryMainTitle}>Consoles</Text>
                            <Text style={styles.categorySubtitle}>{stats.consoles} Sistemas</Text>
                          </View>
                          <View style={styles.categoryIconBadge}>
                            <Gamepad color="#ffffff" size={20} />
                          </View>
                        </View>
                      </ImageBackground>
                    </TouchableOpacity>

                    {/* Games & Accessories - Side by Side */}
                    <View style={styles.categoriesRow}>
                      <TouchableOpacity
                        style={styles.halfCategoryCard}
                        onPress={() => navigation.navigate('GamesStack')}
                      >
                        <ImageBackground
                          source={require('../../assets/Jogos.jpg')}
                          style={styles.categoryBgImage}
                          imageStyle={{ borderRadius: 20 }}
                        >
                          <View style={styles.categoryOverlay}>
                            <View style={styles.categoryInfo}>
                              <View style={styles.categoryIconBadgeSmall}>
                                <Disc3 color="#ffffff" size={16} />
                              </View>
                              <Text style={styles.categoryMainTitleSmall}>Jogos</Text>
                              <Text style={styles.categorySubtitleSmall}>{stats.games} Títulos</Text>
                            </View>
                          </View>
                        </ImageBackground>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.halfCategoryCard}
                        onPress={() => navigation.navigate('Accessories')}
                      >
                        <ImageBackground
                          source={require('../../assets/Acessorios.jpg')}
                          style={styles.categoryBgImage}
                          imageStyle={{ borderRadius: 20 }}
                        >
                          <View style={styles.categoryOverlay}>
                            <View style={styles.categoryInfo}>
                              <View style={styles.categoryIconBadgeSmall}>
                                <Package color="#ffffff" size={16} />
                              </View>
                              <Text style={styles.categoryMainTitleSmall}>Acessórios</Text>
                              <Text style={styles.categorySubtitleSmall}>{stats.accessories} Itens</Text>
                            </View>
                          </View>
                        </ImageBackground>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Recent Games Section */}
                {stats.recentGames.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Clock color={appColors.primary} size={18} />
                        <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Adicionados Recentemente</Text>
                      </View>
                      <TouchableOpacity onPress={() => navigation.navigate('GamesStack')}>
                        <Text style={{ color: appColors.primary, fontSize: 14 }}>Ver todos</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}>
                      {stats.recentGames.map((game, index) => (
                        <TouchableOpacity
                          key={game.id}
                          style={styles.recentGameCard}
                          onPress={() => navigation.navigate('GameDetails', { game })}
                        >
                          {game.imageUrl ? (
                            <Card.Cover source={{ uri: game.imageUrl }} style={styles.recentGameCover} />
                          ) : (
                            <View style={[styles.recentGameCover, { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' }]}>
                              <Gamepad color={appColors.primary} size={32} />
                            </View>
                          )}

                          <View style={styles.recentGameInfo}>
                            <Text style={styles.recentGameTitle} numberOfLines={1}>{game.name}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Wishlist Mini-Carousel */}
                {stats.wishlistItems.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Heart color={appColors.primary} size={18} />
                        <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Desejados</Text>
                      </View>
                      <TouchableOpacity onPress={() => navigation.navigate('Wishlist')}>
                        <Text style={{ color: appColors.primary, fontSize: 14 }}>Ver todos</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}>
                      {stats.wishlistItems.slice(0, 5).map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.wishlistMiniCard}
                          onPress={() => navigation.navigate('Wishlist')}
                        >
                          <View style={[styles.wishlistMiniIconCircle, { backgroundColor: `${getColorForType(item.type)}20` }]}>
                            {getIconForType(item.type, getColorForType(item.type))}
                          </View>
                          <View style={{ marginTop: 8 }}>
                            <Text style={styles.wishlistMiniTitle} numberOfLines={1}>{item.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <TrendingUp size={10} color="#25d07c" />
                              <Text style={[styles.wishlistMiniPrice, { color: '#25d07c' }]}>
                                {showValues ? (item.originalItem.estimatedPrice ? `R$ ${item.originalItem.estimatedPrice.toFixed(2)}` : 'Preço N/A') : 'R$ ••••••'}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
      {renderDrawer()}
      {renderRandomGameModal()}

      <FAB.Group
        open={fabOpen}
        visible={true}
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          {
            icon: 'gamepad-variant',
            label: 'Novo Jogo',
            onPress: () => navigation.navigate('GamesStack', { screen: 'GamesList', params: { autoOpenAdd: true } } as any),
          },
          {
            icon: 'console',
            label: 'Novo Console',
            onPress: () => navigation.navigate('ConsolesStack', { screen: 'ConsolesNavigator', params: { autoOpenAdd: true } } as any),
          },
          {
            icon: 'controller-classic',
            label: 'Novo Acessório',
            onPress: () => navigation.navigate('Accessories', { autoOpenAdd: true } as any),
          },
        ]}
        onStateChange={({ open }: { open: boolean }) => setFabOpen(open)}
        onPress={() => {
          if (fabOpen) {
            // do something if the speed dial is open
          }
        }}
        fabStyle={{ backgroundColor: appColors.primary }}
        color="#fff"
      />

      {/* Modal de Backup e Restauração */}
      <Portal>
        <Modal
          visible={backupModalVisible}
          onDismiss={() => setBackupModalVisible(false)}
          contentContainerStyle={styles.backupModalContainer}
        >
          <View style={styles.backupModalContent}>
            <Text style={[styles.backupModalTitle, { color: theme.colors.onSurface }]}>
              Backup e Restauração
            </Text>
            <Text style={[styles.backupModalSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Escolha uma ação:
            </Text>

            <View style={styles.backupModalButtons}>
              <TouchableOpacity
                style={[styles.backupModalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleCreateBackupFromModal}
              >
                <View style={styles.backupModalButtonIcon}>
                  <Save color="#ffffff" size={24} />
                </View>
                <View style={styles.backupModalButtonContent}>
                  <Text style={styles.backupModalButtonTitle}>Criar Backup</Text>
                  <Text style={styles.backupModalButtonDescription}>
                    Exportar dados do aplicativo
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.backupModalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleRestoreBackupFromModal}
              >
                <View style={styles.backupModalButtonIcon}>
                  <Upload color="#ffffff" size={24} />
                </View>
                <View style={styles.backupModalButtonContent}>
                  <Text style={styles.backupModalButtonTitle}>Restaurar Backup</Text>
                  <Text style={styles.backupModalButtonDescription}>
                    Importar dados de um backup
                  </Text>
                </View>
              </TouchableOpacity>

              <Button
                mode="outlined"
                onPress={() => setBackupModalVisible(false)}
                style={styles.backupModalCancelButton}
                labelStyle={{ color: theme.colors.onSurface }}
              >
                Cancelar
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  recentGameCard: {
    width: 140,
    marginRight: 4,
  },
  recentGameCover: {
    height: 180,
    borderRadius: 16,
    width: 140,
  },
  recentGameInfo: {
    marginTop: 8,
  },
  recentGameTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  // Keep required legacy styles if referenced, or replace completely if confident.
  // Replacing categories container for cleaner look
  categoriesContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  categoryCard: {
    marginBottom: 12,
  },
  card: {
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  counterBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    color: '#94a3b8',
    opacity: 0.7,
  },
  investmentContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  investmentText: {
    fontSize: 12,
    color: appColors.primary,
    fontWeight: '500',
  },
  // New Category Styles
  featuredCategoryCard: {
    width: '100%',
    height: 160,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfCategoryCard: {
    flex: 1,
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryBgImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  categoryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 16,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryMainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  categorySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  categoryIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryMainTitleSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  categorySubtitleSmall: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  categoryIconBadgeSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  // Drawer styles
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
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
  },
  drawerContent: {
    padding: 24,
    flex: 1,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  drawerItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  drawerItemContent: {
    flex: 1,
  },
  drawerItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  drawerItemDescription: {
    fontSize: 12,
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
  backupModalContainer: {
    backgroundColor: '#27272a', // Zinc-800 from theme.colors.surface
    margin: 20,
    borderRadius: 24, // More rounded for premium look
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backupModalContent: {
    alignItems: 'center',
  },
  backupModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  backupModalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  backupModalButtons: {
    width: '100%',
    gap: 12,
  },
  backupModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  backupModalButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  backupModalButtonContent: {
    flex: 1,
  },
  backupModalButtonTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  backupModalButtonDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  backupModalCancelButton: {
    marginTop: 8,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
  },
  // Enrichment Styles
  overdueBanner: {
    backgroundColor: '#ef4444',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  overdueBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overdueBannerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overdueBannerText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickActionText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  wishlistMiniCard: {
    width: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  wishlistMiniIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishlistMiniTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  wishlistMiniPrice: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  randomModalContainer: {
    backgroundColor: '#27272a',
    margin: 24,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  randomModalContent: {
    alignItems: 'center',
  },
  randomModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  randomGameImageContainer: {
    width: 160,
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    marginBottom: 16,
  },
  randomGameImage: {
    width: '100%',
    height: '100%',
  },
  randomGamePlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  randomGameName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  randomGamePrompt: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  randomModalButtons: {
    width: '100%',
    gap: 12,
  },
  randomPrimaryButton: {
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
  },
  randomButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  randomSecondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  randomSecondaryButton: {
    flex: 1,
    borderRadius: 12,
  },
  randomSecondaryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeScreen; 