import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { Text, FAB, Searchbar, IconButton, Button, TextInput, Portal, Modal, Menu, Switch, useTheme } from 'react-native-paper';
import { getAccessories, addAccessory, updateAccessory, deleteAccessory, getConsoles } from '../services/storage';
import { Accessory, Console } from '../types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Gamepad2, Plus, X, Image as ImageIcon, Calendar, MoreVertical, ChevronDown, Settings, Upload, SlidersHorizontal, ChevronLeft, Bell, Edit, Trash2, Search, Info, Package, Tag, ShieldCheck, Layout, TrendingUp } from 'lucide-react-native';
import { View as RNView, ImageBackground } from 'react-native';
import { appColors } from '../theme';
import { commonStyles } from '../theme/commonStyles';
import { ItemCard } from '../components/ItemCard';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { appEvents, APP_EVENTS } from '../services/events';
import { DatePicker } from '../components/DatePicker';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { requestNotificationPermissions } from '../services/notifications';
import { useAlert } from '../contexts/AlertContext';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { RouteProp } from '@react-navigation/native';

// Lista de tipos de acessórios disponíveis
const TIPOS = ['Controles', 'Cabos', 'Memorycards', 'Outros'];

const CONDICOES = [
  'Novo',
  'Como novo',
  'Bom',
  'Regular',
  'Ruim',
  'Para restauro'
];

type AccessoriesScreenProps = {
  navigation: BottomTabNavigationProp<MainTabParamList>;
  route: RouteProp<RootStackParamList, 'Accessories'>;
};

