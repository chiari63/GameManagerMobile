import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { Text, Card, FAB, Searchbar, IconButton, Button, TextInput, Portal, Modal, Menu, Divider, List, useTheme, Switch } from 'react-native-paper';
import { getConsoles, addConsole, updateConsole, deleteConsole } from '../services/storage';
import { Console } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import { Gamepad, Plus, X, Image as ImageIcon, Calendar, Edit, Trash2, ChevronDown, Settings, Upload, MoreVertical, SlidersHorizontal, ChevronLeft, Bell } from 'lucide-react-native';
import { appColors } from '../theme';
import { commonStyles } from '../theme/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { backupEventEmitter, BACKUP_EVENTS } from '../services/backup';
import { DatePicker } from '../components/DatePicker';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { requestNotificationPermissions } from '../services/notifications';
import { useAlert } from '../contexts/AlertContext';

// Lista de fabricantes disponíveis
const FABRICANTES = ['Sony', 'Microsoft', 'Nintendo', 'Sega', 'Tectoy', 'Outros'];

// Lista de modelos disponíveis
const MODELOS = ['Fat', 'Slim', 'Super Slim', 'Pró', 'Meio de geração'];

// Lista de regiões disponíveis
const REGIOES = ['Americano', 'Japonês'];

type MainTabParamList = {
  Home: undefined;
  Games: undefined;
  ConsolesStack: undefined;
  AccessoriesStack: undefined;
  Wishlist: undefined;
  ConsoleDetails: { console: Console };
};

type ConsolesScreenProps = {
  navigation: BottomTabNavigationProp<MainTabParamList>;
};

