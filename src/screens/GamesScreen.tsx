import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity, Image, ImageBackground, ActivityIndicator, Platform } from 'react-native';
import { Text, FAB, Searchbar, Button, TextInput, Portal, Modal, Menu, useTheme, Switch } from 'react-native-paper';
import { checkIGDBConnection } from '../services/igdbApi';
import { getGames, addGame, updateGame, deleteGame, getConsoles } from '../services/storage';
import { Game, Console } from '../types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Gamepad2, Plus, X, Image as ImageIcon, Edit, Trash2, ChevronDown, Upload, MoreVertical, SlidersHorizontal, ChevronLeft, Search, TrendingUp, Layout, ShoppingBag, WifiOff, Settings, Disc3 } from 'lucide-react-native';
import { appColors } from '../theme';
import { commonStyles } from '../theme/commonStyles';
import { ItemCard } from '../components/ItemCard';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { appEvents, APP_EVENTS } from '../services/events';
import { DatePicker } from '../components/DatePicker';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAlert } from '../contexts/AlertContext';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';
import IGDBGameSearchModal from '../components/IGDBGameSearchModal';
import { GamesStackParamList, MainTabParamList } from '../navigation/types';
import type { RouteProp } from '@react-navigation/native';
import { isValidDate, formatCurrency } from '../utils/formatters';

// Lista de regiões disponíveis
const REGIOES = ['Americano', 'Japonês', 'Brasileiro'];

// Lista de gêneros disponíveis
const GENEROS = ['Ação', 'Aventura', 'RPG', 'Estratégia', 'Esporte', 'Corrida', 'Luta', 'Plataforma', 'Outros'];

type GamesScreenProps = {
  navigation: BottomTabNavigationProp<MainTabParamList>;
  route: RouteProp<GamesStackParamList, 'GamesList'>;
};

