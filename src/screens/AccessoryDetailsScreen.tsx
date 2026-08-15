import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar, Gamepad, Gamepad2, Package, Wrench, ShoppingBag, BookOpen, MoreVertical, Edit, Trash2, AlertTriangle, Info, ArrowLeft } from 'lucide-react-native';
import { getConsoles } from '../services/storage';
import darkTheme, { appColors } from '../theme';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';
import { useAlert } from '../contexts/AlertContext';
import { deleteAccessory } from '../services/storage';
import { Menu } from 'react-native-paper';
import { formatDate, formatCurrency } from '../utils/formatters';
import { appEvents, APP_EVENTS } from '../services/events';
import { getAccessories } from '../services/storage';
import type { Accessory } from '../types';
import type { RootStackParamList } from '../navigation/types';
import { ImagePreviewModal } from '../components/ImagePreviewModal';

// Cor de destaque para acessórios (mesmo padrão da listagem)
const ACCESSORY_ACCENT = '#f59e0b';

const AccessoryDetailsScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'AccessoryDetails'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { accessory } = route.params;
  const [localAccessory, setLocalAccessory] = useState(accessory);
  const theme = darkTheme;
  const { showValues } = useValuesVisibility();
  const { showAlert } = useAlert();
  const [consoleName, setConsoleName] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const allAccessories = await getAccessories();
      const found = allAccessories.find(a => a.id === localAccessory.id);
      if (found) {
        setLocalAccessory(found);

        if (found.consoleId) {
          const consoles = await getConsoles();
          const cons = consoles.find(c => c.id === found.consoleId);
          if (cons) setConsoleName(cons.name);
        }
      }
    } catch (error) {
      console.error('Erro ao recarregar acessório:', error);
    }
  }, [localAccessory.id]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      loadData();
    };

    appEvents.on(APP_EVENTS.DATA_CHANGED, handleUpdate);
    appEvents.on(APP_EVENTS.RESTORE_COMPLETED, handleUpdate);

    return () => {
      appEvents.off(APP_EVENTS.DATA_CHANGED, handleUpdate);
      appEvents.off(APP_EVENTS.RESTORE_COMPLETED, handleUpdate);
    };
  }, [loadData]);


  const handleEditAccessory = () => {
    setMenuVisible(false);
    navigation.navigate('Accessories', { editingAccessory: localAccessory });
  };

  const handleDeleteAccessory = () => {
    setMenuVisible(false);
    showAlert({
      title: 'Excluir Acessório',
      message: `Tem certeza que deseja excluir "${localAccessory.name}"? Esta ação não pode ser desfeita.`,
      buttons: [
        { text: 'Cancelar', onPress: () => { }, style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccessory(localAccessory.id);
              navigation.goBack();
              showAlert({ title: 'Sucesso', message: 'Acessório excluído com sucesso!', buttons: [{ text: 'OK', onPress: () => { } }] });
            } catch (error) {
              console.error('Erro ao excluir acessório:', error);
              showAlert({ title: 'Erro', message: 'Não foi possível excluir o acessório.', buttons: [{ text: 'OK', onPress: () => { } }] });
            }
          },
        },
      ],
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero - mesmo layout da ConsoleDetailsScreen */}
        <View style={styles.heroContainer}>
          {localAccessory.imageUrl ? (
            <TouchableOpacity
              style={styles.heroImageFull}
              accessibilityRole="button"
              accessibilityLabel="Ampliar imagem do acessório"
              activeOpacity={0.92}
              onPress={() => setImagePreviewVisible(true)}
            >
              <Image source={{ uri: localAccessory.imageUrl }} style={styles.heroImageFull} resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholderHero}>
              <Package size={80} color={ACCESSORY_ACCENT} />
            </View>
          )}
          <View pointerEvents="none" style={styles.heroGradient} />

          <View style={styles.heroActions}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroActionButton}>
              <ArrowLeft color="#fff" size={24} />
            </TouchableOpacity>

            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.heroActionButton}>
                  <MoreVertical color="#fff" size={24} />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={handleEditAccessory}
                title="Editar Acessório"
                leadingIcon={({ size, color }) => <Edit size={size} color={color} />}
              />
              <Menu.Item
                onPress={handleDeleteAccessory}
                title="Excluir Acessório"
                leadingIcon={({ size, color }) => <Trash2 size={size} color={appColors.destructive} />}
                titleStyle={{ color: appColors.destructive }}
              />
            </Menu>
          </View>

          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitleMain}>{localAccessory.name}</Text>
            <View style={styles.mainBadgeRow}>
              <View style={[styles.solidBadge, { backgroundColor: ACCESSORY_ACCENT }]}>
                <Package size={12} color="#fff" />
                <Text style={styles.solidBadgeText}>{localAccessory.type}</Text>
              </View>
              {consoleName ? (
                <View style={[styles.solidBadge, { backgroundColor: appColors.console }]}>
                  <Gamepad size={12} color="#fff" />
                  <Text style={styles.solidBadgeText}>{consoleName}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Card de resumo flutuante - mesmo padrão */}
        <View style={styles.summaryCardWrapper}>
          <View style={[styles.glassSummaryCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Investimento</Text>
              <Text style={[styles.summaryValue, { color: '#25d07c' }]}>
                {showValues ? formatCurrency(localAccessory.pricePaid) : 'R$ ••••••'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Condição</Text>
              <Text style={[styles.summaryValue, { color: appColors.primary }]}>
                {localAccessory.condition || 'N/A'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tipo</Text>
              <Text style={styles.summaryValue}>{localAccessory.type || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Seção: Histórico de Aquisição */}
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
                  <Text style={styles.premiumInfoValue}>{formatDate(localAccessory.purchaseDate)}</Text>
                </View>
              </View>
              <View style={styles.premiumInfoCard}>
                <Gamepad2 size={18} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={styles.premiumInfoLabel}>Console</Text>
                  <Text style={styles.premiumInfoValue}>{consoleName || 'N/A'}</Text>
                </View>
              </View>
            </View>
            {localAccessory.pricePaid !== undefined && localAccessory.pricePaid > 0 && (
              <View style={styles.premiumPriceCard}>
                <View style={styles.row}>
                  <ShoppingBag size={20} color="#25d07c" />
                  <Text style={styles.premiumPriceLabel}>Valor de Aquisição</Text>
                </View>
                <Text style={[styles.premiumPriceValue, { color: '#25d07c' }]}>
                  {showValues ? formatCurrency(localAccessory.pricePaid) : 'R$ ••••••'}
                </Text>
              </View>
            )}
          </View>

          {/* Seção: Cuidados & Manutenção */}
          <View style={styles.premiumSection}>
            <View style={styles.sectionTitleRow}>
              <Wrench size={20} color={ACCESSORY_ACCENT} />
              <Text style={[styles.premiumSectionTitle, { color: ACCESSORY_ACCENT }]}>Cuidados & Manutenção</Text>
            </View>
            <View style={styles.premiumInfoGrid}>
              <View style={styles.premiumInfoCard}>
                <Calendar size={18} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={styles.premiumInfoLabel}>Última Vez</Text>
                  <Text style={styles.premiumInfoValue}>
                    {localAccessory.lastMaintenanceDate ? formatDate(localAccessory.lastMaintenanceDate) : 'Nunca'}
                  </Text>
                </View>
              </View>
              <View style={styles.premiumInfoCard}>
                <AlertTriangle
                  size={18}
                  color={localAccessory.nextMaintenanceDate && new Date(localAccessory.nextMaintenanceDate) < new Date() ? '#ef4444' : theme.colors.onSurfaceVariant}
                />
                <View>
                  <Text style={styles.premiumInfoLabel}>Próxima Vez</Text>
                  <Text
                    style={[
                      styles.premiumInfoValue,
                      localAccessory.nextMaintenanceDate && new Date(localAccessory.nextMaintenanceDate) < new Date() && { color: '#ef4444' },
                    ]}
                  >
                    {localAccessory.nextMaintenanceDate ? formatDate(localAccessory.nextMaintenanceDate) : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
            {localAccessory.maintenanceDescription ? (
              <View style={styles.maintenanceNotesCard}>
                <Info size={16} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.maintenanceNotesText}>{localAccessory.maintenanceDescription}</Text>
              </View>
            ) : null}
          </View>

          {/* Seção: Resumo / História */}
          {localAccessory.description ? (
            <View style={styles.premiumSection}>
              <View style={styles.sectionTitleRow}>
                <BookOpen size={20} color={appColors.console} />
                <Text style={[styles.premiumSectionTitle, { color: appColors.console }]}>Resumo / História</Text>
              </View>
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionText}>{localAccessory.description}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <ImagePreviewModal
        visible={imagePreviewVisible}
        imageUri={localAccessory.imageUrl}
        onDismiss={() => setImagePreviewVisible(false)}
        accessibilityLabel={`Imagem ampliada do acessório ${localAccessory.name}`}
      />
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
  row: { flexDirection: 'row', alignItems: 'center' },
  maintenanceNotesCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginTop: 8, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  maintenanceNotesText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
  descriptionCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  descriptionText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
});

export default AccessoryDetailsScreen;
