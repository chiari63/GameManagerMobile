import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking, ActivityIndicator, FlatList } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Divider, Card, FAB, Portal, Modal, Button, TextInput, Menu, Switch } from 'react-native-paper';
import { Calendar, Tag, Gamepad, ArrowLeft, ExternalLink, Wrench, ShoppingBag, DollarSign, Plus, X, Image as ImageIcon, ChevronDown, Bell, MoreVertical, Edit, Trash2, Upload, Info, Gamepad2 } from 'lucide-react-native';
import { formatImageUrl, getPlatformDetails } from '../services/igdbApi';
import darkTheme, { appColors } from '../theme';
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

const TIPOS = ['Controles', 'Cabos', 'Memorycards', 'Outros'];

const ConsoleDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { console } = route.params as { console: any };
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

  // Adiciona listener para o evento de restauração
  useEffect(() => {
    const handleRestore = () => {
      loadAccessories();
    };

    backupEventEmitter.on(BACKUP_EVENTS.RESTORE_COMPLETED, handleRestore);

    return () => {
      backupEventEmitter.off(BACKUP_EVENTS.RESTORE_COMPLETED, handleRestore);
    };
  }, [loadAccessories]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data não disponível';

    try {
      // Verificar se a data já está no formato DD/MM/YYYY
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        return dateString;
      }

      // Tentar converter para Date e formatar
      const date = new Date(dateString);

      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        // Tentar converter de formato DD/MM/YYYY para Date
        const [day, month, year] = dateString.split('/');
        if (day && month && year) {
          const newDate = new Date(Number(year), Number(month) - 1, Number(day));
          if (!isNaN(newDate.getTime())) {
            return dateString; // Já está no formato correto
          }
        }
        return 'Data inválida';
      }

      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  const openWebsite = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Erro ao abrir URL:', err));
  };

  const getWebsiteLabel = (category: number) => {
    const categories: Record<number, string> = {
      1: 'Site Oficial',
      2: 'Wikia',
      3: 'Wikipedia',
      4: 'Facebook',
      5: 'Twitter',
      6: 'Twitch',
      8: 'Instagram',
      9: 'YouTube',
      13: 'Steam',
      14: 'Reddit',
      15: 'Itch',
      16: 'Epic Games',
      17: 'GOG',
      18: 'Discord'
    };
    return categories[category] || 'Link';
  };

  const getCategoryName = (category: number) => {
    const categories: Record<number, string> = {
      1: 'Console',
      2: 'Portátil',
      3: 'Computador',
      4: 'Mobile',
      5: 'Arcade',
      6: 'Virtual Reality'
    };
    return categories[category] || 'Outro';
  };

  const resetForm = () => {
    setFormData({
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

  const renderAccessoryItem = ({ item, index }: { item: Accessory; index: number }) => (
    <Card style={styles.accessoryCard}>
      <TouchableOpacity
        onPress={() => {
          // @ts-ignore - AccessoryDetails está disponível no RootStack
          navigation.navigate('AccessoryDetails', { accessory: item });
        }}
        activeOpacity={0.7}
      >
        {item.imageUrl ? (
          <Card.Cover source={{ uri: item.imageUrl }} style={styles.accessoryImage} />
        ) : (
          <View style={styles.accessoryPlaceholder}>
            <Gamepad size={28} color={appColors.primary} />
          </View>
        )}
        <Card.Content style={styles.accessoryContent}>
          <View style={styles.accessoryHeader}>
            <View style={styles.accessoryTitleContainer}>
              <Text style={styles.accessoryName} numberOfLines={2} ellipsizeMode="tail">
                {item.name}
              </Text>
              <View style={styles.accessoryTypeBadge}>
                <Text style={styles.accessoryType}>{item.type}</Text>
              </View>
            </View>
            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <TouchableOpacity
                  onPress={() => setMenuVisible(item.id)}
                  style={styles.menuButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MoreVertical size={18} color={darkTheme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={() => handleEditAccessory(item)}
                title="Editar"
              />
              <Menu.Item
                onPress={() => confirmDelete(item.id)}
                title="Excluir"
                titleStyle={{ color: appColors.destructive }}
              />
            </Menu>
          </View>
          {item.pricePaid && (
            <View style={styles.accessoryPriceContainer}>
              <Text style={styles.accessoryPrice}>
                {showValues ? `R$ ${item.pricePaid.toFixed(2)}` : 'R$ ******'}
              </Text>
            </View>
          )}
        </Card.Content>
      </TouchableOpacity>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          {console.imageUrl ? (
            <>
              <Image source={{ uri: console.imageUrl }} style={styles.image} resizeMode="cover" />
              <View style={styles.imageOverlay} />
            </>
          ) : (
            <View style={styles.placeholderImage}>
              <Gamepad size={80} color={appColors.primary} />
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{console.name}</Text>

          <View style={styles.badgeContainer}>
            {console.brand && (
              <View style={styles.badge}>
                <Tag size={14} color={appColors.foreground} style={styles.badgeIcon} />
                <Text style={styles.badgeText}>{console.brand}</Text>
              </View>
            )}

            {console.model && (
              <View style={styles.badge}>
                <Gamepad size={14} color={appColors.foreground} style={styles.badgeIcon} />
                <Text style={styles.badgeText}>{console.model}</Text>
              </View>
            )}

            {console.region && (
              <View style={styles.badge}>
                <Tag size={14} color={appColors.foreground} style={styles.badgeIcon} />
                <Text style={styles.badgeText}>{console.region}</Text>
              </View>
            )}
          </View>

          {/* Tabs Navigation */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'info' && styles.tabActive]}
              onPress={() => setActiveTab('info')}
              activeOpacity={0.7}
            >
              <Info size={18} color={activeTab === 'info' ? appColors.primary : darkTheme.colors.onSurfaceVariant} />
              <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
                Informações
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'accessories' && styles.tabActive]}
              onPress={() => setActiveTab('accessories')}
              activeOpacity={0.7}
            >
              <Gamepad2 size={18} color={activeTab === 'accessories' ? appColors.primary : darkTheme.colors.onSurfaceVariant} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.tabText, activeTab === 'accessories' && styles.tabTextActive]}>
                  Acessórios
                </Text>
                {accessories.length > 0 && (
                  <Text style={styles.tabBadge}> ({accessories.length})</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'info' ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Informações de Compra</Text>
                <Divider style={styles.divider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <ShoppingBag size={20} color={appColors.primary} />
                    <Text style={styles.infoLabel}>Data de Compra</Text>
                    <Text style={styles.infoValue}>{formatDate(console.purchaseDate)}</Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Tag size={20} color={appColors.primary} />
                    <Text style={styles.infoLabel}>Condição</Text>
                    <Text style={styles.infoValue}>
                      {console.condition || 'Não informado'}
                    </Text>
                  </View>
                </View>

                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>Preço Pago:</Text>
                  <Text style={styles.priceValue}>
                    {showValues ? `R$ ${(console.pricePaid || 0).toFixed(2)}` : 'R$ ******'}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Manutenção</Text>
                <Divider style={styles.divider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Wrench size={20} color={appColors.primary} />
                    <Text style={styles.infoLabel}>Última Manutenção</Text>
                    <Text style={styles.infoValue}>
                      {console.lastMaintenanceDate ? formatDate(console.lastMaintenanceDate) : 'Nunca'}
                    </Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Calendar size={20} color={appColors.primary} />
                    <Text style={styles.infoLabel}>Próxima Manutenção</Text>
                    <Text style={styles.infoValue}>
                      {console.nextMaintenanceDate ? formatDate(console.nextMaintenanceDate) : 'Não agendada'}
                    </Text>
                  </View>
                </View>

                {console.maintenanceDescription && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Observações:</Text>
                    <Text style={styles.notesText}>{console.maintenanceDescription}</Text>
                  </View>
                )}
              </View>

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
                          {showFullDescription
                            ? igdbDetails.summary
                            : (igdbDetails.summary.length > 150
                              ? igdbDetails.summary.substring(0, 150) + '...'
                              : igdbDetails.summary)
                          }
                        </Text>
                        {igdbDetails.summary.length > 150 && (
                          <Text style={styles.readMore}>
                            {showFullDescription ? 'Mostrar menos' : 'Ler mais'}
                          </Text>
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
                            {version.platform_version_release_dates && version.platform_version_release_dates.length > 0 && (
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
                          <TouchableOpacity
                            key={index}
                            style={styles.websiteButton}
                            onPress={() => openWebsite(website.url)}
                          >
                            <ExternalLink size={16} color={appColors.primary} />
                            <Text style={styles.websiteButtonText}>
                              {getWebsiteLabel(website.category)}
                            </Text>
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
                  <Text style={styles.emptyAccessoriesSubtext}>
                    Toque no botão + para adicionar um acessório
                  </Text>
                </View>
              ) : (
                <View style={styles.accessoriesContainer}>
                  {accessories.map((item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.accessoryGridItem,
                        index % 2 === 0 ? styles.accessoryGridItemLeft : styles.accessoryGridItemRight
                      ]}
                    >
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
        <FAB
          icon={() => <Plus color="#fff" size={24} />}
          onPress={openModal}
          style={styles.fab}
        />
      )}

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
                    style={[commonStyles.input, styles.menuButtonInput]}
                  >
                    <Text style={{ color: darkTheme.colors.onSurface }}>
                      {formData.type || 'Selecione o tipo'}
                    </Text>
                    <ChevronDown color={darkTheme.colors.onSurfaceVariant} size={20} />
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
              <Text style={commonStyles.label}>Condição</Text>
              <Menu
                visible={condicaoMenuVisible}
                onDismiss={() => setCondicaoMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    onPress={() => setCondicaoMenuVisible(true)}
                    style={[commonStyles.input, styles.menuButtonInput]}
                  >
                    <Text style={{ color: darkTheme.colors.onSurface }}>
                      {formData.condition || 'Selecione a condição'}
                    </Text>
                    <ChevronDown color={darkTheme.colors.onSurfaceVariant} size={20} />
                  </TouchableOpacity>
                }
              >
                {['Novo', 'Como novo', 'Bom', 'Regular', 'Ruim'].map((condition) => (
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
                <Bell size={18} color={darkTheme.colors.onSurfaceVariant} />
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
              />
            </View>

            <View style={commonStyles.formGroup}>
              <View style={styles.labelContainer}>
                <ImageIcon size={18} color={darkTheme.colors.onSurfaceVariant} />
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
                  <Text style={styles.imageUploaderText}>
                    Toque para selecionar uma imagem
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
              labelStyle={[commonStyles.buttonText, { color: darkTheme.colors.onSurface }]}
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
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80, // Espaço para o FAB não cobrir conteúdo
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#18181b',
  },
  content: {
    flex: 1,
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#121212',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: appColors.primary,
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    color: appColors.foreground,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: appColors.primary,
    marginBottom: 8,
  },
  divider: {
    backgroundColor: darkTheme.colors.outlineVariant,
    height: 1,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: darkTheme.colors.onSurface,
    marginTop: 2,
    textAlign: 'center',
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: darkTheme.colors.onSurfaceVariant,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: darkTheme.colors.onSurface,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 22,
  },
  readMore: {
    color: appColors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  versionsContainer: {
    marginTop: 8,
  },
  versionItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 8,
  },
  versionName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: darkTheme.colors.onSurface,
    marginBottom: 4,
  },
  versionDate: {
    fontSize: 13,
    color: darkTheme.colors.onSurfaceVariant,
  },
  websitesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  websiteButtonText: {
    color: appColors.primary,
    fontWeight: '500',
    marginLeft: 6,
  },
  noDataText: {
    fontSize: 15,
    color: darkTheme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  priceContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(0, 120, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    color: darkTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  priceValue: {
    color: darkTheme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  accessoriesCount: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginLeft: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    marginTop: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(74, 155, 255, 0.15)',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: darkTheme.colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: appColors.primary,
    fontWeight: '600',
  },
  tabBadge: {
    fontSize: 13,
    color: appColors.primary,
    fontWeight: '600',
  },
  accessoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  accessoryGridItem: {
    width: '48%',
    marginBottom: 12,
  },
  accessoryGridItemLeft: {
    marginRight: '2%',
  },
  accessoryGridItemRight: {
    marginLeft: '2%',
  },
  accessoryCard: {
    width: '100%',
    backgroundColor: darkTheme.colors.surface,
    elevation: 2,
  },
  accessoryImage: {
    height: 100,
  },
  accessoryPlaceholder: {
    height: 100,
    backgroundColor: darkTheme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessoryContent: {
    padding: 10,
  },
  accessoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  accessoryTitleContainer: {
    flex: 1,
    marginRight: 4,
  },
  accessoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: 6,
    minHeight: 36,
  },
  accessoryTypeBadge: {
    backgroundColor: 'rgba(74, 155, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  accessoryType: {
    fontSize: 11,
    color: appColors.primary,
    fontWeight: '500',
  },
  accessoryPriceContainer: {
    marginTop: 4,
  },
  accessoryPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.primary,
  },
  menuButton: {
    padding: 4,
  },
  emptyAccessories: {
    alignItems: 'center',
    padding: 32,
  },
  emptyAccessoriesText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyAccessoriesSubtext: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: appColors.primary,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  menuButtonInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
    color: darkTheme.colors.onSurfaceVariant,
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
    color: darkTheme.colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
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
  imageUploader: {
    backgroundColor: darkTheme.colors.surfaceVariant,
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
});

export default ConsoleDetailsScreen; 