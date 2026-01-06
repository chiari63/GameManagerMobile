import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, Card, FAB, Searchbar, IconButton, Button, TextInput, Portal, Modal, Menu, Divider, List, useTheme, Switch } from 'react-native-paper';
import { getGames, addGame, updateGame, deleteGame, getConsoles } from '../services/storage';
import { Game, Console } from '../types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Gamepad2, Plus, X, Image as ImageIcon, Calendar, Edit, Trash2, ChevronDown, Settings, Upload, MoreVertical, SlidersHorizontal, ChevronLeft, Bell, Search } from 'lucide-react-native';
import { appColors } from '../theme';
import { commonStyles } from '../theme/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { backupEventEmitter, BACKUP_EVENTS } from '../services/backup';
import { DatePicker } from '../components/DatePicker';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { requestNotificationPermissions } from '../services/notifications';
import { useAlert } from '../contexts/AlertContext';
import IGDBGameSearchModal from '../components/IGDBGameSearchModal';
import { MainTabParamList } from '../navigation/types';

// Lista de regiões disponíveis
const REGIOES = ['Americano', 'Japonês', 'Brasileiro'];

// Lista de gêneros disponíveis
const GENEROS = ['Ação', 'Aventura', 'RPG', 'Estratégia', 'Esporte', 'Corrida', 'Luta', 'Plataforma', 'Outros'];

type GamesScreenProps = {
  navigation: BottomTabNavigationProp<MainTabParamList>;
};

