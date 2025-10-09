import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, Divider, useTheme, IconButton, Button } from 'react-native-paper';
import { getConsoles, getAccessories, updateConsole, updateAccessory } from '../services/storage';
import { getUpcomingMaintenanceItems, clearMaintenanceItemsCache } from '../services/notifications';
import { MaintenanceItem } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { Wrench, Calendar, ChevronLeft, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAlert } from '../contexts/AlertContext';
import { appLog } from '../config/environment';

type MainTabParamList = {
  Home: undefined;
  Games: undefined;
  ConsolesStack: undefined;
  AccessoriesStack: undefined;
  Wishlist: undefined;
};

type RootStackParamList = {
  MainTabs: undefined;
  Maintenance: undefined;
};

type MaintenanceScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MaintenanceScreen = () => {
  const navigation = useNavigation<MaintenanceScreenNavigationProp>();
  const theme = useTheme();
  const [upcomingItems, setUpcomingItems] = useState<MaintenanceItem[]>([]);
  const [overdueItems, setOverdueItems] = useState<MaintenanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showAlert } = useAlert();

  const loadMaintenanceItems = useCallback(async () => {
    try {
      setIsLoading(true);
      // Limpar cache para garantir dados atualizados
      clearMaintenanceItemsCache();
      appLog.debug('Loading consoles and accessories...');
      const consoles = await getConsoles();
      const accessories = await getAccessories();
      
      appLog.debug(`Data loaded: ${consoles.length} consoles, ${accessories.length} accessories`);
      
      // Obter itens com manutenção nos próximos dias
      const upcoming = getUpcomingMaintenanceItems(consoles, accessories);
      
      // Separar itens com manutenção atrasada (dias restantes < 0)
      const now = new Date();
      const overdue: MaintenanceItem[] = [];
      const upcomingFiltered: MaintenanceItem[] = [];
      
      // Verificar todos os itens que têm data de próxima manutenção
      [...consoles, ...accessories].forEach(item => {
        if (item.nextMaintenanceDate) {
          try {
            const nextDate = new Date(item.nextMaintenanceDate);
            const diffTime = nextDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Determinar o tipo do item de forma mais segura
            const isConsole = 'brand' in item; // Consoles têm a propriedade 'brand'
            const type = isConsole ? 'console' : 'accessory';
            
            if (diffDays < 0) {
              // Item com manutenção atrasada
              overdue.push({
                id: item.id,
                name: item.name,
                type: type,
                itemType: !isConsole && 'type' in item ? item.type : undefined,
                nextMaintenanceDate: item.nextMaintenanceDate,
                daysRemaining: diffDays,
                lastMaintenanceDate: item.lastMaintenanceDate
              });
            }
          } catch (dateError) {
            console.error(`Erro ao processar data de manutenção para o item ${item.id}:`, dateError);
          }
        }
      });
      
      // Filtrar itens que não estão atrasados para a lista de próximos
      upcoming.forEach(item => {
        if (item.daysRemaining >= 0) {
          upcomingFiltered.push(item);
        }
      });
      
      appLog.debug(`Items processed: ${upcomingFiltered.length} upcoming, ${overdue.length} overdue`);
      
      setUpcomingItems(upcomingFiltered);
      setOverdueItems(overdue);
    } catch (error) {
      appLog.error('Error loading maintenance items:', error);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível carregar os itens de manutenção.',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Adicionar botão de voltar na barra de navegação
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 8 }}
        >
          <ChevronLeft color={theme.colors.onSurface} size={24} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <IconButton
          icon={() => <RefreshCw color={theme.colors.onSurface} size={20} />}
          onPress={loadMaintenanceItems}
          style={{ marginRight: 8 }}
        />
      ),
      title: 'Manutenções Preventivas',
      headerTitleStyle: {
        fontSize: 22,
        fontWeight: 'bold',
      },
    });
  }, [navigation, theme, loadMaintenanceItems]);

  // Usar useFocusEffect para recarregar os dados sempre que a tela receber foco
  useFocusEffect(
    useCallback(() => {
      appLog.debug('Maintenance screen focused - reloading data');
      loadMaintenanceItems();
      
      return () => {
        appLog.debug('Maintenance screen unfocused');
      };
    }, [loadMaintenanceItems])
  );

  const handleMarkAsDone = async (item: MaintenanceItem) => {
    try {
      appLog.debug(`Marking item as completed: ID=${item.id}, Type=${item.type}, Name=${item.name}`);
      
      // Formatar a data atual no padrão brasileiro (DD/MM/YYYY)
      const today = new Date();
      const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
      
      appLog.debug(`Formatted date (Brazilian format): ${formattedDate}`);
      
      // Verificar se o item existe antes de tentar atualizá-lo
      if (item.type === 'console') {
        // Obter todos os consoles para verificar se o item existe
        const consoles = await getConsoles();
        
        const consoleExists = consoles.some(consoleItem => consoleItem.id === item.id);
        
        if (!consoleExists) {
          appLog.error(`Console not found: ID=${item.id}`);
          showAlert({
            title: 'Erro',
            message: 'Console não encontrado. Pode ter sido excluído.',
            buttons: [{ text: 'OK', onPress: () => {} }]
          });
          await loadMaintenanceItems(); // Recarregar para atualizar a lista
          return;
        }
        
        appLog.debug(`Updating console: ID=${item.id}`);
        await updateConsole(item.id, { 
          lastMaintenanceDate: formattedDate 
        });
        appLog.debug(`Console updated successfully: ID=${item.id}`);
      } else {
        // Obter todos os acessórios para verificar se o item existe
        const accessories = await getAccessories();
        
        const accessoryExists = accessories.some(accessory => accessory.id === item.id);
        
        if (!accessoryExists) {
          appLog.error(`Accessory not found: ID=${item.id}`);
          showAlert({
            title: 'Erro',
            message: 'Acessório não encontrado. Pode ter sido excluído.',
            buttons: [{ text: 'OK', onPress: () => {} }]
          });
          await loadMaintenanceItems(); // Recarregar para atualizar a lista
          return;
        }
        
        appLog.debug(`Updating accessory: ID=${item.id}`);
        await updateAccessory(item.id, { 
          lastMaintenanceDate: formattedDate 
        });
        appLog.debug(`Accessory updated successfully: ID=${item.id}`);
      }
      
      showAlert({
        title: 'Sucesso',
        message: 'Manutenção marcada como concluída!',
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      
      // Recarregar os dados após marcar como concluída
      appLog.debug('Reloading data after marking maintenance as completed');
      await loadMaintenanceItems();
    } catch (error) {
      appLog.error('Error marking maintenance as completed:', error);
      showAlert({
        title: 'Erro',
        message: `Não foi possível atualizar o status da manutenção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      await loadMaintenanceItems(); // Tentar recarregar mesmo após erro
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Se a data já estiver no formato DD/MM/YYYY, converter para formato mais amigável
      if (dateString.includes('/') && dateString.split('/').length === 3) {
        const [day, month, year] = dateString.split('/');
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      }
      
      // Caso contrário, converter para o formato brasileiro
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (error) {
      appLog.error('Error formatting date:', error);
      return dateString;
    }
  };

  const getUrgencyColor = (daysRemaining: number) => {
    if (daysRemaining < 0) {
      return '#ef4444'; // Vermelho para atrasado
    } else if (daysRemaining <= 7) {
      return '#f59e0b'; // Laranja para urgente
    } else if (daysRemaining <= 15) {
      return '#10b981'; // Verde para atenção
    } else {
      return '#4A9BFF'; // Azul para normal
    }
  };

  const renderMaintenanceItem = ({ item }: { item: MaintenanceItem }) => (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: `${getUrgencyColor(item.daysRemaining)}20` }]}>
            <Wrench color={getUrgencyColor(item.daysRemaining)} size={24} />
          </View>
          <View style={styles.contentContainer}>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.subtitle}>
              {item.type === 'console' ? 'Console' : item.itemType || 'Acessório'}
            </Text>
            <View style={styles.dateContainer}>
              <Calendar size={14} color="#94a3b8" />
              <Text style={styles.dateText}>
                {item.daysRemaining < 0 
                  ? `Manutenção atrasada desde ${formatDate(item.nextMaintenanceDate)}` 
                  : `Próxima manutenção: ${formatDate(item.nextMaintenanceDate)}`}
              </Text>
            </View>
            {item.lastMaintenanceDate && (
              <View style={styles.dateContainer}>
                <CheckCircle size={14} color="#94a3b8" />
                <Text style={styles.dateText}>
                  Última manutenção: {formatDate(item.lastMaintenanceDate)}
                </Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: `${getUrgencyColor(item.daysRemaining)}20` }]}>
              <Text style={[styles.badgeText, { color: getUrgencyColor(item.daysRemaining) }]}>
                {item.daysRemaining < 0 
                  ? `${Math.abs(item.daysRemaining)} dias de atraso` 
                  : item.daysRemaining === 0 
                    ? 'Hoje' 
                    : `Em ${item.daysRemaining} dias`}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          <Button 
            mode="contained" 
            onPress={() => handleMarkAsDone(item)}
            style={[styles.button, { backgroundColor: getUrgencyColor(item.daysRemaining) }]}
            labelStyle={styles.buttonLabel}
          >
            Marcar como Concluída
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = (message: string) => (
    <View style={styles.emptyContainer}>
      <Wrench color="#94a3b8" size={32} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={loadMaintenanceItems}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Seção de manutenções atrasadas */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <AlertTriangle color="#ef4444" size={20} />
            <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Manutenções Atrasadas</Text>
          </View>
          <Text style={styles.sectionCount}>{overdueItems.length}</Text>
        </View>
        
        {overdueItems.length > 0 ? (
          overdueItems.map(item => (
            <View key={item.id} style={styles.itemContainer}>
              {renderMaintenanceItem({ item })}
            </View>
          ))
        ) : (
          renderEmptyState('Nenhuma manutenção atrasada')
        )}
      </View>

      <Divider style={styles.divider} />

      {/* Seção de próximas manutenções */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Clock color="#4A9BFF" size={20} />
            <Text style={styles.sectionTitle}>Próximas Manutenções</Text>
          </View>
          <Text style={styles.sectionCount}>{upcomingItems.length}</Text>
        </View>
        
        {upcomingItems.length > 0 ? (
          upcomingItems.map(item => (
            <View key={item.id} style={styles.itemContainer}>
              {renderMaintenanceItem({ item })}
            </View>
          ))
        ) : (
          renderEmptyState('Nenhuma manutenção agendada para os próximos 30 dias')
        )}
      </View>

      {/* Dicas de manutenção */}
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Dicas de Manutenção Preventiva</Text>
        <Text style={styles.tipsText}>
          • Limpe seus consoles e acessórios regularmente para evitar acúmulo de poeira.
        </Text>
        <Text style={styles.tipsText}>
          • Verifique os cabos e conexões para garantir que não estejam danificados.
        </Text>
        <Text style={styles.tipsText}>
          • Mantenha seus dispositivos em locais bem ventilados para evitar superaquecimento.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  sectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemContainer: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    marginTop: 12,
  },
  button: {
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    height: 1,
    marginVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
    textAlign: 'center',
  },
  tipsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'rgba(74, 155, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 155, 255, 0.2)',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A9BFF',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default MaintenanceScreen; 