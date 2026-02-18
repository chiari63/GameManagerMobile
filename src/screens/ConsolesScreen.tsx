import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { Text, FAB, Searchbar, IconButton, Button, TextInput, Portal, Modal, Menu, Divider, List, useTheme, Switch } from 'react-native-paper';
import { getConsoles, addConsole, updateConsole, deleteConsole } from '../services/storage';
import { Console } from '../types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Gamepad, Plus, X, Image as ImageIcon, Calendar, Edit, Trash2, ChevronDown, Settings, Upload, MoreVertical, SlidersHorizontal, ChevronLeft, Bell, Search, TrendingUp, Gamepad2, Info, ShoppingBag, Tag, ShieldCheck, FileText, Layout } from 'lucide-react-native';
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
import { ConsolesStackParamList, MainTabParamList } from '../navigation/types';
import type { RouteProp } from '@react-navigation/native';
import { isValidDate, formatCurrency } from '../utils/formatters';

// Lista de fabricantes expandida
const FABRICANTES = [
  'Sony', 'Microsoft', 'Nintendo', 'Sega', 'NEC', 'SNK', 'Atari',
  'Panasonic', '3DO', 'Philips', 'Apple', 'Bandai', 'Commodore',
  'Fujitsu', 'Magnavox', 'Mattel', 'Sinclair', 'Tectoy', 'Zeebo',
  'CCE', 'Dynacom', 'Gradiente', 'Microdigital', 'Milmar', 'Polyvox', 'Dismac', 'PolyStation', 'Outros'
];

// Mapeamento de modelos por fabricante
const MODELOS_POR_FABRICANTE: Record<string, string[]> = {
  'Sony': ['PlayStation', 'PlayStation One', 'PS2', 'PS2 Slim', 'PS3', 'PS3 Slim', 'PS3 Super Slim', 'PS4', 'PS4 Slim', 'PS4 Pro', 'PS5', 'PS5 Digital', 'PS5 Slim', 'PS5 Pro', 'PSP', 'PS Vita', 'PS Portal'],
  'Nintendo': ['NES', 'SNES', 'N64', 'GameCube', 'Wii', 'Wii U', 'Switch', 'Switch Lite', 'Switch OLED', 'Game Boy', 'Game Boy Color', 'GBA', 'GBA SP', 'Game Boy Micro', 'DS', 'DS Lite', 'DSI', '3DS', '3DS XL', '2DS', 'New 3DS', 'New 2DS XL', 'Virtual Boy', 'Game & Watch'],
  'Microsoft': ['Xbox', 'Xbox 360', 'Xbox 360 S', 'Xbox 360 E', 'Xbox One', 'Xbox One S', 'Xbox One X', 'Xbox Series S', 'Xbox Series X'],
  'Sega': ['Master System', 'Master System II', 'Master System III', 'Mega Drive', 'Mega Drive II', 'Mega Drive III', 'Sega CD', '32X', 'Saturn', 'Dreamcast', 'Game Gear', 'SG-1000', 'Nomad'],
  'NEC': ['TurboGrafx-16', 'PC Engine', 'PC Engine Duo', 'TurboExpress'],
  'SNK': ['Neo Geo AES', 'Neo Geo CD', 'Neo Geo MVS', 'Neo Geo Pocket', 'Neo Geo Pocket Color'],
  'Atari': ['2600', '5200', '7800', 'Jaguar', 'Lynx', '7800'],
  'Tectoy': ['Master System Evolution', 'Mega Drive 2017', 'Zeebo', 'Master System Compact', 'Master System Girl', 'Pense Bem'],
  'CCE': ['Supergame VG-2800', 'Supergame VG-3000', 'Top Game VG-8000', 'Top Game VG-9000', 'Turbo Game'],
  'Dynacom': ['Dynavision', 'Dynavision II', 'Dynavision III', 'Dynavision IV', 'Dynavision Radical', 'Megavision', 'Handyvision'],
  'Gradiente': ['Phantom System', 'Atari 2600 (Gradiente)'],
  'Polyvox': ['Atari 2600 (Polyvox)'],
  'Microdigital': ['Onyx Jr.'],
  'Milmar': ['Dactari', 'Hi-Top Game', 'Top System'],
  'Dismac': ['Bit System'],
  'PolyStation': ['PolyStation', 'PolyStation 2', 'PolyStation 3'],
  'Outros': ['Console Genérico', 'Retrobox', 'Emulador Hardware', 'PC Engine', '3DO Real'],
};