const GamesScreen = ({ navigation }: GamesScreenProps) => {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const [games, setGames] = useState<Game[]>([]);
  const [consoles, setConsoles] = useState<Console[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
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
      setFilteredGames(gamesData);
      setConsoles(consolesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível carregar os jogos.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    if (searchQuery || filters.genre || filters.region || filters.consoleId) {
      const filtered = games.filter(game => {
        const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            game.genre.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesGenre = !filters.genre || game.genre === filters.genre;
        const matchesRegion = !filters.region || game.region === filters.region;
        const matchesConsole = !filters.consoleId || game.consoleId === filters.consoleId;

        return matchesSearch && matchesGenre && matchesRegion && matchesConsole;
      });
      setFilteredGames(filtered);
    } else {
      setFilteredGames(games);
    }

    // Atualiza contador de filtros ativos
    const activeFilters = Object.values(filters).filter(value => value !== '').length;
    setActiveFiltersCount(activeFilters);
  }, [searchQuery, games, filters]);

  // Adiciona listener para o evento de restauração
  useEffect(() => {
    const handleRestore = () => {
      loadData();
    };

    backupEventEmitter.on(BACKUP_EVENTS.RESTORE_COMPLETED, handleRestore);

    return () => {
      backupEventEmitter.off(BACKUP_EVENTS.RESTORE_COMPLETED, handleRestore);
    };
  }, []);

  // Adicionar listener para o botão de voltar na barra de navegação
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('Home')}
          style={{ marginLeft: 8 }}
        >
          <ChevronLeft color={theme.colors.onSurface} size={24} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  // Função para validar formato de data (DD/MM/YYYY)
  const isValidDate = (dateString: string) => {
    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    return dateRegex.test(dateString);
  };

  const handleAddGame = async () => {
    // Validar campos obrigatórios
    if (!formData.name || !formData.consoleId || !formData.genre || !formData.purchaseDate) {
      showAlert({
        title: 'Erro',
        message: 'Por favor, preencha todos os campos obrigatórios.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      return;
    }

    // Validar formato da data
    if (!isValidDate(formData.purchaseDate)) {
      showAlert({
        title: 'Erro',
        message: 'A data de compra deve estar no formato DD/MM/YYYY.',
        buttons: [{ text: 'OK', onPress: () => {} }]
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
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
      } else {
        await addGame(gameData);
        showAlert({
          title: 'Sucesso',
          message: 'Jogo adicionado com sucesso!',
          buttons: [{ text: 'OK', onPress: () => {} }]
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
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    }
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setFormData({
      name: game.name,
      consoleId: game.consoleId,
      genre: game.genre,
      region: game.region,
      releaseYear: game.releaseYear,
      purchaseDate: game.purchaseDate,
      isPhysical: game.isPhysical,
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
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      loadData();
    } catch (error) {
      console.error('Erro ao excluir jogo:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível excluir o jogo.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    }
    setMenuVisible(null);
  };

  const confirmDelete = (id: string) => {
    showAlert({
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este jogo?',
      buttons: [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
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

  const renderItem = ({ item }: { item: Game }) => (
    <View style={styles.cardContainer}>
      <TouchableOpacity onPress={() => handleViewDetails(item)}>
        <Card style={styles.fixedSizeCard}>
          {item.imageUrl ? (
            <Card.Cover
              source={{ uri: item.imageUrl }}
              style={styles.cardCover}
            />
          ) : (
            <View style={styles.placeholderCover}>
              <Gamepad2 color={appColors.primary} size={32} />
            </View>
          )}
          <Card.Content style={styles.contentPadding}>
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <Text style={[commonStyles.itemTitle, styles.cardTitle]} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
                <Text style={[commonStyles.itemSubtitle, styles.cardSubtitle]} numberOfLines={1} ellipsizeMode="tail">{getConsoleName(item.consoleId)}</Text>
              </View>
              <Menu
                visible={menuVisible === item.id}
                onDismiss={() => setMenuVisible(null)}
                anchor={
                  <IconButton
                    icon={() => <MoreVertical color={theme.colors.onSurfaceVariant} size={20} />}
                    onPress={() => setMenuVisible(item.id)}
                    size={20}
                    style={styles.menuIcon}
                  />
                }
              >
                <Menu.Item 
                  onPress={() => {
                    setMenuVisible(null);
                    handleEditGame(item);
                  }} 
                  title="Editar" 
                />
                <Menu.Item 
                  onPress={() => {
                    setMenuVisible(null);
                    confirmDelete(item.id);
                  }} 
                  title="Excluir"
                  titleStyle={{ color: appColors.destructive }}
                />
              </Menu>
            </View>
            <View style={styles.badgeContainer}>
              <View style={[commonStyles.badge, styles.smallBadge]}>
                <Text style={[commonStyles.badgeText, styles.smallBadgeText]}>{item.genre}</Text>
              </View>
              {item.isPhysical ? (
                <View style={[commonStyles.badge, styles.smallBadge, { marginLeft: 4, backgroundColor: 'rgba(74, 222, 128, 0.1)' }]}>
                  <Text style={[commonStyles.badgeText, styles.smallBadgeText, { color: '#4ade80' }]}>Físico</Text>
                </View>
              ) : (
                <View style={[commonStyles.badge, styles.smallBadge, { marginLeft: 4, backgroundColor: 'rgba(251, 113, 133, 0.1)' }]}>
                  <Text style={[commonStyles.badgeText, styles.smallBadgeText, { color: '#fb7185' }]}>Digital</Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    </View>
  );

  const EmptyState = () => (
    <View style={commonStyles.emptyState}>
      <View style={commonStyles.emptyStateIcon}>
        <Gamepad2 color={appColors.primary} size={32} />
      </View>
      <Text style={commonStyles.emptyStateText}>Nenhum jogo cadastrado</Text>
      <Text style={commonStyles.emptyStateSubtext}>
        Adicione seus jogos para começar a gerenciar sua coleção
      </Text>
    </View>
  );

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
      <View style={commonStyles.header}>
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
            style={[
              styles.filterButton,
              activeFiltersCount > 0 && styles.filterButtonActive
            ]}
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

      <FlatList
        data={filteredGames}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContentContainer,
          filteredGames.length === 0 && { flex: 1 }
        ]}
        ListEmptyComponent={EmptyState}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
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
          contentContainerStyle={commonStyles.modal}
          dismissable={true}
          dismissableBackButton={true}
        >
          <ScrollView>
            <Text style={commonStyles.modalTitle}>
              {editingGame ? 'Editar Jogo' : 'Novo Jogo'}
            </Text>

            <View style={commonStyles.formGroup}>
              <Text style={commonStyles.label}>Nome do Jogo</Text>
              <TextInput
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                style={commonStyles.input}
                mode="flat"
                placeholder="Ex: The Last of Us Part II"
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                selectionColor="#ffffff"
                underlineColorAndroid="transparent"
              />
            </View>

            <View style={commonStyles.formGroup}>
              <Button
                mode="outlined"
                icon={() => <Search size={18} color={appColors.primary} />}
                onPress={() => setIgdbSearchModalVisible(true)}
                style={[styles.igdbButton, { borderColor: appColors.primary, borderWidth: 1.5 }]}
                labelStyle={{ color: appColors.primary, fontWeight: 'bold' }}
              >
                Buscar jogo na IGDB
              </Button>
              <Text style={styles.igdbHelpText}>
                Preencha automaticamente os dados do jogo buscando na base IGDB
              </Text>
            </View>

            <View style={commonStyles.formGroup}>
              <Text style={commonStyles.label}>Console</Text>
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
                {consoles.map((console) => (
                  <Menu.Item
                    key={console.id}
                    onPress={() => {
                      setFormData({ ...formData, consoleId: console.id });
                      setConsoleMenuVisible(false);
                    }}
                    title={console.name}
                  />
                ))}
              </Menu>
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
            </View>

            <View style={commonStyles.formGroup}>
              <Text style={commonStyles.label}>Ano de Lançamento</Text>
              <TextInput
                value={formData.releaseYear}
                onChangeText={(text) => setFormData({ ...formData, releaseYear: text })}
                style={commonStyles.input}
                mode="flat"
                placeholder="Ex: 2020"
                keyboardType="numeric"
              />
            </View>

            <View style={commonStyles.formGroup}>
              <DatePicker
                label="Data de Compra"
                value={formData.purchaseDate}
                onChange={(date) => setFormData({ ...formData, purchaseDate: date })}
                style={commonStyles.formGroup}
              />
            </View>

            <View style={[commonStyles.formGroup, styles.switchContainer]}>
              <Text style={commonStyles.label}>Mídia Física</Text>
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
                  // Permitir apenas números e ponto decimal
                  const sanitizedText = text.replace(/[^0-9.]/g, '');
                  setFormData({ ...formData, pricePaid: sanitizedText });
                }}
                style={commonStyles.input}
                mode="flat"
                placeholder="Ex: 299.90"
                keyboardType="numeric"
                selectionColor="#ffffff"
                underlineColorAndroid="transparent"
              />
            </View>

            <View style={commonStyles.formGroup}>
              <View style={styles.labelContainer}>
                <ImageIcon size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={[commonStyles.label, styles.labelText]}>Imagem do Jogo</Text>
              </View>
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
                          buttons: [{ text: 'OK', onPress: () => {} }]
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
                        buttons: [{ text: 'OK', onPress: () => {} }]
                      });
                    }
                  }}
                >
                  <Upload size={32} color="#94a3b8" />
                  <Text style={styles.imageUploaderText}>
                    Toque para selecionar uma imagem
                  </Text>
                  <Text style={styles.imageUploaderSubtext}>
                    A imagem será ajustada para o formato 4:3
                  </Text>
                </TouchableOpacity>
              )}
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
              mode="outlined"
              onPress={() => setModalVisible(false)}
              style={[commonStyles.button, { marginTop: 12 }]}
              labelStyle={[commonStyles.buttonText, { color: theme.colors.onSurface }]}
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
  listContentContainer: {
    padding: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  cardContainer: {
    width: '48%',
    marginHorizontal: 4,
    marginBottom: 16,
  },
  fixedSizeCard: {
    flex: 0,
    width: '100%',
    overflow: 'hidden',
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 4,
    minHeight: 42,
  },
  cardTitle: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
    height: 36,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardCover: {
    height: 140,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  placeholderCover: {
    height: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  contentPadding: {
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 4,
  },
  menuIcon: {
    padding: 8,
  },
  smallBadge: {
    padding: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  smallBadgeText: {
    fontSize: 11,
    fontWeight: '600',
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
    aspectRatio: 4/3,
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
    aspectRatio: 4/3,
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  igdbButton: {
    marginVertical: 8,
    borderColor: appColors.primary,
    height: 48,
    justifyContent: 'center',
  },
  igdbHelpText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default GamesScreen; 