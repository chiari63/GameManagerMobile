import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Text, Card, IconButton, useTheme } from 'react-native-paper';
import { MaintenanceItem } from '../types';
import { getConsoles, getAccessories, updateConsole, updateAccessory } from '../services/storage';
import { getUpcomingMaintenanceItems } from '../services/notifications';
import { Wrench, Calendar, ChevronRight } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MaintenanceRemindersProps {
  onItemPress?: (item: MaintenanceItem) => void;
}

const MaintenanceReminders: React.FC<MaintenanceRemindersProps> = ({ onItemPress }) => {
  const theme = useTheme();
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaintenanceItems();
  }, []);

  const loadMaintenanceItems = async () => {
    try {
      setLoading(true);
      const consoles = await getConsoles();
      const accessories = await getAccessories();
      
      const items = getUpcomingMaintenanceItems(consoles, accessories);
      setMaintenanceItems(items);
    } catch (error) {
      console.error('Erro ao carregar itens de manutenção:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsDone = async (item: MaintenanceItem) => {
    try {
      const today = new Date().toISOString();
      
      if (item.type === 'console') {
        await updateConsole(item.id, { 
          lastMaintenanceDate: today 
        });
      } else {
        await updateAccessory(item.id, { 
          lastMaintenanceDate: today 
        });
      }
      
      // Recarregar a lista
      await loadMaintenanceItems();
    } catch (error) {
      console.error('Erro ao marcar manutenção como concluída:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  const getUrgencyColor = (daysRemaining: number) => {
    if (daysRemaining <= 7) {
      return '#ef4444'; // Vermelho para urgente
    } else if (daysRemaining <= 15) {
      return '#f59e0b'; // Laranja para atenção
    } else {
      return '#10b981'; // Verde para normal
    }
  };

  const renderItem = ({ item }: { item: MaintenanceItem }) => (
    <Card 
      style={styles.card}
      onPress={() => onItemPress && onItemPress(item)}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.iconContainer}>
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
              Manutenção: {formatDate(item.nextMaintenanceDate)}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${getUrgencyColor(item.daysRemaining)}20` }]}>
            <Text style={[styles.badgeText, { color: getUrgencyColor(item.daysRemaining) }]}>
              {item.daysRemaining === 0 ? 'Hoje' : `${item.daysRemaining} dias`}
            </Text>
          </View>
        </View>
        <IconButton
          icon={() => <Wrench color={theme.colors.onSurfaceVariant} size={20} />}
          onPress={() => handleMarkAsDone(item)}
          style={styles.actionButton}
        />
      </Card.Content>
    </Card>
  );

  if (maintenanceItems.length === 0 && !loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Manutenções Preventivas</Text>
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <Wrench color="#94a3b8" size={32} />
            <Text style={styles.emptyText}>Nenhuma manutenção pendente</Text>
            <Text style={styles.emptySubtext}>
              Seus consoles e acessórios estão em dia com a manutenção preventiva
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Manutenções Preventivas</Text>
        <TouchableOpacity onPress={loadMaintenanceItems}>
          <Text style={styles.refreshText}>Atualizar</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={maintenanceItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
      <TouchableOpacity style={styles.viewAllButton}>
        <Text style={styles.viewAllText}>Ver todas</Text>
        <ChevronRight color="#4A9BFF" size={16} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  refreshText: {
    fontSize: 14,
    color: '#4A9BFF',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  card: {
    width: 280,
    marginHorizontal: 8,
    borderRadius: 16,
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(74, 155, 255, 0.1)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A9BFF',
  },
  actionButton: {
    margin: 0,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4A9BFF',
    marginRight: 4,
  },
  emptyCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyContent: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

export default MaintenanceReminders; 