// Lista de regiões disponíveis
const REGIOES = ['Americano (NTSC-U)', 'Japonês (NTSC-J)', 'Brasileiro (PAL-M)', 'Europeu (PAL)', 'Livre (Region Free)'];

// Condições para colecionadores
const CONDICOES = ['Novo', 'Lacrado', 'Completo (CIB)', 'Bom estado', 'Loose (Apenas Console)', 'Para restauração', 'Com caixa (S/ Manual)'];

type ConsolesScreenProps = {
  navigation: BottomTabNavigationProp<MainTabParamList>;
  route: RouteProp<ConsolesStackParamList, 'ConsolesList'>;
};

const ConsolesScreen = ({ navigation, route }: ConsolesScreenProps) => {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const { showValues } = useValuesVisibility();
  const [consoles, setConsoles] = useState<Console[]>([]);
  // filteredConsoles agora será derivado via useMemo
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConsole, setEditingConsole] = useState<Console | null>(null);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [fabricanteMenuVisible, setFabricanteMenuVisible] = useState(false);
  const [modeloMenuVisible, setModeloMenuVisible] = useState(false);
  const [regiaoMenuVisible, setRegiaoMenuVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    brand: '',
    model: '',
    region: '',
  });
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [conditionMenuVisible, setConditionMenuVisible] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    region: '',
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


  const loadConsoles = async () => {
    try {
      const data = await getConsoles();
      setConsoles(data);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar consoles:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível carregar os consoles.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadConsoles();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (route.params?.autoOpenAdd) {
        setModalVisible(true);
        // Limpar o parâmetro para não abrir novamente ao voltar
        navigation.setParams({ autoOpenAdd: undefined } as any);
      }
      if (route.params?.editingConsole) {
        handleEditConsole(route.params.editingConsole);
        // Limpar o parâmetro
        navigation.setParams({ editingConsole: undefined } as any);
      }
    }, [route.params?.autoOpenAdd, route.params?.editingConsole])
  );

  // Otimização: Usar useMemo para filtrar consoles apenas quando necessário
  const filteredConsoles = useMemo(() => {
    const filtered = consoles.filter(consoleItem => {
      const matchesSearch = !searchQuery ||
        consoleItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (consoleItem.brand && consoleItem.brand.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesBrand = !filters.brand || consoleItem.brand === filters.brand;
      const matchesModel = !filters.model || consoleItem.model === filters.model;
      const matchesRegion = !filters.region || consoleItem.region === filters.region;

      return matchesSearch && matchesBrand && matchesModel && matchesRegion;
    });

    return filtered;
  }, [searchQuery, consoles, filters]);

  // Atualizar contador de filtros ativos
  useEffect(() => {
    const activeFilters = Object.values(filters).filter(value => value !== '').length;
    setActiveFiltersCount(activeFilters);
  }, [filters]);

  // Adiciona listener para o evento de restauração
  useEffect(() => {
    const handleUpdate = () => {
      loadConsoles();
    };

    appEvents.on(APP_EVENTS.RESTORE_COMPLETED, handleUpdate);
    appEvents.on(APP_EVENTS.DATA_CHANGED, handleUpdate);

    return () => {
      appEvents.off(APP_EVENTS.RESTORE_COMPLETED, handleUpdate);
      appEvents.off(APP_EVENTS.DATA_CHANGED, handleUpdate);
    };
  }, []);

  const handleAddConsole = async () => {
    // Validar campos obrigatórios
    if (!formData.name || !formData.purchaseDate) {
      showAlert({
        title: 'Erro',
        message: 'Por favor, preencha o nome e a data de compra do console.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
      return;
    }

    // Validar formato da data de compra
    if (formData.purchaseDate && !isValidDate(formData.purchaseDate)) {
      showAlert({
        title: 'Erro',
        message: 'A data de compra deve estar no formato DD/MM/YYYY.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
      return;
    }

    // Validar formato da data de manutenção
    if (formData.lastMaintenanceDate && !isValidDate(formData.lastMaintenanceDate)) {
      showAlert({
        title: 'Erro',
        message: 'A data de manutenção deve estar no formato DD/MM/YYYY.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
      return;
    }

    try {
      // Converter o preço de string para number
      const consoleData = {
        ...formData,
        pricePaid: formData.pricePaid ? parseFloat(formData.pricePaid) : undefined
      };

      if (editingConsole) {
        await updateConsole(editingConsole.id, consoleData);
        showAlert({
          title: 'Sucesso',
          message: 'Console atualizado com sucesso!',
          buttons: [{ text: 'OK', onPress: () => { } }]
        });
      } else {
        await addConsole(consoleData);
        showAlert({
          title: 'Sucesso',
          message: 'Console adicionado com sucesso!',
          buttons: [{ text: 'OK', onPress: () => { } }]
        });
      }

      setModalVisible(false);
      setEditingConsole(null);
      resetForm();
      loadConsoles();
    } catch (error) {
      console.error('Erro ao salvar console:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível salvar o console.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
    }
  };

  const handleEditConsole = (console: Console) => {
    setEditingConsole(console);
    setFormData({
      name: console.name,
      brand: console.brand || '',
      model: console.model || '',
      region: console.region || '',
      purchaseDate: console.purchaseDate || '',
      lastMaintenanceDate: console.lastMaintenanceDate || '',
      maintenanceDescription: console.maintenanceDescription || '',
      maintenanceInterval: console.maintenanceInterval || 6,
      notifyMaintenance: console.notifyMaintenance !== undefined ? console.notifyMaintenance : true,
      imageUrl: console.imageUrl || '',
      condition: console.condition || '',
      pricePaid: (console.pricePaid !== undefined && console.pricePaid !== null) ? console.pricePaid.toString() : '',
      description: console.description || '',
    });
    setModalVisible(true);
    setMenuVisible(null);
  };

  const handleDeleteConsole = async (id: string) => {
    try {
      await deleteConsole(id);
      showAlert({
        title: 'Sucesso',
        message: 'Console excluído com sucesso!',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
      loadConsoles();
    } catch (error) {
      console.error('Erro ao excluir console:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível excluir o console.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
    }
    setMenuVisible(null);
  };

  const confirmDelete = (id: string) => {
    showAlert({
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este console?',
      buttons: [
        { text: 'Cancelar', onPress: () => { }, style: 'cancel' },
        { text: 'Excluir', onPress: () => handleDeleteConsole(id), style: 'destructive' },
      ]
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      model: '',
      region: '',
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
    setEditingConsole(null);
    resetForm();
    setModalVisible(true);
  };

  const handleFabricanteSelect = (fabricante: string) => {
    setFormData({ ...formData, brand: fabricante });
    setFabricanteMenuVisible(false);
  };

  const handleModeloSelect = (modelo: string) => {
    setFormData({ ...formData, model: modelo });
    setModeloMenuVisible(false);
  };

  const handleRegiaoSelect = (regiao: string) => {
    setFormData({ ...formData, region: regiao });
    setRegiaoMenuVisible(false);
  };

  const handleViewDetails = (console: Console) => {
    navigation.navigate('ConsoleDetails', { console });
  };

  const handleResetFilters = () => {
    setFilters({
      brand: '',
      model: '',
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
            <Text style={commonStyles.label}>Fabricante</Text>
            <Menu
              visible={fabricanteMenuVisible}
              onDismiss={() => setFabricanteMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setFabricanteMenuVisible(true)}
                  style={[commonStyles.input, styles.menuButton]}
                >
                  <Text style={{ color: theme.colors.onSurface }}>
                    {filters.brand || 'Todos os fabricantes'}
                  </Text>
                  <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={() => {
                  setFilters(prev => ({ ...prev, brand: '' }));
                  setFabricanteMenuVisible(false);
                }}
                title="Todos os fabricantes"
              />
              {FABRICANTES.map((fabricante) => (
                <Menu.Item
                  key={fabricante}
                  onPress={() => {
                    setFilters(prev => ({ ...prev, brand: fabricante }));
                    setFabricanteMenuVisible(false);
                  }}
                  title={fabricante}
                />
              ))}
            </Menu>
          </View>

          <View style={commonStyles.formGroup}>
            <Text style={commonStyles.label}>Modelo</Text>
            <Menu
              visible={modeloMenuVisible}
              onDismiss={() => setModeloMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setModeloMenuVisible(true)}
                  style={[commonStyles.input, styles.menuButton]}
                >
                  <Text style={{ color: theme.colors.onSurface }}>
                    {filters.model || 'Todos os modelos'}
                  </Text>
                  <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={() => {
                  setFilters(prev => ({ ...prev, model: '' }));
                  setModeloMenuVisible(false);
                }}
                title="Todos os modelos"
              />
              {/* Mostrar modelos baseados na marca selecionada no filtro */}
              {(filters.brand && MODELOS_POR_FABRICANTE[filters.brand] ?
                MODELOS_POR_FABRICANTE[filters.brand] :
                Object.values(MODELOS_POR_FABRICANTE).flat().slice(0, 10)).map((modelo) => (
                  <Menu.Item
                    key={modelo}
                    onPress={() => {
                      setFilters(prev => ({ ...prev, model: modelo }));
                      setModeloMenuVisible(false);
                    }}
                    title={modelo}
                  />
                ))}
            </Menu>
          </View>

          <View style={commonStyles.formGroup}>
            <Text style={commonStyles.label}>Região</Text>
            <Menu
              visible={regiaoMenuVisible}
              onDismiss={() => setRegiaoMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setRegiaoMenuVisible(true)}
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
                  setRegiaoMenuVisible(false);
                }}
                title="Todas as regiões"
              />
              {REGIOES.map((regiao) => (
                <Menu.Item
                  key={regiao}
                  onPress={() => {
                    setFilters(prev => ({ ...prev, region: regiao }));
                    setRegiaoMenuVisible(false);
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

  const renderItem = useCallback(({ item }: { item: Console }) => (
    <ItemCard
      layout="grid"
      title={item.name}
      subtitle={item.brand}
      subtitleStyle={{ color: appColors.console }}
      imageUri={item.imageUrl}
      placeholderIcon={<Gamepad size={40} color={appColors.console} />}
      onPress={() => handleViewDetails(item)}
      onLongPress={() => {
        setEditingConsole(item);
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
                style={styles.menuIconButton}
              >
                <MoreVertical color={theme.colors.onSurfaceVariant} size={18} />
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(null);
                handleEditConsole(item);
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
            style={styles.menuIconButton}
          >
            <MoreVertical color={theme.colors.onSurfaceVariant} size={18} />
          </TouchableOpacity>
        )
      }
      badge={
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{item.model}</Text>
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
  ), [menuVisible, theme, showValues]);

  const EmptyState = () => (
    <View style={commonStyles.emptyState}>
      <View style={commonStyles.emptyStateIcon}>
        <Gamepad color={appColors.primary} size={32} />
      </View>
      <Text style={commonStyles.emptyStateText}>Nenhum console cadastrado</Text>
      <Text style={commonStyles.emptyStateSubtext}>
        Adicione seus consoles para começar a gerenciar sua coleção
      </Text>
    </View>
  );

  // Adicionar listener para o botão de menu na barra de navegação
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('HomeStack')}
          style={{ marginLeft: 8 }}
        >
          <ChevronLeft color={theme.colors.onSurface} size={24} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);


  const renderHeader = () => {
    const totalInvested = consoles.reduce((sum, item) => sum + (item.pricePaid || 0), 0);

    return (
      <View>
        <ImageBackground
          source={require('../../assets/Consoles.jpg')}
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
                <Text style={styles.heroTitle}>Consoles</Text>
                <Text style={styles.heroSubtitle}>Coleção de Hardware</Text>
              </View>
              <View style={[styles.statsBadge, { backgroundColor: appColors.console }]}>
                <View style={styles.statsIconCircle}>
                  <Gamepad size={16} color="#fff" />
                </View>
                <Text style={styles.statsBadgeText}>CONSOLES</Text>
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
                {showValues ? formatCurrency(totalInvested) : 'R$ ••••••'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Qtd. Consoles</Text>
              <Text style={styles.summaryValue}>{consoles.length}</Text>
            </View>
          </View>
        </View>

        {/* Search and Filters */}
        <View style={styles.headerControls}>
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Searchbar
                placeholder="Buscar consoles..."
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

  return (
    <View style={[commonStyles.container, { backgroundColor: theme.colors.background }]}>

      <FlatList
        data={filteredConsoles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={EmptyState}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
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
              {editingConsole ? 'Editar Console' : 'Novo Console'}
            </Text>

            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Layout size={20} color={appColors.console} />
                <Text style={styles.sectionTitle}>Identificação</Text>
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Nome do Console *</Text>
                <TextInput
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  style={commonStyles.input}
                  mode="flat"
                  placeholder="Ex: PlayStation 5"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                />
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Fabricante</Text>
                {fabricanteMenuVisible ? (
                  <Menu
                    visible={fabricanteMenuVisible}
                    onDismiss={() => setFabricanteMenuVisible(false)}
                    anchor={
                      <TouchableOpacity
                        onPress={() => setFabricanteMenuVisible(true)}
                        style={[commonStyles.input, styles.menuButton]}
                      >
                        <Text style={{ color: theme.colors.onSurface }}>
                          {formData.brand || 'Selecione o fabricante'}
                        </Text>
                        <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                      </TouchableOpacity>
                    }
                  >
                    <ScrollView style={{ maxHeight: 300 }}>
                      {FABRICANTES.map((fabricante) => (
                        <Menu.Item
                          key={fabricante}
                          onPress={() => {
                            setFormData({ ...formData, brand: fabricante, model: '' });
                            setFabricanteMenuVisible(false);
                          }}
                          title={fabricante}
                        />
                      ))}
                    </ScrollView>
                  </Menu>
                ) : (
                  <TouchableOpacity
                    onPress={() => setFabricanteMenuVisible(true)}
                    style={[commonStyles.input, styles.menuButton]}
                  >
                    <Text style={{ color: theme.colors.onSurface }}>
                      {formData.brand || 'Selecione o fabricante'}
                    </Text>
                    <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Modelo</Text>
                {modeloMenuVisible ? (
                  <Menu
                    visible={modeloMenuVisible}
                    onDismiss={() => setModeloMenuVisible(false)}
                    anchor={
                      <TouchableOpacity
                        onPress={() => setModeloMenuVisible(true)}
                        style={[commonStyles.input, styles.menuButton]}
                      >
                        <Text style={{ color: theme.colors.onSurface }}>
                          {formData.model || 'Selecione o modelo'}
                        </Text>
                        <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                      </TouchableOpacity>
                    }
                  >
                    <ScrollView style={{ maxHeight: 300 }}>
                      {(formData.brand && MODELOS_POR_FABRICANTE[formData.brand] ?
                        MODELOS_POR_FABRICANTE[formData.brand] :
                        ['Selecione um fabricante primeiro']).map((modelo) => (
                          <Menu.Item
                            key={modelo}
                            onPress={() => {
                              if (formData.brand) {
                                setFormData({ ...formData, model: modelo });
                              }
                              setModeloMenuVisible(false);
                            }}
                            title={modelo}
                            disabled={!formData.brand}
                          />
                        ))}
                    </ScrollView>
                  </Menu>
                ) : (
                  <TouchableOpacity
                    onPress={() => setModeloMenuVisible(true)}
                    style={[commonStyles.input, styles.menuButton]}
                  >
                    <Text style={{ color: theme.colors.onSurface }}>
                      {formData.model || 'Selecione o modelo'}
                    </Text>
                    <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Notas / História do Console</Text>
                <TextInput
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  style={[commonStyles.input, { height: 100 }]}
                  mode="flat"
                  multiline
                  numberOfLines={4}
                  placeholder="Conte um pouco sobre este console ou sua história com ele..."
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <ShieldCheck size={20} color={appColors.console} />
                <Text style={styles.sectionTitle}>Estado & Região</Text>
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Condição</Text>
                <Menu
                  visible={conditionMenuVisible}
                  onDismiss={() => setConditionMenuVisible(false)}
                  anchor={
                    <TouchableOpacity
                      onPress={() => setConditionMenuVisible(true)}
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
                        setConditionMenuVisible(false);
                      }}
                      title={condition}
                    />
                  ))}
                </Menu>
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Região</Text>
                <Menu
                  visible={regiaoMenuVisible}
                  onDismiss={() => setRegiaoMenuVisible(false)}
                  anchor={
                    <TouchableOpacity
                      onPress={() => setRegiaoMenuVisible(true)}
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
                        setRegiaoMenuVisible(false);
                      }}
                      title={regiao}
                    />
                  ))}
                </Menu>
              </View>
            </View>

            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <ShoppingBag size={20} color={appColors.console} />
                <Text style={styles.sectionTitle}>Investimento</Text>
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Preço Pago (R$)</Text>
                <TextInput
                  value={formData.pricePaid}
                  onChangeText={(text) => {
                    const cleanedText = text.replace(/[^0-9.]/g, '');
                    setFormData({ ...formData, pricePaid: cleanedText });
                  }}
                  style={commonStyles.input}
                  mode="flat"
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  keyboardType="numeric"
                  left={<TextInput.Affix text="R$" />}
                />
              </View>

              <View style={commonStyles.formGroup}>
                <DatePicker
                  label="Data de Compra *"
                  value={formData.purchaseDate}
                  onChange={(date) => setFormData({ ...formData, purchaseDate: date })}
                  style={commonStyles.formGroup}
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Settings size={20} color={appColors.console} />
                <Text style={styles.sectionTitle}>Cuidado & Manutenção</Text>
              </View>

              <View style={[commonStyles.formGroup, styles.switchContainer]}>
                <View style={styles.switchLabelContainer}>
                  <Bell size={18} color={theme.colors.onSurfaceVariant} />
                  <Text style={[commonStyles.label, styles.switchLabel]}>
                    Notificar sobre manutenção
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
                          title: 'Permissão de Notificação',
                          message: 'Para receber lembretes de manutenção, é necessário permitir notificações nas configurações do aplicativo.',
                          buttons: [{ text: 'OK', onPress: () => { } }]
                        });
                      }
                    }
                  }}
                  color={appColors.console}
                />
              </View>

              <View style={commonStyles.formGroup}>
                <DatePicker
                  label="Data da Última Manutenção"
                  value={formData.lastMaintenanceDate}
                  onChange={(date) => setFormData({ ...formData, lastMaintenanceDate: date })}
                  style={commonStyles.formGroup}
                />
              </View>

              <View style={commonStyles.formGroup}>
                <Text style={commonStyles.label}>Intervalo sugerido (meses)</Text>
                <View style={styles.intervalContainer}>
                  {[3, 6, 12, 24].map((months) => (
                    <TouchableOpacity
                      key={months}
                      style={[
                        styles.intervalButton,
                        formData.maintenanceInterval === months && { borderColor: appColors.console, backgroundColor: `${appColors.console}15` }
                      ]}
                      onPress={() => setFormData({ ...formData, maintenanceInterval: months })}
                    >
                      <Text
                        style={[
                          styles.intervalButtonText,
                          formData.maintenanceInterval === months && { color: appColors.console }
                        ]}
                      >
                        {months}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={commonStyles.formGroup}>
                <View style={styles.labelContainer}>
                  <FileText size={16} color={theme.colors.onSurfaceVariant} />
                  <Text style={[commonStyles.label, styles.labelText]}>Observações</Text>
                </View>
                <TextInput
                  value={formData.maintenanceDescription}
                  onChangeText={(text) => setFormData({ ...formData, maintenanceDescription: text })}
                  style={[commonStyles.input, { height: 80 }]}
                  mode="flat"
                  multiline
                  numberOfLines={3}
                  placeholder="Ex: Trocado pasta térmica e limpeza interna"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <ImageIcon size={20} color={appColors.console} />
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
                    <Text style={styles.imageUploaderText}>Selecionar Foto</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleAddConsole}
              style={[commonStyles.button, { backgroundColor: appColors.console, marginTop: 16 }]}
              labelStyle={commonStyles.buttonText}
            >
              {editingConsole ? 'Salvar Alterações' : 'Adicionar Console'}
            </Button>

            <Button
              mode="text"
              onPress={() => setModalVisible(false)}
              style={[{ marginTop: 8 }]}
              labelStyle={{ color: '#94a3b8' }}
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
  heroBackground: {
    height: 200,
    width: '100%',
  },
  heroImage: {
    opacity: 0.8,
  },
  heroOverlay: {
    flex: 1,
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

  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)', // Primary color opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  maintenanceContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  maintenanceLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  maintenanceText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  maintenanceDate: {
    color: '#94a3b8',
    fontSize: 10,
    fontStyle: 'italic',
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 4,
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
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: appColors.console,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#ffffff',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
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
  menuIconButton: {
    padding: 4,
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
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intervalButton: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  intervalButtonActive: {
    borderColor: appColors.primary,
  },
  intervalButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  intervalButtonTextActive: {
    color: appColors.primary,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: appColors.console,
    textTransform: 'uppercase',
    letterSpacing: 1,
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

export default ConsolesScreen; 