const ConsolesScreen = ({ navigation }: ConsolesScreenProps) => {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const [consoles, setConsoles] = useState<Console[]>([]);
  const [filteredConsoles, setFilteredConsoles] = useState<Console[]>([]);
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
  });

  // Função para validar formato de data (DD/MM/YYYY)
  const isValidDate = (dateString: string) => {
    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    return dateRegex.test(dateString);
  };

  const loadConsoles = async () => {
    try {
      const data = await getConsoles();
      setConsoles(data);
      setFilteredConsoles(data);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar consoles:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível carregar os consoles.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadConsoles();
    }, [])
  );

  useEffect(() => {
    if (searchQuery || filters.brand || filters.model || filters.region) {
      const filtered = consoles.filter(consoleItem => {
        const matchesSearch = consoleItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            consoleItem.brand.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesBrand = !filters.brand || consoleItem.brand === filters.brand;
        const matchesModel = !filters.model || consoleItem.model === filters.model;
        const matchesRegion = !filters.region || consoleItem.region === filters.region;

        return matchesSearch && matchesBrand && matchesModel && matchesRegion;
      });
      setFilteredConsoles(filtered);
    } else {
      setFilteredConsoles(consoles);
    }

    // Atualiza contador de filtros ativos
    const activeFilters = Object.values(filters).filter(value => value !== '').length;
    setActiveFiltersCount(activeFilters);
  }, [searchQuery, consoles, filters]);

  // Adiciona listener para o evento de restauração
  useEffect(() => {
    const handleRestore = () => {
      loadConsoles();
    };

    backupEventEmitter.on(BACKUP_EVENTS.RESTORE_COMPLETED, handleRestore);

    return () => {
      backupEventEmitter.off(BACKUP_EVENTS.RESTORE_COMPLETED, handleRestore);
    };
  }, []);

  const handleAddConsole = async () => {
    // Validar campos obrigatórios
    if (!formData.name || !formData.brand) {
      showAlert({
        title: 'Erro',
        message: 'Por favor, preencha todos os campos obrigatórios.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      return;
    }

    // Validar formato da data de compra
    if (formData.purchaseDate && !isValidDate(formData.purchaseDate)) {
      showAlert({
        title: 'Erro',
        message: 'A data de compra deve estar no formato DD/MM/YYYY.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      return;
    }

    // Validar formato da data de manutenção
    if (formData.lastMaintenanceDate && !isValidDate(formData.lastMaintenanceDate)) {
      showAlert({
        title: 'Erro',
        message: 'A data de manutenção deve estar no formato DD/MM/YYYY.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      return;
    }

    try {
      if (editingConsole) {
        await updateConsole(editingConsole.id, formData);
        showAlert({
          title: 'Sucesso',
          message: 'Console atualizado com sucesso!',
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
      } else {
        await addConsole(formData);
        showAlert({
          title: 'Sucesso',
          message: 'Console adicionado com sucesso!',
          buttons: [{ text: 'OK', onPress: () => {} }]
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
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    }
  };

  const handleEditConsole = (console: Console) => {
    setEditingConsole(console);
    setFormData({
      name: console.name,
      brand: console.brand,
      model: console.model,
      region: console.region || '',
      purchaseDate: console.purchaseDate,
      lastMaintenanceDate: console.lastMaintenanceDate || '',
      maintenanceDescription: console.maintenanceDescription || '',
      maintenanceInterval: console.maintenanceInterval || 6,
      notifyMaintenance: console.notifyMaintenance !== undefined ? console.notifyMaintenance : true,
      imageUrl: console.imageUrl || '',
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
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      loadConsoles();
    } catch (error) {
      console.error('Erro ao excluir console:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível excluir o console.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    }
    setMenuVisible(null);
  };

  const confirmDelete = (id: string) => {
    showAlert({
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este console?',
      buttons: [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
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
              {MODELOS.map((modelo) => (
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

  const renderItem = ({ item }: { item: Console }) => (
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
              <Gamepad color={appColors.primary} size={32} />
            </View>
          )}
          <Card.Content style={styles.contentPadding}>
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <Text style={[commonStyles.itemTitle, styles.cardTitle]} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
                <Text style={[commonStyles.itemSubtitle, styles.cardSubtitle]} numberOfLines={1} ellipsizeMode="tail">{item.brand}</Text>
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
                    handleEditConsole(item);
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
                <Text style={[commonStyles.badgeText, styles.smallBadgeText]}>{item.model}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    </View>
  );

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
          onPress={() => navigation.navigate('Home')}
          style={{ marginLeft: 8 }}
        >
          <ChevronLeft color={theme.colors.onSurface} size={24} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  return (
    <View style={[commonStyles.container, { backgroundColor: theme.colors.background }]}>
      <View style={commonStyles.header}>
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

      <FlatList
        data={filteredConsoles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContentContainer,
          filteredConsoles.length === 0 && { flex: 1 }
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
              {editingConsole ? 'Editar Console' : 'Novo Console'}
            </Text>
            
            <View style={commonStyles.formGroup}>
              <Text style={commonStyles.label}>Nome do Console</Text>
              <TextInput
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                style={commonStyles.input}
                mode="flat"
                placeholder="Ex: PlayStation 5"
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                selectionColor="#ffffff"
                underlineColorAndroid="transparent"
              />
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
                      {formData.brand || 'Selecione o fabricante'}
                    </Text>
                    <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                  </TouchableOpacity>
                }
              >
                {FABRICANTES.map((fabricante) => (
                  <Menu.Item
                    key={fabricante}
                    onPress={() => {
                      setFormData({ ...formData, brand: fabricante });
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
                      {formData.model || 'Selecione o modelo'}
                    </Text>
                    <ChevronDown color={theme.colors.onSurfaceVariant} size={20} />
                  </TouchableOpacity>
                }
              >
                {MODELOS.map((modelo) => (
                  <Menu.Item
                    key={modelo}
                    onPress={() => {
                      setFormData({ ...formData, model: modelo });
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

            <View style={commonStyles.formGroup}>
              <DatePicker
                label="Data de Compra"
                value={formData.purchaseDate}
                onChange={(date) => setFormData({ ...formData, purchaseDate: date })}
                style={commonStyles.formGroup}
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
                        buttons: [{ text: 'OK', onPress: () => {} }]
                      });
                    }
                  }
                }}
                color={appColors.primary}
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
                numberOfLines={3}
                placeholder="Descreva a última manutenção realizada"
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
            </View>

            <View style={commonStyles.formGroup}>
              <View style={styles.labelContainer}>
                <ImageIcon size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={[commonStyles.label, styles.labelText]}>Imagem do Console</Text>
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
                        // Processar a imagem para garantir o formato 4:3
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
              onPress={handleAddConsole}
              style={[commonStyles.button, { backgroundColor: appColors.primary }]}
              labelStyle={commonStyles.buttonText}
            >
              {editingConsole ? 'Salvar Alterações' : 'Adicionar Console'}
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
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
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
});

export default ConsolesScreen; 