const GamesScreen = ({ navigation, route }: GamesScreenProps) => {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const { showValues } = useValuesVisibility();
  const [games, setGames] = useState<Game[]>([]);
  const [consoles, setConsoles] = useState<Console[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [consoleMenuVisible, setConsoleMenuVisible] = useState(false);
  const [genreMenuVisible, setGenreMenuVisible] = useState(false);
  const [regionMenuVisible, setRegionMenuVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    genre: '',
    region: '',
    consoleId: '',
  });
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [filterConsoleMenuVisible, setFilterConsoleMenuVisible] = useState(false);
  const [igdbSearchModalVisible, setIgdbSearchModalVisible] = useState(false);
  const [igdbStatus, setIgdbStatus] = useState<'checking' | 'connected' | 'disconnected'>('disconnected');

  const [formData, setFormData] = useState({
    name: '',
    consoleId: '',
    genre: '',
    region: '',
    releaseYear: '',
    purchaseDate: '',
    isPhysical: true,
    imageUrl: '',
    igdbId: undefined as number | undefined,
    igdbData: undefined as any,
    pricePaid: '',
  });

  const loadData = async () => {
    try {
      const [gamesData, consolesData] = await Promise.all([
        getGames(),
        getConsoles()
      ]);
      setGames(gamesData);
      setConsoles(consolesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível carregar os jogos.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Otimização: Usar useMemo para filtrar jogos apenas quando necessário
  const filteredGames = useMemo(() => {
    const filtered = games.filter(game => {
      const matchesSearch = !searchQuery ||
        game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (game.genre && game.genre.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesGenre = !filters.genre || game.genre === filters.genre;
      const matchesRegion = !filters.region || game.region === filters.region;
      const matchesConsole = !filters.consoleId || game.consoleId === filters.consoleId;

      return matchesSearch && matchesGenre && matchesRegion && matchesConsole;
    });

    return filtered;
  }, [searchQuery, games, filters]);

  // Atualizar contador de filtros ativos
  useEffect(() => {
    const activeFilters = Object.values(filters).filter(value => value !== '').length;
    setActiveFiltersCount(activeFilters);
  }, [filters]);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.autoOpenAdd) {
        setModalVisible(true);
        // Limpar o parâmetro para não abrir novamente ao voltar
        navigation.setParams({ autoOpenAdd: undefined } as any);
      }
      if (route.params?.editingGame) {
        handleEditGame(route.params.editingGame);
        // Limpar o parâmetro
        navigation.setParams({ editingGame: undefined } as any);
      }
    }, [route.params?.autoOpenAdd, route.params?.editingGame])
  );

  // Adiciona listener para o evento de restauração
  useEffect(() => {
    const handleUpdate = () => {
      loadData();
    };

    appEvents.on(APP_EVENTS.RESTORE_COMPLETED, handleUpdate);
    appEvents.on(APP_EVENTS.DATA_CHANGED, handleUpdate);

    return () => {
      appEvents.off(APP_EVENTS.RESTORE_COMPLETED, handleUpdate);
      appEvents.off(APP_EVENTS.DATA_CHANGED, handleUpdate);
    };
  }, []);

  // Verifica status da API IGDB quando o modal de cadastro abre (reativo)
  useEffect(() => {
    if (!modalVisible) return;
    let cancelled = false;
    setIgdbStatus('checking');
    checkIGDBConnection()
      .then((result) => {
        if (!cancelled) setIgdbStatus(result.connected ? 'connected' : 'disconnected');
      })
      .catch(() => {
        if (!cancelled) setIgdbStatus('disconnected');
      });
    return () => { cancelled = true; };
  }, [modalVisible]);


  const handleAddGame = async () => {
    // Validar campos obrigatórios
    if (!formData.name || !formData.purchaseDate) {
      showAlert({
        title: 'Erro',
        message: 'Por favor, preencha o nome e a data de compra do jogo.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
      return;
    }

    // Validar formato da data
    if (!isValidDate(formData.purchaseDate)) {
      showAlert({
        title: 'Erro',
        message: 'A data de compra deve estar no formato DD/MM/YYYY.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
      return;
    }

    try {
      // Converter o preço de string para number e preparar dados do jogo
      const gameData = {
        ...formData,
        pricePaid: formData.pricePaid ? parseFloat(formData.pricePaid) : undefined,
        igdbData: formData.igdbData, // Incluir dados completos do IGDB
      };

      if (editingGame) {
        await updateGame(editingGame.id, gameData);
        showAlert({
          title: 'Sucesso',
          message: 'Jogo atualizado com sucesso!',
          buttons: [{ text: 'OK', onPress: () => { } }]
        });
      } else {
        await addGame(gameData);
        showAlert({
          title: 'Sucesso',
          message: 'Jogo adicionado com sucesso!',
          buttons: [{ text: 'OK', onPress: () => { } }]
        });
      }

      setModalVisible(false);
      setEditingGame(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erro ao salvar jogo:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível salvar o jogo.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
    }
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setFormData({
      name: game.name,
      consoleId: game.consoleId || '',
      genre: game.genre || '',
      region: game.region || '',
      releaseYear: game.releaseYear || '',
      purchaseDate: game.purchaseDate || '',
      isPhysical: game.isPhysical ?? true,
      imageUrl: game.imageUrl || '',
      igdbId: game.igdbId,
      igdbData: game.igdbData, // Carregar dados completos do IGDB
      pricePaid: game.pricePaid ? game.pricePaid.toString() : '',
    });
    setModalVisible(true);
    setMenuVisible(null);
  };

  const handleDeleteGame = async (id: string) => {
    try {
      await deleteGame(id);
      showAlert({
        title: 'Sucesso',
        message: 'Jogo excluído com sucesso!',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
      loadData();
    } catch (error) {
      console.error('Erro ao excluir jogo:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível excluir o jogo.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
    }
    setMenuVisible(null);
  };

  const confirmDelete = (id: string) => {
    showAlert({
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este jogo?',
      buttons: [
        { text: 'Cancelar', onPress: () => { }, style: 'cancel' },
        { text: 'Excluir', onPress: () => handleDeleteGame(id), style: 'destructive' },
      ]
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      consoleId: '',
      genre: '',
      region: '',
      releaseYear: '',
      purchaseDate: '',
      isPhysical: true,
      imageUrl: '',
      igdbId: undefined as number | undefined,
      igdbData: undefined as any,
      pricePaid: '',
    });
  };

  const openModal = () => {
    setEditingGame(null);
    resetForm();
    setModalVisible(true);
  };

  const handleViewDetails = (game: Game) => {
    navigation.navigate('GameDetails', { game });
  };

  const getConsoleName = (consoleId: string) => {
    const console = consoles.find(c => c.id === consoleId);
    return console ? console.name : 'N/A';
  };

  const handleResetFilters = () => {
    setFilters({
      genre: '',
      region: '',
      consoleId: '',
    });
  };

  const renderFilterModal = () => (
    <Portal>
      <Modal
        visible={filterModalVisible}
        onDismiss={() => setFilterModalVisible(false)}
        contentContainerStyle={[commonStyles.modal, { maxHeight: '80%' }]}
      >
        <ScrollView>
          <View style={styles.modalHeader}>
            <Text style={commonStyles.modalTitle}>Filtros</Text>
            <Button
              mode="text"
              onPress={handleResetFilters}
              labelStyle={[styles.resetButton, activeFiltersCount === 0 && { opacity: 0.5 }]}
              disabled={activeFiltersCount === 0}
            >
              Limpar
            </Button>
          </View>

          <View style={commonStyles.formGroup}>
            <Text style={commonStyles.label}>Gênero</Text>
            <Menu
              visible={genreMenuVisible}
              onDismiss={() => setGenreMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setGenreMenuVisible(true)}
                  style={[commonStyles.input, styles.menuButton]}
                >
                  <Text style={{ color: theme.colors.onSurface }}>
                    {filters.genre || 'Todos os gêneros'}
                  </Text>
                  <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={() => {
                  setFilters(prev => ({ ...prev, genre: '' }));
                  setGenreMenuVisible(false);
                }}
                title="Todos os gêneros"
              />
              {GENEROS.map((genero) => (
                <Menu.Item
                  key={genero}
                  onPress={() => {
                    setFilters(prev => ({ ...prev, genre: genero }));
                    setGenreMenuVisible(false);
                  }}
                  title={genero}
                />
              ))}
            </Menu>
          </View>

          <View style={commonStyles.formGroup}>
            <Text style={commonStyles.label}>Região</Text>
            <Menu
              visible={regionMenuVisible}
              onDismiss={() => setRegionMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setRegionMenuVisible(true)}
                  style={[commonStyles.input, styles.menuButton]}
                >
                  <Text style={{ color: theme.colors.onSurface }}>
                    {filters.region || 'Todas as regiões'}
                  </Text>
                  <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={() => {
                  setFilters(prev => ({ ...prev, region: '' }));
                  setRegionMenuVisible(false);
                }}
                title="Todas as regiões"
              />
              {REGIOES.map((regiao) => (
                <Menu.Item
                  key={regiao}
                  onPress={() => {
                    setFilters(prev => ({ ...prev, region: regiao }));
                    setRegionMenuVisible(false);
                  }}
                  title={regiao}
                />
              ))}
            </Menu>
          </View>

          <View style={commonStyles.formGroup}>
            <Text style={commonStyles.label}>Console</Text>
            <Menu
              visible={filterConsoleMenuVisible}
              onDismiss={() => setFilterConsoleMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setFilterConsoleMenuVisible(true)}
                  style={[commonStyles.input, styles.menuButton]}
                >
                  <Text style={{ color: theme.colors.onSurface }}>
                    {filters.consoleId ? getConsoleName(filters.consoleId) : 'Todos os consoles'}
                  </Text>
                  <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={() => {
                  setFilters(prev => ({ ...prev, consoleId: '' }));
                  setFilterConsoleMenuVisible(false);
                }}
                title="Todos os consoles"
              />
              {consoles.map((console) => (
                <Menu.Item
                  key={console.id}
                  onPress={() => {
                    setFilters(prev => ({ ...prev, consoleId: console.id }));
                    setFilterConsoleMenuVisible(false);
                  }}
                  title={console.name}
                />
              ))}
            </Menu>
          </View>

          <Button
            mode="contained"
            onPress={() => setFilterModalVisible(false)}
            style={[commonStyles.button, { backgroundColor: appColors.primary }]}
            labelStyle={commonStyles.buttonText}
          >
            Aplicar Filtros
          </Button>
        </ScrollView>
      </Modal>
    </Portal>
  );

  const renderItem = useCallback(({ item }: { item: Game }) => (
    <ItemCard
      layout="grid"
      title={item.name}
      subtitle={getConsoleName(item.consoleId || '')}
      subtitleStyle={{ color: appColors.primary }}
      imageUri={item.imageUrl}
      placeholderIcon={<Disc3 size={40} color={appColors.primary} />}
      onPress={() => handleViewDetails(item)}
      onLongPress={() => setMenuVisible(item.id)}
      rightElement={
        menuVisible === item.id ? (
          <Menu
            visible={menuVisible === item.id}
            onDismiss={() => setMenuVisible(null)}
            anchor={
              <TouchableOpacity onPress={() => setMenuVisible(item.id)} style={styles.menuIconButton}>
                <MoreVertical color={theme.colors.onSurfaceVariant} size={18} />
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => { setMenuVisible(null); handleEditGame(item); }}
              title="Editar"
              leadingIcon={({ size, color }) => <Edit size={size} color={color} />}
            />
            <Menu.Item
              onPress={() => { setMenuVisible(null); confirmDelete(item.id); }}
              title="Excluir"
              leadingIcon={({ size, color }) => <Trash2 size={size} color={appColors.destructive} />}
              titleStyle={{ color: appColors.destructive }}
            />
          </Menu>
        ) : (
          <TouchableOpacity onPress={() => setMenuVisible(item.id)} style={styles.menuIconButton}>
            <MoreVertical color={theme.colors.onSurfaceVariant} size={18} />
          </TouchableOpacity>
        )
      }
      badge={
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: appColors.primary }]}>
            <Text style={styles.typeBadgeText}>{item.genre}</Text>
          </View>
          {!item.isPhysical && (
            <View style={[styles.typeBadge, styles.badgeDigital]}>
              <Text style={[styles.typeBadgeText, styles.badgeDigitalText]}>Digital</Text>
            </View>
          )}
        </View>
      }
      footer={
        <View style={styles.priceRow}>
          <TrendingUp size={14} color="#25d07c" />
          <Text style={styles.priceText}>
            {showValues ? formatCurrency(item.pricePaid) : 'R$ ••••••'}
          </Text>
        </View>
      }
    />
  ), [menuVisible, consoles, theme, showValues]);

  const EmptyState = () => (
    <View style={commonStyles.emptyState}>
      <View style={commonStyles.emptyStateIcon}>
        <Disc3 color={appColors.primary} size={32} />
      </View>
      <Text style={commonStyles.emptyStateText}>Nenhum jogo cadastrado</Text>
      <Text style={commonStyles.emptyStateSubtext}>
        Adicione seus jogos para começar a gerenciar sua coleção
      </Text>
    </View>
  );

  const renderHeader = () => {
    const totalInvested = games.reduce((sum, item) => sum + (item.pricePaid || 0), 0);

    return (
      <View>
        <ImageBackground
          source={require('../../assets/Jogos.jpg')}
          style={styles.heroBackground}
          imageStyle={styles.heroImageStyle}
        >
          <View style={styles.heroOverlay}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <ChevronLeft color="#ffffff" size={28} />
              </TouchableOpacity>
            </View>
            <View style={styles.heroContent}>
              <View>
                <Text style={styles.heroTitle}>Jogos</Text>
                <Text style={styles.heroSubtitle}>Coleção de Jogos</Text>
              </View>
              <View style={[styles.statsBadge, { backgroundColor: appColors.primary }]}>
                <View style={styles.statsIconCircle}>
                  <Disc3 size={16} color="#fff" />
                </View>
                <Text style={styles.statsBadgeText}>JOGOS</Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.summaryCardContainer}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Investido</Text>
              <Text style={[styles.summaryValue, { color: '#25d07c' }]}>
                {showValues ? formatCurrency(totalInvested) : 'R$ ••••••'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Qtd. Jogos</Text>
              <Text style={styles.summaryValue}>{games.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerControls}>
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Searchbar
                placeholder="Buscar jogos..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={commonStyles.searchbar}
                iconColor={theme.colors.onSurfaceVariant}
                inputStyle={{ color: theme.colors.onSurface }}
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
            </View>
            <TouchableOpacity
              style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
              onPress={() => setFilterModalVisible(true)}
            >
              <SlidersHorizontal
                color={activeFiltersCount > 0 ? '#fff' : theme.colors.onSurfaceVariant}
                size={20}
              />
              {activeFiltersCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Função para lidar com a seleção de um jogo da API IGDB
  const handleIGDBGameSelect = (gameData: any) => {
    console.log('Dados recebidos da busca IGDB:', gameData);

    setFormData({
      ...formData,
      name: gameData.name || formData.name,
      genre: gameData.genre || formData.genre,
      releaseYear: gameData.releaseYear || formData.releaseYear,
      // Manter a imagem existente se já houver, só usar a do IGDB se estiver vazio
      imageUrl: (formData.imageUrl && formData.imageUrl.trim() !== '')
        ? formData.imageUrl
        : (gameData.imageUrl || formData.imageUrl),
      igdbId: gameData.igdbId,
      igdbData: gameData.igdbData, // Salvar dados completos do IGDB
    });

    console.log('FormData atualizado com dados IGDB completos:', formData);
  };

  return (
    <View style={[commonStyles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filteredGames}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContentContainer, filteredGames.length === 0 && { flex: 1 }]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={EmptyState}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        // Otimizações de performance
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      <FAB
        icon={() => <Plus color="#fff" size={24} />}
        onPress={openModal}
        style={[commonStyles.fab, { bottom: 0 }]}
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[commonStyles.modal, { maxHeight: '90%' }]}
          dismissable={true}
          dismissableBackButton={true}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={commonStyles.modalTitle}>
              {editingGame ? 'Editar Jogo' : 'Novo Jogo'}
            </Text>

            {/* Identificação */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Layout size={20} color={appColors.primary} />
                <Text style={styles.sectionTitle}>Identificação</Text>
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Nome do Jogo *</Text>
                <TextInput
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  style={commonStyles.input}
                  mode="flat"
                  placeholder="Ex: The Last of Us Part II"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor="#ffffff"
                  underlineColorAndroid="transparent"
                />
              </View>

              {/* Linha IGDB (opção 3 – reativa ao status da API) */}
              <View style={styles.igdbPlusRow}>
                <View style={styles.igdbPlusTextBlock}>
                  {igdbStatus === 'checking' && (
                    <>
                      <ActivityIndicator size="small" color={appColors.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.igdbPlusText}>Verificando IGDB...</Text>
                    </>
                  )}
                  {igdbStatus === 'connected' && (
                    <Text style={styles.igdbPlusText}>Tem a API IGDB? Preencha automaticamente.</Text>
                  )}
                  {igdbStatus === 'disconnected' && (
                    <>
                      <WifiOff size={16} color="#64748b" style={{ marginRight: 6 }} />
                      <Text style={[styles.igdbPlusText, styles.igdbPlusTextOffline]}>API IGDB (offline)</Text>
                    </>
                  )}
                </View>
                <View style={styles.igdbPlusAction}>
                  {igdbStatus === 'checking' && (
                    <View style={[styles.igdbPlusButton, styles.igdbPlusButtonDisabled]}>
                      <Text style={styles.igdbPlusButtonTextDisabled}>...</Text>
                    </View>
                  )}
                  {igdbStatus === 'connected' && (
                    <Button
                      mode="outlined"
                      compact
                      icon={() => <Search size={16} color={appColors.primary} />}
                      onPress={() => setIgdbSearchModalVisible(true)}
                      style={styles.igdbPlusButton}
                      labelStyle={styles.igdbPlusButtonLabel}
                      contentStyle={styles.igdbPlusButtonContent}
                    >
                      Buscar na IGDB
                    </Button>
                  )}
                  {igdbStatus === 'disconnected' && (
                    <>
                      <Text style={styles.igdbOfflineLabel}>Offline</Text>
                      <TouchableOpacity
                        style={styles.igdbConfigLink}
                        onPress={() => {
                          setModalVisible(false);
                          (navigation as any).navigate('HomeStack', { screen: 'ApiConfig' });
                        }}
                        activeOpacity={0.7}
                      >
                        <Settings size={14} color="#64748b" />
                        <Text style={styles.igdbConfigLinkText}>Configurar</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Console</Text>
                {consoleMenuVisible ? (
                  <Menu
                    visible={consoleMenuVisible}
                    onDismiss={() => setConsoleMenuVisible(false)}
                    anchor={
                      <TouchableOpacity
                        onPress={() => setConsoleMenuVisible(true)}
                        style={[commonStyles.input, styles.menuButton]}
                      >
                        <Text style={{ color: theme.colors.onSurface }}>
                          {formData.consoleId ? getConsoleName(formData.consoleId) : 'Selecione o console'}
                        </Text>
                        <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                      </TouchableOpacity>
                    }
                  >
                    {consoles.map((c) => (
                      <Menu.Item
                        key={c.id}
                        onPress={() => {
                          setFormData({ ...formData, consoleId: c.id });
                          setConsoleMenuVisible(false);
                        }}
                        title={c.name}
                      />
                    ))}
                  </Menu>
                ) : (
                  <TouchableOpacity
                    onPress={() => setConsoleMenuVisible(true)}
                    style={[commonStyles.input, styles.menuButton]}
                  >
                    <Text style={{ color: theme.colors.onSurface }}>
                      {formData.consoleId ? getConsoleName(formData.consoleId) : 'Selecione o console'}
                    </Text>
                    <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Gênero</Text>
                {genreMenuVisible ? (
                  <Menu
                    visible={genreMenuVisible}
                    onDismiss={() => setGenreMenuVisible(false)}
                    anchor={
                      <TouchableOpacity
                        onPress={() => setGenreMenuVisible(true)}
                        style={[commonStyles.input, styles.menuButton]}
                      >
                        <Text style={{ color: theme.colors.onSurface }}>
                          {formData.genre || 'Selecione o gênero'}
                        </Text>
                        <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                      </TouchableOpacity>
                    }
                  >
                    {GENEROS.map((genero) => (
                      <Menu.Item
                        key={genero}
                        onPress={() => {
                          setFormData({ ...formData, genre: genero });
                          setGenreMenuVisible(false);
                        }}
                        title={genero}
                      />
                    ))}
                  </Menu>
                ) : (
                  <TouchableOpacity
                    onPress={() => setGenreMenuVisible(true)}
                    style={[commonStyles.input, styles.menuButton]}
                  >
                    <Text style={{ color: theme.colors.onSurface }}>
                      {formData.genre || 'Selecione o gênero'}
                    </Text>
                    <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Região</Text>
                {regionMenuVisible ? (
                  <Menu
                    visible={regionMenuVisible}
                    onDismiss={() => setRegionMenuVisible(false)}
                    anchor={
                      <TouchableOpacity
                        onPress={() => setRegionMenuVisible(true)}
                        style={[commonStyles.input, styles.menuButton]}
                      >
                        <Text style={{ color: theme.colors.onSurface }}>
                          {formData.region || 'Selecione a região'}
                        </Text>
                        <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                      </TouchableOpacity>
                    }
                  >
                    {REGIOES.map((regiao) => (
                      <Menu.Item
                        key={regiao}
                        onPress={() => {
                          setFormData({ ...formData, region: regiao });
                          setRegionMenuVisible(false);
                        }}
                        title={regiao}
                      />
                    ))}
                  </Menu>
                ) : (
                  <TouchableOpacity
                    onPress={() => setRegionMenuVisible(true)}
                    style={[commonStyles.input, styles.menuButton]}
                  >
                    <Text style={{ color: theme.colors.onSurface }}>
                      {formData.region || 'Selecione a região'}
                    </Text>
                    <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Ano de Lançamento</Text>
                <TextInput
                  value={formData.releaseYear}
                  onChangeText={(text) => setFormData({ ...formData, releaseYear: text })}
                  style={commonStyles.input}
                  mode="flat"
                  placeholder="Ex: 2020"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Aquisição & Valor */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <ShoppingBag size={20} color={appColors.primary} />
                <Text style={styles.sectionTitle}>Aquisição & Valor</Text>
              </View>

              <View style={commonStyles.formGroup}>
                <DatePicker
                  label="Data de Compra *"
                  value={formData.purchaseDate}
                  onChange={(date) => setFormData({ ...formData, purchaseDate: date })}
                  style={commonStyles.formGroup}
                />
              </View>

              <View style={[commonStyles.formGroup, styles.switchContainer]}>
                <View style={styles.switchLabelContainer}>
                  <Gamepad2 size={18} color={theme.colors.onSurfaceVariant} />
                  <Text style={[commonStyles.label, styles.switchLabel]}>Mídia Física</Text>
                </View>
                <Switch
                  value={formData.isPhysical}
                  onValueChange={(value) => setFormData({ ...formData, isPhysical: value })}
                  color={appColors.primary}
                />
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Preço Pago (R$)</Text>
                <TextInput
                  value={formData.pricePaid}
                  onChangeText={(text) => {
                    const sanitizedText = text.replace(/[^0-9.]/g, '');
                    setFormData({ ...formData, pricePaid: sanitizedText });
                  }}
                  style={commonStyles.input}
                  mode="flat"
                  placeholder="Ex: 299.90"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Mídia */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <ImageIcon size={20} color={appColors.primary} />
                <Text style={styles.sectionTitle}>Mídia</Text>
              </View>

              <View style={commonStyles.formGroup}>
                {formData.imageUrl ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: formData.imageUrl }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setFormData({ ...formData, imageUrl: '' })}
                    >
                      <X color="#fff" size={20} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.imageUploader}
                    onPress={async () => {
                      try {
                        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (!permission.granted) {
                          showAlert({
                            title: 'Permissão necessária',
                            message: 'Precisamos de acesso à sua galeria para selecionar uma imagem.',
                            buttons: [{ text: 'OK', onPress: () => { } }]
                          });
                          return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: 'images',
                          allowsEditing: true,
                          aspect: [4, 3],
                          quality: 0.8,
                        });
                        if (!result.canceled) {
                          const processedImage = await ImageManipulator.manipulateAsync(
                            result.assets[0].uri,
                            [{ resize: { width: 800, height: 600 } }],
                            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                          );
                          setFormData({ ...formData, imageUrl: processedImage.uri });
                        }
                      } catch (error) {
                        console.error('Erro ao selecionar imagem:', error);
                        showAlert({
                          title: 'Erro',
                          message: 'Não foi possível selecionar a imagem.',
                          buttons: [{ text: 'OK', onPress: () => { } }]
                        });
                      }
                    }}
                  >
                    <Upload size={32} color="#94a3b8" />
                    <Text style={styles.imageUploaderText}>Toque para selecionar uma imagem</Text>
                    <Text style={styles.imageUploaderSubtext}>Formato 4:3 recomendado</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleAddGame}
              style={[commonStyles.button, { backgroundColor: appColors.primary }]}
              labelStyle={commonStyles.buttonText}
            >
              {editingGame ? 'Salvar Alterações' : 'Adicionar Jogo'}
            </Button>

            <Button
              mode="text"
              onPress={() => setModalVisible(false)}
              style={{ marginTop: 8 }}
              labelStyle={{ color: theme.colors.onSurfaceVariant }}
            >
              Cancelar
            </Button>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Modal de busca na API IGDB */}
      <IGDBGameSearchModal
        visible={igdbSearchModalVisible}
        onClose={() => setIgdbSearchModalVisible(false)}
        onSelect={handleIGDBGameSelect}
      />

      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  heroBackground: {
    height: 200,
    width: '100%',
  },
  heroImageStyle: {
    opacity: 0.85,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 24,
    paddingBottom: 40,
  },
  headerTop: {
    paddingTop: 10,
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statsIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  summaryCardContainer: {
    marginTop: -30,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerControls: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  listContentContainer: {
    paddingBottom: 100,
  },
  columnWrapper: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  menuIconButton: {
    padding: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    color: '#25d07c',
    fontSize: 13,
    fontWeight: 'bold',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#ffffff',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badgeDigital: {
    backgroundColor: 'rgba(251, 113, 133, 0.2)',
  },
  badgeDigitalText: {
    color: '#fb7185',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: appColors.primary,
    borderColor: 'transparent',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  resetButton: {
    color: appColors.primary,
    fontSize: 14,
  },
  imageUploader: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 4 / 3,
  },
  imageUploaderText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  imageUploaderSubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 4 / 3,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelText: {
    marginLeft: 8,
    marginBottom: 0,
  },
  formSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  igdbPlusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  igdbPlusTextBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  igdbPlusText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    flex: 1,
  },
  igdbPlusTextOffline: {
    color: '#64748b',
  },
  igdbPlusAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  igdbPlusButton: {
    borderColor: appColors.primary,
    borderWidth: 1,
    minWidth: 0,
  },
  igdbPlusButtonContent: {
    height: 36,
  },
  igdbPlusButtonLabel: {
    fontSize: 13,
    color: appColors.primary,
    fontWeight: '600',
  },
  igdbPlusButtonDisabled: {
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minWidth: 120,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  igdbPlusButtonTextDisabled: {
    fontSize: 13,
    color: '#64748b',
  },
  igdbOfflineLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  igdbConfigLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  igdbConfigLinkText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
});

export default GamesScreen; 