import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, Card, FAB, Searchbar, IconButton, Button, TextInput, Portal, Modal, Menu, Switch, useTheme } from 'react-native-paper';
import { getGames, addGame, updateGame, deleteGame, getConsoles } from '../services/storage';
import { Game, Console } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import { Disc3, Plus, X, Image as ImageIcon, Calendar, ChevronDown, Upload, MoreVertical, SlidersHorizontal, ChevronLeft } from 'lucide-react-native';
import { appColors } from '../theme';
import { commonStyles } from '../theme/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { backupEventEmitter, BACKUP_EVENTS } from '../services/backup';
import { DatePicker } from '../components/DatePicker';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Lista de regiões disponíveis
const REGIOES = ['Americano', 'Japonês'];

// Lista de gêneros disponíveis
const GENEROS = ['Ação', 'Aventura', 'RPG', 'Estratégia', 'Esporte', 'Corrida', 'Luta', 'Plataforma', 'Outros'];

type MainTabParamList = {
  Home: undefined;
  Games: undefined;
  ConsolesStack: undefined;
  AccessoriesStack: undefined;
  Wishlist: undefined;
  GameDetails: { game: Game };
};

type GamesScreenProps = {
  navigation: BottomTabNavigationProp<MainTabParamList>;
};

const GamesScreen = ({ navigation }: GamesScreenProps) => {
  const theme = useTheme();
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
  });
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    consoleId: '',
    genre: '',
    region: '',
    releaseYear: '',
    purchaseDate: '',
    isPhysical: true,
    imageUrl: '',
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
      Alert.alert('Erro', 'Não foi possível carregar os jogos.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    if (searchQuery || filters.genre || filters.region) {
      const filtered = games.filter(game => {
        const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            game.genre.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesGenre = !filters.genre || game.genre === filters.genre;
        const matchesRegion = !filters.region || game.region === filters.region;

        return matchesSearch && matchesGenre && matchesRegion;
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

  const handleAddGame = async () => {
    try {
      if (!formData.name || !formData.consoleId || !formData.genre || !formData.purchaseDate) {
        Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      // Validar formato da data (DD/MM/YYYY)
      const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
      if (!dateRegex.test(formData.purchaseDate)) {
        Alert.alert('Erro', 'A data de compra deve estar no formato DD/MM/YYYY.');
        return;
      }

      if (editingGame) {
        await updateGame(editingGame.id, formData);
        Alert.alert('Sucesso', 'Jogo atualizado com sucesso!');
      } else {
        await addGame(formData);
        Alert.alert('Sucesso', 'Jogo adicionado com sucesso!');
      }

      setModalVisible(false);
      setEditingGame(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erro ao salvar jogo:', error);
      Alert.alert('Erro', 'Não foi possível salvar o jogo.');
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
    });
    setModalVisible(true);
    setMenuVisible(null);
  };

  const handleDeleteGame = async (id: string) => {
    try {
      await deleteGame(id);
      Alert.alert('Sucesso', 'Jogo excluído com sucesso!');
      loadData();
    } catch (error) {
      console.error('Erro ao excluir jogo:', error);
      Alert.alert('Erro', 'Não foi possível excluir o jogo.');
    }
    setMenuVisible(null);
  };

  const confirmDelete = (id: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este jogo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', onPress: () => handleDeleteGame(id), style: 'destructive' },
      ]
    );
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
              <Disc3 color={appColors.primary} size={32} />
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
        <Disc3 color={appColors.primary} size={32} />
      </View>
      <Text style={commonStyles.emptyStateText}>Nenhum jogo cadastrado</Text>
      <Text style={commonStyles.emptyStateSubtext}>
        Adicione seus jogos para começar a gerenciar sua coleção
      </Text>
    </View>
  );

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
        style={commonStyles.fab}
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
                        Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para selecionar uma imagem.');
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
                      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
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
});

export default GamesScreen; 