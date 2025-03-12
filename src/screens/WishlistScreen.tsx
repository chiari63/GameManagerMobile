import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, FAB, Searchbar, IconButton, Button, TextInput, Portal, Modal, Menu, useTheme } from 'react-native-paper';
import { getWishlistItems, addWishlistItem, updateWishlistItem, deleteWishlistItem } from '../services/storage';
import { WishlistItem } from '../types';
import { Heart, Plus, Edit, Trash2, ChevronDown, Tag, Type, Info, DollarSign } from 'lucide-react-native';
import { appColors } from '../theme';
import { commonStyles } from '../theme/commonStyles';
import { backupEventEmitter, BACKUP_EVENTS } from '../services/backup';

const TIPOS = ['game', 'console', 'accessory', 'other'];
const PRIORIDADES = ['baixa', 'média', 'alta'];

const WishlistScreen = () => {
  const theme = useTheme();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<WishlistItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'game' as 'game' | 'console' | 'accessory' | 'other',
    description: '',
    priority: 'média' as 'baixa' | 'média' | 'alta',
    estimatedPrice: '',
  });

  useEffect(() => {
    loadWishlist();
  }, []);

  useEffect(() => {
    const handleRestore = () => {
      loadWishlist();
    };

    backupEventEmitter.on(BACKUP_EVENTS.RESTORE_COMPLETED, handleRestore);

    return () => {
      backupEventEmitter.off(BACKUP_EVENTS.RESTORE_COMPLETED, handleRestore);
    };
  }, []);

  const loadWishlist = async () => {
    try {
      const data = await getWishlistItems();
      setWishlist(data);
      setFilteredItems(data);
    } catch (error) {
      console.error('Erro ao carregar lista de desejos:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de desejos.');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = wishlist.filter(item =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.description?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const handleEdit = (item: WishlistItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      description: item.description || '',
      priority: item.priority || 'média',
      estimatedPrice: item.estimatedPrice?.toString() || '',
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWishlistItem(id);
      Alert.alert('Sucesso', 'Item removido da lista de desejos!');
      loadWishlist();
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      Alert.alert('Erro', 'Não foi possível excluir o item.');
    }
  };

  const handleSave = async () => {
    try {
      const itemData = {
        ...formData,
        estimatedPrice: formData.estimatedPrice ? parseFloat(formData.estimatedPrice) : undefined,
        createdAt: new Date().toISOString(),
      };

      if (editingItem) {
        await updateWishlistItem(editingItem.id, itemData);
        Alert.alert('Sucesso', 'Item atualizado com sucesso!');
      } else {
        await addWishlistItem(itemData);
        Alert.alert('Sucesso', 'Item adicionado com sucesso!');
      }
      setModalVisible(false);
      loadWishlist();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      Alert.alert('Erro', 'Não foi possível salvar o item.');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta':
        return '#ef4444';
      case 'média':
        return '#f59e0b';
      case 'baixa':
        return '#10b981';
      default:
        return appColors.primary;
    }
  };

  const renderItem = ({ item }: { item: WishlistItem }) => (
    <Card style={commonStyles.itemCard}>
      <Card.Content style={commonStyles.itemCardContent}>
        <View style={commonStyles.itemHeader}>
          <View style={commonStyles.iconContainer}>
            <Heart color={getPriorityColor(item.priority || 'média')} size={24} />
          </View>
          <View style={[commonStyles.badge, { backgroundColor: `${getPriorityColor(item.priority || 'média')}20` }]}>
            <Text style={[commonStyles.badgeText, { color: getPriorityColor(item.priority || 'média') }]}>
              {item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : 'Média'}
            </Text>
          </View>
        </View>
        <Text style={commonStyles.itemTitle}>{item.name}</Text>
        <Text style={commonStyles.itemSubtitle}>
          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          {item.estimatedPrice && ` • R$ ${item.estimatedPrice.toFixed(2)}`}
        </Text>
        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}
        <View style={styles.itemActions}>
          <IconButton
            icon={() => <Edit color={theme.colors.onSurfaceVariant} size={20} />}
            onPress={() => handleEdit(item)}
            style={styles.actionButton}
          />
          <IconButton
            icon={() => <Trash2 color={appColors.destructive} size={20} />}
            onPress={() => handleDelete(item.id)}
            style={styles.actionButton}
          />
        </View>
      </Card.Content>
    </Card>
  );

  const EmptyState = () => (
    <View style={commonStyles.emptyState}>
      <View style={commonStyles.emptyStateIcon}>
        <Heart color={appColors.primary} size={32} />
      </View>
      <Text style={commonStyles.emptyStateText}>Lista de desejos vazia</Text>
      <Text style={commonStyles.emptyStateSubtext}>
        Adicione itens que você deseja adquirir
      </Text>
    </View>
  );

  return (
    <View style={[commonStyles.container, { backgroundColor: theme.colors.background }]}>
      <View style={commonStyles.header}>
        <View style={commonStyles.searchContainer}>
          <Searchbar
            placeholder="Buscar na lista de desejos..."
            onChangeText={handleSearch}
            value={searchQuery}
            style={commonStyles.searchbar}
            iconColor={theme.colors.onSurfaceVariant}
            inputStyle={{ color: theme.colors.onSurface }}
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />
        </View>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          commonStyles.listContainer,
          filteredItems.length === 0 && { flex: 1 }
        ]}
        ListEmptyComponent={EmptyState}
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
        style={[commonStyles.fab, { backgroundColor: '#ff5757' }]}
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[commonStyles.modal, { maxHeight: '90%' }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Heart color="#ff5757" size={32} />
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
                style={[commonStyles.input, styles.enhancedInput]}
                mode="flat"
                placeholder="Ex: PlayStation 5"
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
            </View>

            <View style={commonStyles.formGroup}>
              <View style={styles.labelContainer}>
                <Type size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={[commonStyles.label, styles.labelText]}>Tipo</Text>
              </View>
              <Menu
                visible={typeMenuVisible}
                onDismiss={() => setTypeMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    onPress={() => setTypeMenuVisible(true)}
                    style={[commonStyles.input, styles.enhancedInput, styles.menuButton]}
                  >
                    <Text style={{ color: theme.colors.onSurface }}>
                      {formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}
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
                    title={tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                    style={styles.menuItem}
                  />
                ))}
              </Menu>
            </View>

            <View style={commonStyles.formGroup}>
              <View style={styles.labelContainer}>
                <Info size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={[commonStyles.label, styles.labelText]}>Descrição (opcional)</Text>
              </View>
              <TextInput
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                style={[commonStyles.input, styles.enhancedInput, styles.textArea]}
                mode="flat"
                multiline
                numberOfLines={3}
                placeholder="Adicione uma descrição"
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
            </View>

            <View style={commonStyles.formGroup}>
              <View style={styles.labelContainer}>
                <Heart size={18} color={theme.colors.onSurfaceVariant} />
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
                style={[commonStyles.input, styles.enhancedInput]}
                mode="flat"
                keyboardType="numeric"
                placeholder="R$ 0,00"
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
            </View>

            <Button
              mode="contained"
              onPress={handleSave}
              style={[commonStyles.button, { backgroundColor: '#ff5757' }]}
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
  description: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    opacity: 0.8,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    margin: 0,
    marginLeft: 8,
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
  enhancedInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    height: 48,
    color: '#ffffff',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
});

export default WishlistScreen; 