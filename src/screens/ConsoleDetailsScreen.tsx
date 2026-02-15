import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Divider, FAB, Portal, Modal, Button, TextInput, Menu, Switch } from 'react-native-paper';
import { Calendar, Tag, Gamepad, ExternalLink, Wrench, ShoppingBag, DollarSign, Plus, X, Image as ImageIcon, ChevronDown, Bell, MoreVertical, Edit, Trash2, Upload, Info, Gamepad2, TrendingUp, AlertTriangle, ChevronLeft, BookOpen, ArrowLeft } from 'lucide-react-native';
import { getPlatformDetails } from '../services/igdbApi';
import darkTheme, { appColors } from '../theme';
import { ItemCard } from '../components/ItemCard';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';
import { getAccessories, addAccessory, updateAccessory, deleteAccessory } from '../services/storage';
import { Accessory } from '../types';
import { DatePicker } from '../components/DatePicker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAlert } from '../contexts/AlertContext';
import { requestNotificationPermissions } from '../services/notifications';
import { commonStyles } from '../theme/commonStyles';
import { backupEventEmitter, BACKUP_EVENTS } from '../services/backup';
import { formatDate, formatCurrency } from '../utils/formatters';

const TIPOS = ['Controles', 'Cabos', 'Memorycards', 'Outros'];

const ConsoleDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { console } = route.params as { console: any };
  const theme = darkTheme;
  const { showValues } = useValuesVisibility();
  const { showAlert } = useAlert();
  const [igdbDetails, setIgdbDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<Accessory | null>(null);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [tipoMenuVisible, setTipoMenuVisible] = useState(false);
  const [condicaoMenuVisible, setCondicaoMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'accessories'>('info');
  const [consoleMenuVisible, setConsoleMenuVisible] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    purchaseDate: '',
    lastMaintenanceDate: '',
    maintenanceDescription: '',
    maintenanceInterval: 6,
    notifyMaintenance: true,
    imageUrl: '',
    condition: '',
    pricePaid: '',
  });

  useEffect(() => {
    const fetchIGDBDetails = async () => {
      if (console.igdbId) {
        setLoading(true);
        try {
          const details = await getPlatformDetails(console.igdbId);
          setIgdbDetails(details);
        } catch (error) {
          console.error('Erro ao buscar detalhes do IGDB:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchIGDBDetails();
  }, [console]);

  const loadAccessories = useCallback(async () => {
    try {
      const allAccessories = await getAccessories();
      const consoleAccessories = allAccessories.filter(acc => acc.consoleId === console.id);
      setAccessories(consoleAccessories);
    } catch (error) {
      console.error('Erro ao carregar acessórios:', error);
    }
  }, [console.id]);

  useFocusEffect(
    useCallback(() => {
      loadAccessories();
    }, [loadAccessories])
  );

  useEffect(() => {
    const handleRestore = () => {
      loadAccessories();
    };
    backupEventEmitter.on(BACKUP_EVENTS.RESTORE_COMPLETED, handleRestore);
    return () => {
      backupEventEmitter.off(BACKUP_EVENTS.RESTORE_COMPLETED, handleRestore);
    };
  }, [loadAccessories]);


  const openWebsite = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Erro ao abrir URL:', err));
  };

  const getWebsiteLabel = (category: number) => {
    const categories: Record<number, string> = {
      1: 'Site Oficial', 2: 'Wikia', 3: 'Wikipedia', 4: 'Facebook', 5: 'Twitter',
      6: 'Twitch', 8: 'Instagram', 9: 'YouTube', 13: 'Steam', 14: 'Reddit',
      15: 'Itch', 16: 'Epic Games', 17: 'GOG', 18: 'Discord'
    };
    return categories[category] || 'Link';
  };

  const getCategoryName = (category: number) => {
    const categories: Record<number, string> = {
      1: 'Console', 2: 'Portátil', 3: 'Computador', 4: 'Mobile', 5: 'Arcade', 6: 'Virtual Reality'
    };
    return categories[category] || 'Outro';
  };

  const resetForm = () => {
    setFormData({
      name: '', type: '', purchaseDate: '', lastMaintenanceDate: '', maintenanceDescription: '',
      maintenanceInterval: 6, notifyMaintenance: true, imageUrl: '', condition: '', pricePaid: '',
    });
  };

  const openModal = () => {
    setEditingAccessory(null);
    resetForm();
    setModalVisible(true);
  };

  const handleAddAccessory = async () => {
    if (!formData.name || !formData.type) {
      showAlert({
        title: 'Campos obrigatórios',
        message: 'Por favor, preencha o nome e o tipo do acessório.',
        buttons: [{ text: 'OK', onPress: () => { } }]
      });
      return;
    }

    try {
      const newAccessory: Omit<Accessory, 'id'> = {
        name: formData.name,
        type: formData.type,
        consoleId: console.id,
        purchaseDate: formData.purchaseDate,
        lastMaintenanceDate: formData.lastMaintenanceDate,
        maintenanceDescription: formData.maintenanceDescription,
        maintenanceInterval: formData.maintenanceInterval,
        notifyMaintenance: formData.notifyMaintenance,
        imageUrl: formData.imageUrl,
        condition: formData.condition,
        pricePaid: formData.pricePaid ? parseFloat(formData.pricePaid) : undefined,
      };

      if (editingAccessory) {
        await updateAccessory(editingAccessory.id, newAccessory);
        showAlert({ title: 'Sucesso', message: 'Acessório atualizado com sucesso!', buttons: [{ text: 'OK', onPress: () => { } }] });
      } else {
        await addAccessory(newAccessory);
        showAlert({ title: 'Sucesso', message: 'Acessório adicionado com sucesso!', buttons: [{ text: 'OK', onPress: () => { } }] });
      }

      resetForm();
      setModalVisible(false);
      setEditingAccessory(null);
      loadAccessories();
    } catch (error) {
      console.error('Erro ao salvar acessório:', error);
      showAlert({ title: 'Erro', message: 'Não foi possível salvar o acessório.', buttons: [{ text: 'OK', onPress: () => { } }] });
    }
  };

  const handleEditConsole = () => {
    // @ts-ignore
    navigation.navigate('ConsolesList', { editingConsole: console });
  };

  const handleDeleteConsole = () => {
    showAlert({
      title: 'Excluir Console',
      message: `Tem certeza que deseja excluir o console "${console.name}"? Esta ação não pode ser desfeita.`,
      buttons: [
        { text: 'Cancelar', onPress: () => { }, style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { deleteConsole } = await import('../services/storage');
              await deleteConsole(console.id);
              navigation.goBack();
              showAlert({ title: 'Sucesso', message: 'Console excluído com sucesso!', buttons: [{ text: 'OK', onPress: () => { } }] });
            } catch (error) {
              console.error('Erro ao excluir console:', error);
            }
          }
        }
      ]
    });
  };

  const handleEditAccessory = (accessory: Accessory) => {
    setEditingAccessory(accessory);
    setFormData({
      name: accessory.name,
      type: accessory.type,
      purchaseDate: accessory.purchaseDate,
      lastMaintenanceDate: accessory.lastMaintenanceDate || '',
      maintenanceDescription: accessory.maintenanceDescription || '',
      maintenanceInterval: accessory.maintenanceInterval || 6,
      notifyMaintenance: accessory.notifyMaintenance !== undefined ? accessory.notifyMaintenance : true,
      imageUrl: accessory.imageUrl || '',
      condition: accessory.condition || '',
      pricePaid: accessory.pricePaid ? accessory.pricePaid.toString() : '',
    });
    setModalVisible(true);
    setMenuVisible(null);
  };

  const handleDeleteAccessory = async (id: string) => {
    try {
      await deleteAccessory(id);
      showAlert({ title: 'Sucesso', message: 'Acessório excluído com sucesso!', buttons: [{ text: 'OK', onPress: () => { } }] });
      loadAccessories();
    } catch (error) {
      console.error('Erro ao excluir acessório:', error);
      showAlert({ title: 'Erro', message: 'Não foi possível excluir o acessório.', buttons: [{ text: 'OK', onPress: () => { } }] });
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

  const renderAccessoryItem = ({ item, index }: { item: Accessory; index: number }) => (
    <ItemCard
      layout="grid"
      title={item.name}
      subtitle={item.type}
      subtitleStyle={{ color: '#f59e0b' }}
      imageUri={item.imageUrl}
      placeholderIcon={<Gamepad2 size={40} color="#f59e0b" />}
      onPress={() => {
        // @ts-ignore
        navigation.navigate('AccessoryDetails', { accessory: item });
      }}
      onLongPress={() => setMenuVisible(item.id)}
      rightElement={
        <Menu
          visible={menuVisible === item.id}
          onDismiss={() => setMenuVisible(null)}
          anchor={
            <TouchableOpacity onPress={() => setMenuVisible(item.id)} style={styles.menuButton}>
              <MoreVertical size={18} color={darkTheme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          }
        >
          <Menu.Item
            onPress={() => { setMenuVisible(null); handleEditAccessory(item); }}
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
      }
      footer={
        <View style={styles.accessoryPriceRow}>
          <TrendingUp size={14} color="#25d07c" />
          <Text style={styles.accessoryPriceText}>
            {showValues ? formatCurrency(item.pricePaid) : 'R$ ••••••'}
          </Text>
        </View>
      }
    />
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroContainer}>
          {console.imageUrl ? (
            <Image source={{ uri: console.imageUrl }} style={styles.heroImageFull} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderHero}>
              <Gamepad2 size={80} color={appColors.primary} />
            </View>
          )}
          <View style={styles.heroGradient} />

          {/* Floating Action Buttons over Hero */}
          <View style={styles.heroActions}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroActionButton}>
              <ArrowLeft color="#fff" size={24} />
            </TouchableOpacity>

            <Menu
              visible={consoleMenuVisible}
              onDismiss={() => setConsoleMenuVisible(false)}
              anchor={
                <TouchableOpacity onPress={() => setConsoleMenuVisible(true)} style={styles.heroActionButton}>
                  <MoreVertical color="#fff" size={24} />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={() => { setConsoleMenuVisible(false); handleEditConsole(); }}
                title="Editar Console"
                leadingIcon={({ size, color }) => <Edit size={size} color={color} />}
              />
              <Menu.Item
                onPress={() => { setConsoleMenuVisible(false); handleDeleteConsole(); }}
                title="Excluir Console"
                leadingIcon={({ size, color }) => <Trash2 size={size} color={appColors.destructive} />}
                titleStyle={{ color: appColors.destructive }}
              />
            </Menu>
          </View>

          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitleMain}>{console.name}</Text>
            <View style={styles.mainBadgeRow}>
              <View style={[styles.solidBadge, { backgroundColor: appColors.console }]}>
                <Tag size={12} color="#fff" />
                <Text style={styles.solidBadgeText}>{console.brand}</Text>
              </View>
              <View style={[styles.solidBadge, { backgroundColor: appColors.console }]}>
                <Gamepad size={12} color="#fff" />
                <Text style={styles.solidBadgeText}>{console.model}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Global Summary Card (Floating) */}
        <View style={styles.summaryCardWrapper}>
          <View style={[styles.glassSummaryCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Investimento</Text>
              <Text style={[styles.summaryValue, { color: '#25d07c' }]}>
                {showValues ? formatCurrency(console.pricePaid) : 'R$ ••••••'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Acessórios</Text>
              <Text style={styles.summaryValue}>{accessories.length}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Condição</Text>
              <Text style={[styles.summaryValue, { color: appColors.primary }]}>
                {console.condition || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Tabs Navigation */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity style={[styles.tab, activeTab === 'info' && styles.tabActive]} onPress={() => setActiveTab('info')} activeOpacity={0.7}>
              <Info size={18} color={activeTab === 'info' ? appColors.primary : darkTheme.colors.onSurfaceVariant} />
              <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Informações</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'accessories' && styles.tabActive]} onPress={() => setActiveTab('accessories')} activeOpacity={0.7}>
              <Gamepad2 size={18} color={activeTab === 'accessories' ? appColors.primary : darkTheme.colors.onSurfaceVariant} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.tabText, activeTab === 'accessories' && styles.tabTextActive]}>Acessórios</Text>
                {accessories.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{accessories.length}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'info' ? (
            <>
              <View style={styles.premiumSection}>
                <View style={styles.sectionTitleRow}>
                  <ShoppingBag size={20} color={appColors.primary} />
                  <Text style={styles.premiumSectionTitle}>Histórico de Aquisição</Text>
                </View>
                <View style={styles.premiumInfoGrid}>
                  <View style={styles.premiumInfoCard}>
                    <Calendar size={18} color={theme.colors.onSurfaceVariant} />
                    <View>
                      <Text style={styles.premiumInfoLabel}>Comprado em</Text>
                      <Text style={styles.premiumInfoValue}>{formatDate(console.purchaseDate)}</Text>
                    </View>
                  </View>
                  <View style={styles.premiumInfoCard}>
                    <Tag size={18} color={theme.colors.onSurfaceVariant} />
                    <View>
                      <Text style={styles.premiumInfoLabel}>Região</Text>
                      <Text style={styles.premiumInfoValue}>{console.region || 'N/A'}</Text>
                    </View>
                  </View>
                </View>
                {console.pricePaid !== undefined && (
                  <View style={styles.premiumPriceCard}>
                    <View style={styles.row}>
                      <DollarSign size={20} color="#25d07c" />
                      <Text style={styles.premiumPriceLabel}>Valor de Aquisição</Text>
                    </View>
                    <Text style={[styles.premiumPriceValue, { color: '#25d07c' }]}>
                      {showValues ? formatCurrency(console.pricePaid) : 'R$ ••••••'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.premiumSection}>
                <View style={styles.sectionTitleRow}>
                  <Wrench size={20} color="#f59e0b" />
                  <Text style={[styles.premiumSectionTitle, { color: '#f59e0b' }]}>Cuidados & Manutenção</Text>
                </View>
                <View style={styles.premiumInfoGrid}>
                  <View style={styles.premiumInfoCard}>
                    <Calendar size={18} color={theme.colors.onSurfaceVariant} />
                    <View>
                      <Text style={styles.premiumInfoLabel}>Última Vez</Text>
                      <Text style={styles.premiumInfoValue}>{console.lastMaintenanceDate ? formatDate(console.lastMaintenanceDate) : 'Nunca'}</Text>
                    </View>
                  </View>
                  <View style={styles.premiumInfoCard}>
                    <AlertTriangle size={18} color={console.nextMaintenanceDate && new Date(console.nextMaintenanceDate) < new Date() ? '#ef4444' : theme.colors.onSurfaceVariant} />
                    <View>
                      <Text style={styles.premiumInfoLabel}>Próxima Vez</Text>
                      <Text style={[styles.premiumInfoValue, console.nextMaintenanceDate && new Date(console.nextMaintenanceDate) < new Date() && { color: '#ef4444' }]}>
                        {console.nextMaintenanceDate ? formatDate(console.nextMaintenanceDate) : 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>
                {console.maintenanceDescription && (
                  <View style={styles.maintenanceNotesCard}>
                    <Info size={16} color={theme.colors.onSurfaceVariant} />
                    <Text style={styles.maintenanceNotesText}>{console.maintenanceDescription}</Text>
                  </View>
                )}
              </View>

              {console.description && (
                <View style={styles.premiumSection}>
                  <View style={styles.sectionTitleRow}>
                    <BookOpen size={20} color={appColors.console} />
                    <Text style={[styles.premiumSectionTitle, { color: appColors.console }]}>Resumo / História</Text>
                  </View>
                  <View style={styles.descriptionCard}>
                    <Text style={styles.descriptionText}>{console.description}</Text>
                  </View>
                </View>
              )}

              <View style={styles.divider} />

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={appColors.primary} />
                  <Text style={styles.loadingText}>Carregando detalhes da IGDB...</Text>
                </View>
              ) : igdbDetails ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Detalhes da IGDB</Text>
                  <Divider style={styles.divider} />
                  {igdbDetails.summary && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Resumo</Text>
                      <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                        <Text style={styles.detailValue}>
                          {showFullDescription ? igdbDetails.summary : (igdbDetails.summary.length > 150 ? igdbDetails.summary.substring(0, 150) + '...' : igdbDetails.summary)}
                        </Text>
                        {igdbDetails.summary.length > 150 && (
                          <Text style={styles.readMore}>{showFullDescription ? 'Mostrar menos' : 'Ler mais'}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                  {igdbDetails.generation && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Geração</Text>
                      <Text style={styles.detailValue}>{igdbDetails.generation}</Text>
                    </View>
                  )}
                  {igdbDetails.platform_family && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Família</Text>
                      <Text style={styles.detailValue}>{igdbDetails.platform_family.name}</Text>
                    </View>
                  )}
                  {igdbDetails.category && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Categoria</Text>
                      <Text style={styles.detailValue}>{getCategoryName(igdbDetails.category)}</Text>
                    </View>
                  )}
                  {igdbDetails.versions && igdbDetails.versions.length > 0 && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Versões</Text>
                      <View style={styles.versionsContainer}>
                        {igdbDetails.versions.map((version: any, index: number) => (
                          <View key={index} style={styles.versionItem}>
                            <Text style={styles.versionName}>{version.name}</Text>
                            {version.platform_version_release_dates?.[0] && (
                              <Text style={styles.versionDate}>
                                Lançamento: {new Date(version.platform_version_release_dates[0].date * 1000).toLocaleDateString('pt-BR')}
                                {version.platform_version_release_dates[0].region && ` (${version.platform_version_release_dates[0].region})`}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {igdbDetails.websites && igdbDetails.websites.length > 0 && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Links</Text>
                      <View style={styles.websitesContainer}>
                        {igdbDetails.websites.map((website: any, index: number) => (
                          <TouchableOpacity key={index} style={styles.websiteButton} onPress={() => openWebsite(website.url)}>
                            <ExternalLink size={16} color={appColors.primary} />
                            <Text style={styles.websiteButtonText}>{getWebsiteLabel(website.category)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ) : console.igdbId ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Detalhes da IGDB</Text>
                  <Divider style={styles.divider} />
                  <Text style={styles.noDataText}>Não foi possível carregar os detalhes da IGDB.</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Acessórios</Text>
                <Text style={styles.accessoriesCount}>({accessories.length})</Text>
              </View>
              <Divider style={styles.divider} />
              {accessories.length === 0 ? (
                <View style={styles.emptyAccessories}>
                  <Gamepad2 size={48} color={darkTheme.colors.onSurfaceVariant} />
                  <Text style={styles.emptyAccessoriesText}>Nenhum acessório cadastrado</Text>
                  <Text style={styles.emptyAccessoriesSubtext}>Toque no botão + para adicionar um acessório</Text>
                </View>
              ) : (
                <View style={styles.accessoriesContainer}>
                  {accessories.map((item, index) => (
                    <View key={item.id} style={[styles.accessoryGridItem, index % 2 === 0 ? styles.accessoryGridItemLeft : styles.accessoryGridItemRight]}>
                      {renderAccessoryItem({ item, index })}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {activeTab === 'accessories' && (
        <FAB icon={() => <Plus color="#fff" size={24} />} onPress={openModal} style={styles.fab} />
      )}

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={commonStyles.modal} dismissable>
          <ScrollView>
            <Text style={commonStyles.modalTitle}>{editingAccessory ? 'Editar Acessório' : 'Novo Acessório'}</Text>
            <View style={commonStyles.formGroup}>
              <Text style={commonStyles.label}>Nome do Acessório</Text>
              <TextInput value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} style={commonStyles.input} mode="flat" placeholder="Ex: DualSense" />
            </View>
            <View style={commonStyles.formGroup}>
              <Text style={commonStyles.label}>Tipo</Text>
              <Menu
                visible={tipoMenuVisible}
                onDismiss={() => setTipoMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => setTipoMenuVisible(true)} style={[commonStyles.input, styles.menuButtonInput]}>
                    <Text style={{ color: darkTheme.colors.onSurface }}>{formData.type || 'Selecione o tipo'}</Text>
                    <ChevronDown color={darkTheme.colors.onSurfaceVariant} size={20} />
                  </TouchableOpacity>
                }
              >
                {TIPOS.map((tipo) => (
                  <Menu.Item key={tipo} onPress={() => { setFormData({ ...formData, type: tipo }); setTipoMenuVisible(false); }} title={tipo} />
                ))}
              </Menu>
            </View>
            <View style={commonStyles.formGroup}>
              <Text style={commonStyles.label}>Condição</Text>
              <Menu
                visible={condicaoMenuVisible}
                onDismiss={() => setCondicaoMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => setCondicaoMenuVisible(true)} style={[commonStyles.input, styles.menuButtonInput]}>
                    <Text style={{ color: darkTheme.colors.onSurface }}>{formData.condition || 'Selecione a condição'}</Text>
                    <ChevronDown color={darkTheme.colors.onSurfaceVariant} size={20} />
                  </TouchableOpacity>
                }
              >
                {['Novo', 'Como novo', 'Bom', 'Regular', 'Ruim'].map((condition) => (
                  <Menu.Item key={condition} onPress={() => { setFormData({ ...formData, condition }); setCondicaoMenuVisible(false); }} title={condition} />
                ))}
              </Menu>
            </View>
            <View style={commonStyles.formGroup}>
              <Text style={commonStyles.label}>Preço Pago (R$)</Text>
              <TextInput value={formData.pricePaid} onChangeText={(text) => setFormData({ ...formData, pricePaid: text.replace(/[^0-9.]/g, '') })} style={commonStyles.input} mode="flat" placeholder="Ex: 299.90" keyboardType="numeric" />
            </View>
            <View style={commonStyles.formGroup}>
              <DatePicker label="Data de Compra" value={formData.purchaseDate} onChange={(date) => setFormData({ ...formData, purchaseDate: date })} style={commonStyles.formGroup} />
            </View>
            <View style={commonStyles.formGroup}>
              <DatePicker label="Data da Última Manutenção" value={formData.lastMaintenanceDate} onChange={(date) => setFormData({ ...formData, lastMaintenanceDate: date })} style={commonStyles.formGroup} />
            </View>
            <View style={commonStyles.formGroup}>
              <Text style={commonStyles.label}>Intervalo de Manutenção (meses)</Text>
              <View style={styles.intervalContainer}>
                {[3, 6, 12, 24].map((months) => (
                  <TouchableOpacity key={months} style={[styles.intervalButton, formData.maintenanceInterval === months && styles.intervalButtonActive]} onPress={() => setFormData({ ...formData, maintenanceInterval: months })}>
                    <Text style={[styles.intervalButtonText, formData.maintenanceInterval === months && styles.intervalButtonTextActive]}>{months}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={[commonStyles.formGroup, styles.switchContainer]}>
              <View style={styles.switchLabelContainer}>
                <Bell size={18} color={darkTheme.colors.onSurfaceVariant} />
                <Text style={[commonStyles.label, styles.switchLabel]}>Notificar sobre manutenção</Text>
              </View>
              <Switch value={formData.notifyMaintenance} onValueChange={async (value) => { setFormData({ ...formData, notifyMaintenance: value }); if (value) await requestNotificationPermissions(); }} color={appColors.primary} />
            </View>
            <View style={commonStyles.formGroup}>
              <Text style={commonStyles.label}>Descrição da Manutenção</Text>
              <TextInput value={formData.maintenanceDescription} onChangeText={(text) => setFormData({ ...formData, maintenanceDescription: text })} style={commonStyles.input} mode="flat" multiline numberOfLines={3} placeholder="Descreva a manutenção" />
            </View>
            <View style={commonStyles.formGroup}>
              <View style={styles.labelContainer}>
                <ImageIcon size={18} color={darkTheme.colors.onSurfaceVariant} />
                <Text style={[commonStyles.label, styles.labelText]}>Imagem do Acessório</Text>
              </View>
              {formData.imageUrl ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: formData.imageUrl }} style={styles.imagePreview} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => setFormData({ ...formData, imageUrl: '' })}>
                    <X color="#fff" size={20} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imageUploader}
                  onPress={async () => {
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [4, 3], quality: 0.8 });
                    if (!result.canceled) {
                      const processedImage = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 800, height: 600 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
                      setFormData({ ...formData, imageUrl: processedImage.uri });
                    }
                  }}
                >
                  <Upload size={32} color="#94a3b8" />
                  <Text style={styles.imageUploaderText}>Toque para selecionar uma imagem</Text>
                </TouchableOpacity>
              )}
            </View>
            <Button mode="contained" onPress={handleAddAccessory} style={[commonStyles.button, { backgroundColor: appColors.primary }]} labelStyle={commonStyles.buttonText}>
              {editingAccessory ? 'Salvar Alterações' : 'Adicionar Acessório'}
            </Button>
            <Button mode="outlined" onPress={() => setModalVisible(false)} style={[commonStyles.button, { marginTop: 12 }]} labelStyle={[commonStyles.buttonText, { color: darkTheme.colors.onSurface }]}>Cancelar</Button>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  heroContainer: { height: 400, width: '100%', position: 'relative' },
  heroImageFull: { width: '100%', height: '100%' },
  placeholderHero: { width: '100%', height: '100%', backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center' },
  heroGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  heroActions: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  heroActionButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroTitleContainer: { position: 'absolute', bottom: 60, left: 24, right: 24 },
  heroTitleMain: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 },
  mainBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  solidBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6 },
  solidBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  summaryCardWrapper: { marginTop: -40, paddingHorizontal: 20, zIndex: 20 },
  glassSummaryCard: { flexDirection: 'row', borderRadius: 24, padding: 24, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 15 },
  content: { paddingHorizontal: 20, paddingTop: 30 },
  tabsContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 6, marginBottom: 24 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  tabActive: { backgroundColor: 'rgba(74, 155, 255, 0.1)' },
  tabText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  tabTextActive: { color: appColors.primary, fontWeight: 'bold' },
  countBadge: { backgroundColor: appColors.primary, paddingHorizontal: 6, borderRadius: 10, marginLeft: 4 },
  countBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  premiumSection: { marginBottom: 24 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  premiumSectionTitle: { fontSize: 18, fontWeight: 'bold', color: appColors.primary, letterSpacing: 0.5 },
  premiumInfoGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  premiumInfoCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  premiumInfoLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },
  premiumInfoValue: { fontSize: 14, color: '#fff', fontWeight: '600', marginTop: 2 },
  premiumPriceCard: { backgroundColor: 'rgba(37, 208, 124, 0.05)', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(37, 208, 124, 0.1)' },
  premiumPriceLabel: { fontSize: 14, color: '#25d07c', fontWeight: '600', marginLeft: 8 },
  premiumPriceValue: { fontSize: 18, fontWeight: 'bold' },
  maintenanceNotesCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginTop: 8, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  maintenanceNotesText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  divider: { backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
  detailItem: { marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 16 },
  detailLabel: { fontSize: 14, fontWeight: 'bold', color: appColors.primary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  detailValue: { fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 24 },
  readMore: { color: appColors.primary, marginTop: 8, fontWeight: 'bold' },
  versionsContainer: { marginTop: 8, gap: 10 },
  versionItem: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12 },
  versionName: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  versionDate: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  websitesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  websiteButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74, 155, 255, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
  websiteButtonText: { color: appColors.primary, fontWeight: '600', fontSize: 13 },
  accessoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  accessoryGridItem: { width: '48%', marginBottom: 16 },
  accessoryGridItemLeft: {},
  accessoryGridItemRight: {},
  menuButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
  accessoryPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  accessoryPriceText: { fontSize: 13, fontWeight: 'bold', color: '#25d07c' },
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 16, color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  emptyAccessories: { padding: 40, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, marginTop: 10 },
  emptyAccessoriesText: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  emptyAccessoriesSubtext: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8 },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: appColors.primary, borderRadius: 16, elevation: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  menuButtonInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  intervalContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  intervalButton: { padding: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  intervalButtonActive: { borderColor: appColors.primary },
  intervalButtonText: { color: darkTheme.colors.onSurfaceVariant, fontSize: 14, fontWeight: '600' },
  intervalButtonTextActive: { color: appColors.primary },
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { color: darkTheme.colors.onSurfaceVariant, fontSize: 14, fontWeight: '600' },
  labelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  labelText: { marginLeft: 8, marginBottom: 0 },
  imageUploader: { backgroundColor: darkTheme.colors.surfaceVariant, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderStyle: 'dashed', padding: 24, alignItems: 'center', justifyContent: 'center', aspectRatio: 4 / 3 },
  imageUploaderText: { color: '#94a3b8', fontSize: 16, marginTop: 12, textAlign: 'center' },
  imagePreviewContainer: { position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: 4 / 3 },
  imagePreview: { width: '100%', height: '100%' },
  removeImageButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 20, padding: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  accessoriesCount: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  noDataText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontStyle: 'italic', textAlign: 'center', padding: 20 },
  descriptionCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  descriptionText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
});

export default ConsoleDetailsScreen;