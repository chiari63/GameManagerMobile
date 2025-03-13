import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, Card, FAB, Searchbar, IconButton, Button, TextInput, Portal, Modal, Menu, Switch, useTheme } from 'react-native-paper';
import { getAccessories, addAccessory, updateAccessory, deleteAccessory, getConsoles } from '../services/storage';
import { Accessory, Console } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import { Gamepad2, Plus, X, Image as ImageIcon, Calendar, MoreVertical, ChevronDown, Settings, Upload, SlidersHorizontal, ChevronLeft, Bell } from 'lucide-react-native';
import { appColors } from '../theme';
import { commonStyles } from '../theme/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { backupEventEmitter, BACKUP_EVENTS } from '../services/backup';
import { DatePicker } from '../components/DatePicker';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { requestNotificationPermissions } from '../services/notifications';
import { useAlert } from '../contexts/AlertContext';

// Lista de tipos de acessórios disponíveis
const TIPOS = ['Controles', 'Cabos', 'Memorycards', 'Outros'];

type MainTabParamList = {
  Home: undefined;
  Games: undefined;
  ConsolesStack: undefined;
  AccessoriesStack: undefined;
  Wishlist: undefined;
  AccessoryDetails: { accessory: Accessory };
};

type AccessoriesScreenProps = {
  navigation: BottomTabNavigationProp<MainTabParamList>;
};

const AccessoriesScreen = ({ navigation }: AccessoriesScreenProps) => {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [filteredAccessories, setFilteredAccessories] = useState<Accessory[]>([]);
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
  });

  const loadAccessories = async () => {
    try {
      const [accessoriesData, consolesData] = await Promise.all([
        getAccessories(),
        getConsoles()
      ]);
      setAccessories(accessoriesData);
      setFilteredAccessories(accessoriesData);
      setConsoles(consolesData);
    } catch (error) {
      console.error('Erro ao carregar acessórios:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível carregar os acessórios.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAccessories();
    }, [])
  );

  useEffect(() => {
    if (searchQuery || filters.type || filters.consoleId) {
      const filtered = accessories.filter(accessory => {
        const matchesSearch = accessory.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            accessory.type.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesType = !filters.type || accessory.type === filters.type;
        
        const matchesConsole = !filters.consoleId || accessory.consoleId === filters.consoleId;

        return matchesSearch && matchesType && matchesConsole;
      });
      setFilteredAccessories(filtered);
    } else {
      setFilteredAccessories(accessories);
    }

    // Atualiza contador de filtros ativos
    const activeFilters = Object.values(filters).filter(value => value !== '').length;
    setActiveFiltersCount(activeFilters);
  }, [searchQuery, accessories, filters]);

  // Adiciona listener para o evento de restauração
  useEffect(() => {
    const handleRestore = () => {
      loadAccessories();
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

  const handleAddAccessory = async () => {
    if (!formData.name || !formData.type) {
      showAlert({
        title: 'Campos obrigatórios',
        message: 'Por favor, preencha o nome e o tipo do acessório.',
        buttons: [{ text: 'OK', onPress: () => {} }]
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
      };

      if (editingAccessory) {
        await updateAccessory(editingAccessory.id, newAccessory);
        showAlert({
          title: 'Sucesso',
          message: 'Acessório atualizado com sucesso!',
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
      } else {
        await addAccessory(newAccessory);
        showAlert({
          title: 'Sucesso',
          message: 'Acessório adicionado com sucesso!',
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
      }

      resetForm();
      setModalVisible(false);
      setEditingAccessory(null);
      loadAccessories();
      backupEventEmitter.emit(BACKUP_EVENTS.DATA_CHANGED);
    } catch (error) {
      console.error('Erro ao salvar acessório:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível salvar o acessório.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    }
  };

  const handleEditAccessory = (accessory: Accessory) => {
    setEditingAccessory(accessory);
    setFormData({
      name: accessory.name,
      type: accessory.type,
      consoleId: accessory.consoleId,
      purchaseDate: accessory.purchaseDate,
      lastMaintenanceDate: accessory.lastMaintenanceDate || '',
      maintenanceDescription: accessory.maintenanceDescription || '',
      maintenanceInterval: accessory.maintenanceInterval || 6,
      notifyMaintenance: accessory.notifyMaintenance !== undefined ? accessory.notifyMaintenance : true,
      imageUrl: accessory.imageUrl || '',
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
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      loadAccessories();
    } catch (error) {
      console.error('Erro ao excluir acessório:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível excluir o acessório.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    }
    setMenuVisible(null);
  };

  const confirmDelete = (id: string) => {
    showAlert({
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este acessório?',
      buttons: [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
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

  const renderItem = ({ item }: { item: Accessory }) => (
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
                    handleEditAccessory(item);
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
                <Text style={[commonStyles.badgeText, styles.smallBadgeText]}>{item.type}</Text>
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
        <Gamepad2 color={appColors.primary} size={32} />
      </View>
      <Text style={commonStyles.emptyStateText}>Nenhum acessório cadastrado</Text>
      <Text style={commonStyles.emptyStateSubtext}>
        Adicione seus acessórios para começar a gerenciar sua coleção
      </Text>
    </View>
  );

  return (
    <View style={[commonStyles.container, { backgroundColor: theme.colors.background }]}>
      <View style={commonStyles.header}>
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

      <FlatList
        data={filteredAccessories}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContentContainer,
          filteredAccessories.length === 0 && { flex: 1 }
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
              {editingAccessory ? 'Editar Acessório' : 'Novo Acessório'}
            </Text>

            <View style={commonStyles.formGroup}>
              <Text style={commonStyles.label}>Nome do Acessório</Text>
              <TextInput
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                style={commonStyles.input}
                mode="flat"
                placeholder="Ex: DualSense"
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
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
                <Text style={[commonStyles.label, styles.labelText]}>Imagem do Acessório</Text>
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
              onPress={handleAddAccessory}
              style={[commonStyles.button, { backgroundColor: appColors.primary }]}
              labelStyle={commonStyles.buttonText}
            >
              {editingAccessory ? 'Salvar Alterações' : 'Adicionar Acessório'}
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

export default AccessoriesScreen; 