const AccessoriesScreen = ({ navigation, route }: AccessoriesScreenProps) => {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const { showValues } = useValuesVisibility();
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  // filteredAccessories agora será derivado via useMemo
  const [consoles, setConsoles] = useState<Console[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<Accessory | null>(null);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [tipoMenuVisible, setTipoMenuVisible] = useState(false);
  const [consoleMenuVisible, setConsoleMenuVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterConsoleMenuVisible, setFilterConsoleMenuVisible] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    consoleId: '',
  });
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [condicaoMenuVisible, setCondicaoMenuVisible] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    consoleId: '',
    purchaseDate: '',
    lastMaintenanceDate: '',
    maintenanceDescription: '',
    maintenanceInterval: 6, // Valor padrão: 6 meses
    notifyMaintenance: true, // Ativar notificações por padrão
    imageUrl: '',
    condition: '',
    pricePaid: '',
    description: '',
  });

  const loadAccessories = async () => {
    try {
      const [accessoriesData, consolesData] = await Promise.all([
        getAccessories(),
        getConsoles()
      ]);
      setAccessories(accessoriesData);
      setConsoles(consolesData);
    } catch (error) {
      console.error('Erro ao carregar acessórios:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível carregar os acessórios.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAccessories();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (route.params?.autoOpenAdd) {
        setModalVisible(true);
        navigation.setParams({ autoOpenAdd: undefined } as any);
      }
      const editingFromRoute = (route.params as any)?.editingAccessory as Accessory | undefined;
      if (editingFromRoute) {
        setEditingAccessory(editingFromRoute);
        setFormData({
          name: editingFromRoute.name,
          type: editingFromRoute.type || '',
          consoleId: editingFromRoute.consoleId || '',
          purchaseDate: editingFromRoute.purchaseDate || '',
          lastMaintenanceDate: editingFromRoute.lastMaintenanceDate || '',
          maintenanceDescription: editingFromRoute.maintenanceDescription || '',
          maintenanceInterval: editingFromRoute.maintenanceInterval || 6,
          notifyMaintenance: editingFromRoute.notifyMaintenance !== undefined ? editingFromRoute.notifyMaintenance : true,
          imageUrl: editingFromRoute.imageUrl || '',
          condition: editingFromRoute.condition || '',
          pricePaid: editingFromRoute.pricePaid ? editingFromRoute.pricePaid.toString() : '',
          description: editingFromRoute.description || '',
        });
        setModalVisible(true);
        navigation.setParams({ editingAccessory: undefined } as any);
      }
    }, [route.params])
  );

  // Otimização: Usar useMemo para filtrar acessórios apenas quando necessário
  const filteredAccessories = useMemo(() => {
    const filtered = accessories.filter(accessory => {
      const matchesSearch = !searchQuery ||
        accessory.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (accessory.type && accessory.type.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = !filters.type || accessory.type === filters.type;
      const matchesConsole = !filters.consoleId || accessory.consoleId === filters.consoleId;

      return matchesSearch && matchesType && matchesConsole;
    });

    return filtered;
  }, [searchQuery, accessories, filters]);

  // Atualizar contador de filtros ativos
  useEffect(() => {
    const activeFilters = Object.values(filters).filter(value => value !== '').length;
    setActiveFiltersCount(activeFilters);
  }, [filters]);

  // Adiciona listener para o evento de restauração
  useEffect(() => {
    const handleUpdate = () => {
      loadAccessories();
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

  const handleAddAccessory = async () => {
    if (!formData.name || !formData.purchaseDate) {
      showAlert({
        title: 'Campo obrigatório',
        message: 'Por favor, preencha o nome e a data de compra do acessório.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
      return;
    }

    try {
      const newAccessory: Omit<Accessory, 'id'> = {
        name: formData.name,
        type: formData.type,
        consoleId: formData.consoleId,
        purchaseDate: formData.purchaseDate,
        lastMaintenanceDate: formData.lastMaintenanceDate,
        maintenanceDescription: formData.maintenanceDescription,
        maintenanceInterval: formData.maintenanceInterval,
        notifyMaintenance: formData.notifyMaintenance,
        imageUrl: formData.imageUrl,
        condition: formData.condition,
        pricePaid: formData.pricePaid ? parseFloat(formData.pricePaid) : undefined,
        description: formData.description,
      };

      if (editingAccessory) {
        await updateAccessory(editingAccessory.id, newAccessory);
        showAlert({
          title: 'Sucesso',
          message: 'Acessório atualizado com sucesso!',
          buttons: [{ text: 'OK', onPress: () => { } }]
        });
      } else {
        await addAccessory(newAccessory);
        showAlert({
          title: 'Sucesso',
          message: 'Acessório adicionado com sucesso!',
          buttons: [{ text: 'OK', onPress: () => { } }]
        });
      }

      resetForm();
      setModalVisible(false);
      setEditingAccessory(null);
      loadAccessories();
    } catch (error) {
      console.error('Erro ao salvar acessório:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível salvar o acessório.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
    }
  };

  const handleEditAccessory = (accessory: Accessory) => {
    setEditingAccessory(accessory);
    setFormData({
      name: accessory.name,
      type: accessory.type || '',
      consoleId: accessory.consoleId || '',
      purchaseDate: accessory.purchaseDate || '',
      lastMaintenanceDate: accessory.lastMaintenanceDate || '',
      maintenanceDescription: accessory.maintenanceDescription || '',
      maintenanceInterval: accessory.maintenanceInterval || 6,
      notifyMaintenance: accessory.notifyMaintenance !== undefined ? accessory.notifyMaintenance : true,
      imageUrl: accessory.imageUrl || '',
      condition: accessory.condition || '',
      pricePaid: accessory.pricePaid ? accessory.pricePaid.toString() : '',
      description: accessory.description || '',
    });
    setModalVisible(true);
    setMenuVisible(null);
  };

  const handleDeleteAccessory = async (id: string) => {
    try {
      await deleteAccessory(id);
      showAlert({
        title: 'Sucesso',
        message: 'Acessório excluído com sucesso!',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
      loadAccessories();
    } catch (error) {
      console.error('Erro ao excluir acessório:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível excluir o acessório.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
    }
    setMenuVisible(null);
  };

  const confirmDelete = (id: string) => {
    showAlert({
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este acessório?',
      buttons: [
        { text: 'Cancelar', onPress: () => { }, style: 'cancel' },
        { text: 'Excluir', onPress: () => handleDeleteAccessory(id), style: 'destructive' },
      ]
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      consoleId: '',
      purchaseDate: '',
      lastMaintenanceDate: '',
      maintenanceDescription: '',
      maintenanceInterval: 6,
      notifyMaintenance: true,
      imageUrl: '',
      condition: '',
      pricePaid: '',
      description: '',
    });
  };

  const openModal = () => {
    setEditingAccessory(null);
    resetForm();
    setModalVisible(true);
  };

  const handleViewDetails = (accessory: Accessory) => {
    navigation.navigate('AccessoryDetails', { accessory });
  };

  const getConsoleName = (consoleId: string) => {
    const console = consoles.find(c => c.id === consoleId);
    return console ? console.name : 'N/A';
  };

  const handleResetFilters = () => {
    setFilters({
      type: '',
      consoleId: '',
    });
  };

  const renderHeader = () => {
    const totalInvested = accessories.reduce((sum, item) => sum + (item.pricePaid || 0), 0);

    return (
      <View>
        <ImageBackground
          source={require('../../assets/Acessorios.jpg')}
          style={styles.heroImage}
          imageStyle={styles.heroImageStyle}
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
                <Text style={styles.heroTitle}>Acessórios</Text>
                <Text style={styles.heroSubtitle}>Controles & Extras</Text>
              </View>
              <View style={[styles.statsBadge, { backgroundColor: '#f59e0b' }]}>
                <View style={styles.statsIconCircle}>
                  <Package size={16} color="#fff" />
                </View>
                <Text style={styles.statsBadgeText}>ACESSÓRIOS</Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* Summary Card */}
        <View style={styles.summaryCardContainer}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Investido</Text>
              <Text style={[styles.summaryValue, { color: '#25d07c' }]}>
                {showValues ? `R$ ${totalInvested.toFixed(2)}` : 'R$ ••••••'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Qtd. Itens</Text>
              <Text style={styles.summaryValue}>{accessories.length}</Text>
            </View>
          </View>
        </View>

        {/* Search and Filters */}
        <View style={styles.headerControls}>
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Searchbar
                placeholder="Buscar acessórios..."
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
      </View>
    );
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
            <Text style={commonStyles.label}>Tipo</Text>
            <Menu
              visible={tipoMenuVisible}
              onDismiss={() => setTipoMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setTipoMenuVisible(true)}
                  style={[commonStyles.input, styles.menuButton]}
                >
                  <Text style={{ color: theme.colors.onSurface }}>
                    {filters.type || 'Todos os tipos'}
                  </Text>
                  <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={() => {
                  setFilters(prev => ({ ...prev, type: '' }));
                  setTipoMenuVisible(false);
                }}
                title="Todos os tipos"
              />
              {TIPOS.map((tipo) => (
                <Menu.Item
                  key={tipo}
                  onPress={() => {
                    setFilters(prev => ({ ...prev, type: tipo }));
                    setTipoMenuVisible(false);
                  }}
                  title={tipo}
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

  const renderItem = useCallback(({ item }: { item: Accessory }) => (
    <ItemCard
      layout="grid"
      title={item.name}
      subtitle={getConsoleName(item.consoleId || '')}
      subtitleStyle={{ color: '#f59e0b' }}
      imageUri={item.imageUrl}
      placeholderIcon={<Package size={40} color="#f59e0b" />}
      onPress={() => handleViewDetails(item)}
      onLongPress={() => {
        setMenuVisible(item.id);
      }}
      rightElement={
        menuVisible === item.id ? (
          <Menu
            visible={menuVisible === item.id}
            onDismiss={() => setMenuVisible(null)}
            anchor={
              <TouchableOpacity
                onPress={() => setMenuVisible(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MoreVertical color={theme.colors.onSurfaceVariant} size={20} />
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(null);
                handleEditAccessory(item);
              }}
              title="Editar"
              leadingIcon={({ size, color }) => <Edit size={size} color={color} />}
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(null);
                confirmDelete(item.id);
              }}
              title="Excluir"
              leadingIcon={({ size, color }) => <Trash2 size={size} color={appColors.destructive} />}
              titleStyle={{ color: appColors.destructive }}
            />
          </Menu>
        ) : (
          <TouchableOpacity
            onPress={() => setMenuVisible(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MoreVertical color={theme.colors.onSurfaceVariant} size={20} />
          </TouchableOpacity>
        )
      }
      badge={
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{item.type}</Text>
        </View>
      }
      footer={
        <View style={styles.priceRow}>
          <TrendingUp size={14} color="#25d07c" />
          <Text style={styles.priceText}>
            {showValues ? (item.pricePaid ? `R$ ${item.pricePaid.toFixed(2)}` : 'Preço N/A') : 'R$ ••••••'}
          </Text>
        </View>
      }
    />
  ), [menuVisible, consoles, theme, showValues]);

  const EmptyState = () => (
    <View style={commonStyles.emptyState}>
      <View style={[commonStyles.emptyStateIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
        <Package color="#f59e0b" size={32} />
      </View>
      <Text style={commonStyles.emptyStateText}>Nenhum acessório cadastrado</Text>
      <Text style={commonStyles.emptyStateSubtext}>
        Adicione seus acessórios para começar a gerenciar sua coleção
      </Text>
    </View>
  );

  return (
    <View style={[commonStyles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filteredAccessories}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.listContentContainer,
          filteredAccessories.length === 0 && { flex: 1 }
        ]}
        ListEmptyComponent={EmptyState}
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
        onPress={openModal}
        style={[commonStyles.fab, { bottom: 0, backgroundColor: appColors.primary }]}
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
              {editingAccessory ? 'Editar Acessório' : 'Novo Acessório'}
            </Text>

            {/* Identificação */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Layout size={20} color="#f59e0b" />
                <Text style={styles.sectionTitle}>Identificação</Text>
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Nome do Acessório *</Text>
                <TextInput
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  style={commonStyles.input}
                  mode="flat"
                  placeholder="Ex: DualSense"
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor="#ffffff"
                  underlineColorAndroid="transparent"
                />
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Tipo</Text>
                <Menu
                  visible={tipoMenuVisible}
                  onDismiss={() => setTipoMenuVisible(false)}
                  anchor={
                    <TouchableOpacity
                      onPress={() => setTipoMenuVisible(true)}
                      style={[commonStyles.input, styles.menuButton]}
                    >
                      <Text style={{ color: theme.colors.onSurface }}>
                        {formData.type || 'Selecione o tipo'}
                      </Text>
                      <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                    </TouchableOpacity>
                  }
                >
                  {TIPOS.map((tipo) => (
                    <Menu.Item
                      key={tipo}
                      onPress={() => {
                        setFormData({ ...formData, type: tipo });
                        setTipoMenuVisible(false);
                      }}
                      title={tipo}
                    />
                  ))}
                </Menu>
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
                <Text style={commonStyles.label}>Notas / História do Acessório</Text>
                <TextInput
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  style={[commonStyles.input, { height: 100 }]}
                  mode="flat"
                  multiline
                  numberOfLines={4}
                  placeholder="Conte um pouco sobre este acessório..."
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                />
              </View>
            </View>

            {/* Estado e Valor */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Tag size={20} color="#f59e0b" />
                <Text style={styles.sectionTitle}>Estado & Valor</Text>
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Condição</Text>
                {condicaoMenuVisible ? (
                  <Menu
                    visible={condicaoMenuVisible}
                    onDismiss={() => setCondicaoMenuVisible(false)}
                    anchor={
                      <TouchableOpacity
                        onPress={() => setCondicaoMenuVisible(true)}
                        style={[commonStyles.input, styles.menuButton]}
                      >
                        <Text style={{ color: theme.colors.onSurface }}>
                          {formData.condition || 'Selecione a condição'}
                        </Text>
                        <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                      </TouchableOpacity>
                    }
                  >
                    {CONDICOES.map((condition) => (
                      <Menu.Item
                        key={condition}
                        onPress={() => {
                          setFormData({ ...formData, condition });
                          setCondicaoMenuVisible(false);
                        }}
                        title={condition}
                      />
                    ))}
                  </Menu>
                ) : (
                  <TouchableOpacity
                    onPress={() => setCondicaoMenuVisible(true)}
                    style={[commonStyles.input, styles.menuButton]}
                  >
                    <Text style={{ color: theme.colors.onSurface }}>
                      {formData.condition || 'Selecione a condição'}
                    </Text>
                    <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                  </TouchableOpacity>
                )}
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
                  keyboardType="numeric"
                  selectionColor="#ffffff"
                  underlineColorAndroid="transparent"
                />
              </View>

              <DatePicker
                label="Data de Compra *"
                value={formData.purchaseDate}
                onChange={(date) => setFormData({ ...formData, purchaseDate: date })}
                style={commonStyles.formGroup}
              />
            </View>

            {/* Manutenção */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <ShieldCheck size={20} color="#f59e0b" />
                <Text style={styles.sectionTitle}>Cuidado & Manutenção</Text>
              </View>

              <DatePicker
                label="Última Manutenção"
                value={formData.lastMaintenanceDate}
                onChange={(date) => setFormData({ ...formData, lastMaintenanceDate: date })}
                style={commonStyles.formGroup}
              />

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Intervalo de Manutenção (meses)</Text>
                <View style={styles.intervalContainer}>
                  {[3, 6, 12, 24].map((months) => (
                    <TouchableOpacity
                      key={months}
                      style={[
                        styles.intervalButton,
                        formData.maintenanceInterval === months && styles.intervalButtonActive
                      ]}
                      onPress={() => setFormData({ ...formData, maintenanceInterval: months })}
                    >
                      <Text
                        style={[
                          styles.intervalButtonText,
                          formData.maintenanceInterval === months && styles.intervalButtonTextActive
                        ]}
                      >
                        {months}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[commonStyles.formGroup, styles.switchContainer]}>
                <View style={styles.switchLabelContainer}>
                  <Bell size={18} color={theme.colors.onSurfaceVariant} />
                  <Text style={[commonStyles.label, styles.switchLabel]}>
                    Notificar manutenção
                  </Text>
                </View>
                <Switch
                  value={formData.notifyMaintenance}
                  onValueChange={async (value) => {
                    setFormData({ ...formData, notifyMaintenance: value });
                    if (value) {
                      const permissionGranted = await requestNotificationPermissions();
                      if (!permissionGranted) {
                        showAlert({
                          title: 'Permissão',
                          message: 'Ative as notificações para receber alertas.',
                          buttons: [{ text: 'OK', onPress: () => { } }]
                        });
                      }
                    }
                  }}
                  color="#f59e0b"
                />
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Descrição da Manutenção</Text>
                <TextInput
                  value={formData.maintenanceDescription}
                  onChangeText={(text) => setFormData({ ...formData, maintenanceDescription: text })}
                  style={commonStyles.input}
                  mode="flat"
                  multiline
                  numberOfLines={2}
                  placeholder="O que foi feito?"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                />
              </View>
            </View>

            {/* Mídia */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <ImageIcon size={20} color="#f59e0b" />
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
                            title: 'Permissão',
                            message: 'Precisamos de acesso à galeria.',
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
                        showAlert({ title: 'Erro', message: 'Não foi possível selecionar a imagem.' });
                      }
                    }}
                  >
                    <Upload size={32} color="#94a3b8" />
                    <Text style={styles.imageUploaderText}>Toque para adicionar foto</Text>
                    <Text style={styles.imageUploaderSubtext}>Formato 4:3 recomendado</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleAddAccessory}
              style={[commonStyles.button, { backgroundColor: '#f59e0b', marginTop: 24 }]}
              labelStyle={commonStyles.buttonText}
            >
              {editingAccessory ? 'Salvar Alterações' : 'Cadastrar Acessório'}
            </Button>

            <Button
              mode="text"
              onPress={() => setModalVisible(false)}
              style={[{ marginTop: 4, marginBottom: 20 }]}
              labelStyle={[commonStyles.buttonText, { color: theme.colors.onSurfaceVariant, fontSize: 14 }]}
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
    paddingBottom: 100,
  },
  columnWrapper: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
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
  heroImage: {
    height: 200,
    width: '100%',
  },
  heroImageStyle: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
    padding: 24,
    paddingBottom: 40,
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
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerControls: {
    paddingHorizontal: 24,
    marginBottom: 16,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterButtonActive: {
    backgroundColor: '#f59e0b',
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
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  formSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  intervalContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  intervalButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  intervalButtonActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
  },
  intervalButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  intervalButtonTextActive: {
    color: '#f59e0b',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 16,
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    marginBottom: 0,
    color: 'rgba(255,255,255,0.8)',
  },
  imageUploader: {
    height: 160,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  imageUploaderText: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  imageUploaderSubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginTop: 4,
  },
  imagePreviewContainer: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  resetButton: {
    color: '#f59e0b',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f59e0b',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#ffffff',
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
});

export default AccessoriesScreen;