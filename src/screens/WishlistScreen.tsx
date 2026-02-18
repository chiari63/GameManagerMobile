import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity, ImageBackground, Platform } from 'react-native';
import { Text, FAB, Searchbar, IconButton, Button, TextInput, Portal, Modal, Menu, useTheme, Switch, Chip, Card, Avatar } from 'react-native-paper';
import { getWishlistItems, addWishlistItem, updateWishlistItem, deleteWishlistItem, addGame, addConsole, addAccessory } from '../services/storage';
import { WishlistItem } from '../types';
import { Heart, Plus, Edit, Trash2, ChevronDown, Tag, Type, Info, DollarSign, ChevronLeft, Gamepad, Sparkles, TrendingUp, Package, Disc3, CheckCircle2, ArrowUpCircle } from 'lucide-react-native';
import { appColors } from '../theme';
import { commonStyles } from '../theme/commonStyles';
import { ItemCard } from '../components/ItemCard';
import { appEvents, APP_EVENTS } from '../services/events';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/types';
import { useAlert } from '../contexts/AlertContext';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';

type WishlistScreenNavigationProp = BottomTabNavigationProp<MainTabParamList>;

const TIPOS = ['game', 'console', 'accessory'];
const PRIORIDADES = ['baixa', 'média', 'alta'];

const TYPE_LABELS: Record<string, string> = {
  game: 'Jogo',
  console: 'Console',
  accessory: 'Acessório'
};

const WishlistScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<WishlistScreenNavigationProp>();
  const { showAlert } = useAlert();
  const { showValues } = useValuesVisibility();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  // filteredItems agora será derivado via useMemo
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [activeType, setActiveType] = useState<'all' | 'game' | 'console' | 'accessory'>('all');
  // stats agora será derivado via useMemo
  const [formData, setFormData] = useState({
    name: '',
    type: 'game' as 'game' | 'console' | 'accessory',
    description: '',
    priority: 'média' as 'baixa' | 'média' | 'alta',
    estimatedPrice: '',
  });

  const loadWishlist = useCallback(async () => {
    try {
      const data = await getWishlistItems();
      setWishlist(data);
    } catch (error) {
      console.error('Erro ao carregar lista de desejos:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível carregar a lista de desejos.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
    }
  }, [showAlert]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleEdit = (item: WishlistItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      description: item.description || '',
      priority: item.priority || 'média',
      estimatedPrice: (item.estimatedPrice !== undefined && item.estimatedPrice !== null) ? item.estimatedPrice.toString() : '',
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWishlistItem(id);
      showAlert({
        title: 'Sucesso',
        message: 'Item removido da lista de desejos!',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
      loadWishlist();
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível excluir o item.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
    }
  };

  const handleSave = async () => {
    try {
      const itemData = {
        ...formData,
        estimatedPrice: formData.estimatedPrice ? parseFloat(formData.estimatedPrice) : 0,
        createdAt: new Date().toISOString(),
      };

      if (editingItem) {
        await updateWishlistItem(editingItem.id, itemData);
        showAlert({
          title: 'Sucesso',
          message: 'Item atualizado com sucesso!',
          buttons: [{ text: 'OK', onPress: () => { } }]
        });
      } else {
        await addWishlistItem(itemData);
        showAlert({
          title: 'Sucesso',
          message: 'Item adicionado com sucesso!',
          buttons: [{ text: 'OK', onPress: () => { } }]
        });
      }
      setModalVisible(false);
      loadWishlist();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível salvar o item.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
    }
  };

  const handlePromoteToCollection = async (item: WishlistItem) => {
    showAlert({
      title: 'Mover para Coleção',
      message: `Deseja adicionar "${item.name}" à sua coleção agora? Isso o removerá da lista de desejos.`,
      buttons: [
        { text: 'Cancelar', onPress: () => { }, style: 'cancel' },
        {
          text: 'Mover Agora',
          style: 'default',
          onPress: async () => {
            try {
              if (item.type === 'game') {
                await addGame({
                  name: item.name,
                  platform: '',
                  genre: '',
                  status: 'para_jogar',
                  purchasePrice: item.estimatedPrice || 0,
                  purchaseDate: new Date().toISOString(),
                  id: '' // addGame handles id
                } as any);
              } else if (item.type === 'console') {
                await addConsole({
                  name: item.name,
                  manufacturer: '',
                  purchasePrice: item.estimatedPrice || 0,
                  purchaseDate: new Date().toISOString(),
                  id: ''
                } as any);
              } else if (item.type === 'accessory') {
                await addAccessory({
                  name: item.name,
                  type: '',
                  purchasePrice: item.estimatedPrice || 0,
                  purchaseDate: new Date().toISOString(),
                  id: ''
                } as any);
              }

              await deleteWishlistItem(item.id);
              loadWishlist();
              showAlert({
                title: 'Parabéns! 🎮',
                message: `"${item.name}" foi movido para sua coleção.`,
                buttons: [{ text: 'Oba!', onPress: () => { } }]
              });
            } catch (error) {
              console.error('Erro ao promover item:', error);
            }
          }
        }
      ]
    });
  };

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  // Otimização: Derivar filteredItems e stats via useMemo
  const { filteredItems, stats } = useMemo(() => {
    const filtered = wishlist.filter(item => {
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = activeType === 'all' || item.type === activeType;
      return matchesSearch && matchesType;
    });

    const totalItems = wishlist.length;
    const totalValue = wishlist.reduce((acc, curr) => acc + (curr.estimatedPrice || 0), 0);

    return { filteredItems: filtered, stats: { totalItems, totalValue } };
  }, [searchQuery, activeType, wishlist]);

  useEffect(() => {
    const handleUpdate = () => {
      loadWishlist();
    };

    appEvents.on(APP_EVENTS.RESTORE_COMPLETED, handleUpdate);
    appEvents.on(APP_EVENTS.DATA_CHANGED, handleUpdate);

    return () => {
      appEvents.off(APP_EVENTS.RESTORE_COMPLETED, handleUpdate);
      appEvents.off(APP_EVENTS.DATA_CHANGED, handleUpdate);
    };
  }, []);

  // Ocultar o cabeçalho padrão para usar o cabeçalho imersivo
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);


  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta':
        return '#ef4444';
      case 'média':
        return '#f59e0b';
      case 'baixa':
        return '#10b981';
      default:
        return '#ff5757';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'game':
        return appColors.primary;
      case 'console':
        return appColors.console;
      case 'accessory':
        return '#f59e0b'; // Orange
      default:
        return appColors.mutedForeground;
    }
  };

  const getIconForType = (type: string, color?: string) => {
    const iconColor = color || getColorForType(type);
    switch (type) {
      case 'game':
        return <Disc3 size={20} color={iconColor} />;
      case 'console':
        return <Gamepad size={20} color={iconColor} />;
      case 'accessory':
        return <Package size={20} color={iconColor} />;
      default:
        return <Info size={20} color={iconColor} />;
    }
  };

  const renderItem = useCallback(({ item }: { item: WishlistItem }) => (
    <View style={styles.cardWrapper}>
      <Card style={[styles.wishCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeIconContainer, { backgroundColor: `${getColorForType(item.type)}15` }]}>
            {getIconForType(item.type)}
          </View>
          <View style={styles.priorityBadgeWrapper}>
            <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(item.priority || 'média')}20` }]}>
              <Text style={[styles.priorityBadgeText, { color: getPriorityColor(item.priority || 'média') }]}>
                {item.priority?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <Card.Content style={styles.cardContent}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.name}</Text>
          <Text style={[styles.itemType, { color: getColorForType(item.type) }]}>
            {TYPE_LABELS[item.type]?.toUpperCase() || item.type.toUpperCase()}
          </Text>

          {item.estimatedPrice ? (
            <View style={styles.priceTag}>
              <TrendingUp size={14} color="#25d07c" />
              <Text style={[styles.priceValue, { color: '#25d07c' }]}>
                {showValues ? `R$ ${item.estimatedPrice.toFixed(2)}` : 'R$ ••••••'}
              </Text>
            </View>
          ) : (
            <Text style={styles.noPrice}>Preço não definido</Text>
          )}

          {item.description ? (
            <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </Card.Content>

        <View style={styles.divider} />

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: `${appColors.primary}20` }]}
            onPress={() => handlePromoteToCollection(item)}
          >
            <ArrowUpCircle size={18} color={appColors.primary} />
            <Text style={[styles.actionBtnText, { color: appColors.primary }]}>Adquirir</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <IconButton
              icon={() => <Edit size={18} color={theme.colors.onSurfaceVariant} />}
              onPress={() => handleEdit(item)}
              size={20}
            />
            <IconButton
              icon={() => <Trash2 size={18} color={appColors.destructive} />}
              onPress={() => handleDelete(item.id)}
              size={20}
            />
          </View>
        </View>
      </Card>
    </View>
  ), [theme, showValues, appColors]);

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Heart color={appColors.primary} size={48} fill={`${appColors.primary}30`} />
      </View>
      <Text style={styles.emptyTitle}>Sua lista está tranquila...</Text>
      <Text style={styles.emptySubtitle}>
        Comece a planejar suas próximas aquisições e acompanhe as prioridades aqui.
      </Text>
      <Button
        mode="contained"
        onPress={() => setModalVisible(true)}
        style={styles.emptyButton}
        icon="plus"
      >
        Novo Desejo
      </Button>
    </View>
  );

  const renderHeader = () => (
    <View>
      <ImageBackground
        source={require('../../assets/desejo.jpg')}
        style={styles.heroBackground}
        imageStyle={styles.heroImage}
      >
        <View style={styles.heroOverlay}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <ChevronLeft color="#ffffff" size={28} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroContent}>
            <View>
              <Text style={styles.heroTitle}>Meus Planos</Text>
              <Text style={styles.heroSubtitle}>Lista de Desejos & Metas</Text>
            </View>
            <View style={styles.statsBadge}>
              <View style={styles.statsIconCircle}>
                <TrendingUp size={16} color="#fff" />
              </View>
              <Text style={styles.statsBadgeText}>INVESTIMENTO</Text>
            </View>
          </View>
        </View>
      </ImageBackground>

      {/* Summary Card */}
      <View style={styles.summaryCardContainer}>
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Estimado</Text>
            <Text style={[styles.summaryValue, { color: '#25d07c' }]}>
              {showValues ? `R$ ${stats.totalValue.toFixed(2)}` : 'R$ ••••••'}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Itens Planejados</Text>
            <Text style={styles.summaryValue}>{stats.totalItems}</Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        <Searchbar
          placeholder="Buscar desejos..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.wishlistSearch}
          inputStyle={{ fontSize: 14 }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <Chip
            selected={activeType === 'all'}
            onPress={() => setActiveType('all')}
            style={styles.filterChip}
            selectedColor={appColors.primary}
            showSelectedOverlay
          >Tudo</Chip>
          <Chip
            selected={activeType === 'game'}
            onPress={() => setActiveType('game')}
            style={styles.filterChip}
            selectedColor={activeType === 'game' ? appColors.primary : undefined}
            icon={() => <Disc3 size={16} color={activeType === 'game' ? appColors.primary : '#888'} />}
          >Jogos</Chip>
          <Chip
            selected={activeType === 'console'}
            onPress={() => setActiveType('console')}
            style={styles.filterChip}
            selectedColor={activeType === 'console' ? appColors.console : undefined}
            icon={() => <Gamepad size={16} color={activeType === 'console' ? appColors.console : '#888'} />}
          >Consoles</Chip>
          <Chip
            selected={activeType === 'accessory'}
            onPress={() => setActiveType('accessory')}
            style={styles.filterChip}
            selectedColor={activeType === 'accessory' ? '#f59e0b' : undefined}
            icon={() => <Package size={16} color={activeType === 'accessory' ? '#f59e0b' : '#888'} />}
          >Acessórios</Chip>
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        // Otimizações de performance
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      <FAB
        icon={() => <Plus color="#fff" size={24} />}
        onPress={() => {
          setEditingItem(null);
          setFormData({
            name: '',
            type: 'game',
            description: '',
            priority: 'média',
            estimatedPrice: '',
          });
          setModalVisible(true);
        }}
        style={[commonStyles.fab, { backgroundColor: appColors.primary, bottom: 0 }]}
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
            <View style={styles.modalHeader}>
              <Heart color={appColors.primary} size={32} />
              <Text style={[commonStyles.modalTitle, { marginLeft: 12, marginBottom: 0 }]}>
                {editingItem ? 'Editar Item' : 'Novo Item'}
              </Text>
            </View>

            <View style={commonStyles.formGroup}>
              <View style={styles.labelContainer}>
                <Tag size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={[commonStyles.label, styles.labelText]}>Nome do Item</Text>
              </View>
              <TextInput
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                style={commonStyles.input}
                mode="flat"
                placeholder="Ex: PlayStation 5"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                selectionColor="#ffffff"
                underlineColorAndroid="transparent"
              />
            </View>

            <View style={commonStyles.formGroup}>
              <View style={styles.labelContainer}>
                <Type size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={[commonStyles.label, styles.labelText]}>Tipo</Text>
              </View>
              {typeMenuVisible ? (
                <Menu
                  visible={typeMenuVisible}
                  onDismiss={() => setTypeMenuVisible(false)}
                  anchor={
                    <TouchableOpacity
                      onPress={() => setTypeMenuVisible(true)}
                      style={[commonStyles.input, styles.menuButton]}
                    >
                      <Text style={{ color: theme.colors.onSurface }}>
                        {TYPE_LABELS[formData.type] || formData.type}
                      </Text>
                      <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                    </TouchableOpacity>
                  }
                >
                  {TIPOS.map((tipo) => (
                    <Menu.Item
                      key={tipo}
                      onPress={() => {
                        setFormData({ ...formData, type: tipo as any });
                        setTypeMenuVisible(false);
                      }}
                      title={TYPE_LABELS[tipo] || tipo}
                      style={styles.menuItem}
                    />
                  ))}
                </Menu>
              ) : (
                <TouchableOpacity
                  onPress={() => setTypeMenuVisible(true)}
                  style={[commonStyles.input, styles.menuButton]}
                >
                  <Text style={{ color: theme.colors.onSurface }}>
                    {TYPE_LABELS[formData.type] || formData.type}
                  </Text>
                  <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                </TouchableOpacity>
              )}
            </View>

            <View style={commonStyles.formGroup}>
              <View style={styles.labelContainer}>
                <Info size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={[commonStyles.label, styles.labelText]}>Descrição (opcional)</Text>
              </View>
              <TextInput
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                style={[commonStyles.input, styles.textArea]}
                mode="flat"
                multiline
                numberOfLines={3}
                placeholder="Adicione uma descrição"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor="#ffffff"
                underlineColorAndroid="transparent"
              />
            </View>

            <View style={commonStyles.formGroup}>
              <View style={styles.labelContainer}>
                <Heart size={18} color={appColors.primary} />
                <Text style={[commonStyles.label, styles.labelText]}>Prioridade</Text>
              </View>
              <View style={styles.priorityContainer}>
                {PRIORIDADES.map((prioridade) => (
                  <TouchableOpacity
                    key={prioridade}
                    style={[
                      styles.priorityButton,
                      formData.priority === prioridade && styles.priorityButtonActive,
                      { backgroundColor: formData.priority === prioridade ? `${getPriorityColor(prioridade)}20` : 'transparent' }
                    ]}
                    onPress={() => setFormData({ ...formData, priority: prioridade as any })}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        formData.priority === prioridade && { color: getPriorityColor(prioridade) }
                      ]}
                    >
                      {prioridade.charAt(0).toUpperCase() + prioridade.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={commonStyles.formGroup}>
              <View style={styles.labelContainer}>
                <DollarSign size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={[commonStyles.label, styles.labelText]}>Preço Estimado (opcional)</Text>
              </View>
              <TextInput
                value={formData.estimatedPrice}
                onChangeText={(text) => setFormData({ ...formData, estimatedPrice: text })}
                style={commonStyles.input}
                mode="flat"
                keyboardType="numeric"
                placeholder="R$ 0,00"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                selectionColor="#ffffff"
                underlineColorAndroid="transparent"
              />
            </View>

            <Button
              mode="contained"
              onPress={handleSave}
              style={[commonStyles.button, { backgroundColor: appColors.primary }]}
              labelStyle={commonStyles.buttonText}
            >
              {editingItem ? 'Salvar Alterações' : 'Adicionar Item'}
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
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: 100,
  },
  columnWrapper: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  heroBackground: {
    height: 200,
    width: '100%',
  },
  heroImage: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)', // Increased opacity for better legibility
    justifyContent: 'flex-end',
    padding: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statsBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsIconCircle: {
    backgroundColor: appColors.primary,
    padding: 4,
    borderRadius: 10,
  },
  statsBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  summaryCardContainer: {
    paddingHorizontal: 24,
    marginTop: -30,
  },
  summaryCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  filterSection: {
    padding: 24,
    gap: 16,
  },
  wishlistSearch: {
    height: 44,
    borderRadius: 12,
    elevation: 0,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardWrapper: {
    flex: 0.5,
    padding: 4,
  },
  wishCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    flex: 1, // Let it fill the wrapper but not stretch the entire screen
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeIconContainer: {
    padding: 8,
    borderRadius: 10,
  },
  priorityBadgeWrapper: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContent: {
    paddingTop: 0,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
    minHeight: 40,
  },
  itemType: {
    fontSize: 8,
    color: '#888',
    letterSpacing: 1,
    marginBottom: 8,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  priceValue: {
    fontSize: 13,
    color: appColors.primary,
    fontWeight: 'bold',
  },
  noPrice: {
    fontSize: 11,
    color: '#555',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  itemDescription: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
    height: 32,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16,
  },
  cardActions: {
    flexDirection: 'row',
    padding: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
  },
  emptyContainer: {
    flex: 1,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${appColors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    borderRadius: 15,
    paddingVertical: 4,
    backgroundColor: appColors.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItem: {
    paddingVertical: 12,
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  priorityButtonActive: {
    borderColor: 'transparent',
  },
  priorityButtonText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
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
});

export default WishlistScreen; 