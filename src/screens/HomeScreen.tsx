import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, TouchableWithoutFeedback, Alert, RefreshControl } from 'react-native';
import { Text, Card, useTheme, IconButton, Button, Portal, Modal } from 'react-native-paper';
import { getGames, getConsoles, getAccessories, getWishlistItems } from '../services/storage';
import { Gamepad, Disc3, Gamepad2, Heart, Menu as MenuIcon, X, Settings, Save, Upload, RefreshCw, Wrench, Eye } from 'lucide-react-native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.7;

type MainTabParamList = {
  Home: undefined;
  GamesStack: undefined;
  ConsolesStack: undefined;
  AccessoriesStack: undefined;
  Wishlist: undefined;
};

type RootStackParamList = {
  MainTabs: undefined;
  Maintenance: undefined;
  Notifications: undefined;
  ApisConfig: undefined;
  ApiConfig: undefined;
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
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
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

      setStats({
        games: games.length,
        consoles: consoles.length,
        accessories: accessories.length,
        wishlist: wishlist.length,
        totalInvested,
        totalInvestedAccessories,
        totalInvestedGames,
        totalEstimatedWishlist,
      });
    } catch (error) {
      console.error('[HomeScreen] Erro ao carregar estatísticas:', error);
      setError('Não foi possível carregar as informações');
      showAlert({
        title: 'Erro ao carregar dados',
        message: 'Não foi possível carregar as informações. Por favor, tente novamente.',
        buttons: [{ text: 'OK', onPress: () => {} }]
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
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      toggleDrawer();
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível criar o backup.',
        buttons: [{ text: 'OK', onPress: () => {} }]
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
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    }
  };

  const confirmRestoreBackup = () => {
    showAlert({
      title: 'Restaurar Backup',
      message: 'Tem certeza que deseja restaurar o backup? Isso substituirá todos os dados atuais.',
      buttons: [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
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

  const handleRestoreBackupFromModal = () => {
    setBackupModalVisible(false);
    confirmRestoreBackup();
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
            <Text style={styles.drawerTitle}>Game Manager</Text>
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
              <View style={[styles.statsCard, { backgroundColor: 'rgba(74, 155, 255, 0.15)' }]}>
                <Text style={[styles.statsNumber, { color: appColors.primary, fontSize: 38 }]}>{stats.games + stats.consoles + stats.accessories}</Text>
                <Text style={[styles.statsLabel, { fontSize: 16, marginBottom: 8 }]}>Total de Itens Cadastrados</Text>
                <View style={[styles.investmentContainer, { backgroundColor: 'rgba(74, 155, 255, 0.2)', width: '100%', paddingVertical: 8 }]}>
                  <Text style={[styles.investmentText, { fontSize: 14 }]}>
                    Total investido: {showValues ? 
                      `R$ ${(stats.totalInvested + stats.totalInvestedAccessories + stats.totalInvestedGames).toFixed(2)}` : 
                      'R$ ******'}
                  </Text>
                </View>
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
                    <View style={styles.investmentContainer}>
                      <Text style={styles.investmentText}>
                        Total investido: {showValues ? `R$ ${stats.totalInvested.toFixed(2)}` : 'R$ ******'}
                      </Text>
                    </View>
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
                    <View style={styles.investmentContainer}>
                      <Text style={styles.investmentText}>
                        Total investido: {showValues ? `R$ ${stats.totalInvestedAccessories.toFixed(2)}` : 'R$ ******'}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.categoryCard}
                onPress={() => navigation.navigate('GamesStack')}
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
                    <View style={styles.investmentContainer}>
                      <Text style={styles.investmentText}>
                        Total investido: {showValues ? `R$ ${stats.totalInvestedGames.toFixed(2)}` : 'R$ ******'}
                      </Text>
                    </View>
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
                    <View style={[styles.investmentContainer, { backgroundColor: 'rgba(255, 87, 87, 0.1)' }]}>
                      <Text style={[styles.investmentText, { color: '#ff5757' }]}>
                        Total estimado: {showValues ? `R$ ${stats.totalEstimatedWishlist.toFixed(2)}` : 'R$ ******'}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      {renderDrawer()}
      
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statsCard: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    paddingHorizontal: 60,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#ffffff',
  },
  statsLabel: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
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
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
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
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
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
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    opacity: 0.8,
  },
  investmentContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(74, 155, 255, 0.1)',
    borderRadius: 8,
    padding: 6,
  },
  investmentText: {
    fontSize: 12,
    color: appColors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backupModalContainer: {
    backgroundColor: 'transparent',
    padding: 20,
    margin: 20,
  },
  backupModalContent: {
    backgroundColor: '#121a2b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backupModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#ffffff',
  },
  backupModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#94a3b8',
  },
  backupModalButtons: {
    gap: 12,
  },
  backupModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: appColors.primary,
  },
  backupModalButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  backupModalButtonContent: {
    flex: 1,
  },
  backupModalButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  backupModalButtonDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  backupModalCancelButton: {
    marginTop: 8,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default HomeScreen; 