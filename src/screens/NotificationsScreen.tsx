import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, Divider, useTheme, IconButton, Button } from 'react-native-paper';
import { getNotificationHistory, markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications } from '../services/notifications';
import { Notification } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { Bell, ChevronLeft, CheckCircle, Calendar, Trash2 } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAlert } from '../contexts/AlertContext';

type RootStackParamList = {
  MainTabs: undefined;
  Notifications: undefined;
};

type NotificationsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NotificationsScreen = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const theme = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showAlert } = useAlert();

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const history = await getNotificationHistory();
      setNotifications(history);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      
      // Atualizar a lista local
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      
      // Atualizar a lista local
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
    }
  };

  const handleClearAllNotifications = async () => {
    // Confirmar antes de limpar todas as notificações usando o alerta personalizado
    showAlert({
      title: 'Limpar Notificações',
      message: 'Tem certeza que deseja remover todas as notificações? Esta ação não pode ser desfeita.',
      buttons: [
        { 
          text: 'Cancelar', 
          onPress: () => {}, 
          style: 'cancel' 
        },
        { 
          text: 'Limpar', 
          onPress: async () => {
            try {
              await clearAllNotifications();
              setNotifications([]);
            } catch (error) {
              console.error('Erro ao limpar notificações:', error);
              showAlert({
                title: 'Erro',
                message: 'Não foi possível limpar as notificações.',
                buttons: [{ text: 'OK', onPress: () => {} }]
              });
            }
          },
          style: 'destructive'
        },
      ]
    });
  };

  // Adicionar botão de voltar e limpar notificações na barra de navegação
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
          icon={() => <Trash2 color={theme.colors.onSurface} size={20} />}
          onPress={handleClearAllNotifications}
          style={{ marginRight: 8 }}
        />
      ),
      title: 'Notificações',
      headerTitleStyle: {
        fontSize: 22,
        fontWeight: 'bold',
      },
    });
  }, [navigation, theme, handleClearAllNotifications]);

  // Usar useFocusEffect para recarregar os dados sempre que a tela receber foco
  useFocusEffect(
    useCallback(() => {
      console.log('Tela de Notificações recebeu foco - recarregando dados');
      loadNotifications();
      
      return () => {
        console.log('Tela de Notificações perdeu o foco');
      };
    }, [loadNotifications])
  );

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return dateString;
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <Card 
      style={[
        styles.card, 
        item.read ? styles.readCard : styles.unreadCard
      ]}
      onPress={() => !item.read && handleMarkAsRead(item.id)}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: item.read ? '#94a3b820' : '#4A9BFF20' }]}>
            <Bell color={item.read ? '#94a3b8' : '#4A9BFF'} size={24} />
          </View>
          <View style={styles.contentContainer}>
            <Text style={[styles.title, item.read && styles.readText]}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <View style={styles.dateContainer}>
              <Calendar size={14} color="#94a3b8" />
              <Text style={styles.dateText}>
                {formatDate(item.date)}
              </Text>
            </View>
            {!item.read && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Nova</Text>
              </View>
            )}
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Bell color="#94a3b8" size={32} />
      <Text style={styles.emptyText}>Nenhuma notificação encontrada</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        style={styles.container}
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={item => item.id}
        contentContainerStyle={notifications.length === 0 ? { flex: 1, justifyContent: 'center' } : { padding: 16, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadNotifications}
            colors={[theme.colors.primary]}
          />
        }
      />
      
      {notifications.length > 0 && (
        <View style={styles.bottomButtonContainer}>
          <Button
            mode="contained"
            onPress={handleMarkAllAsRead}
            style={styles.markAllButton}
            icon={() => <CheckCircle color="#fff" size={18} />}
          >
            Marcar todas como lidas
          </Button>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    elevation: 0,
    borderWidth: 1,
  },
  unreadCard: {
    borderColor: 'rgba(74, 155, 255, 0.2)',
    backgroundColor: 'rgba(74, 155, 255, 0.05)',
  },
  readCard: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
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
  readText: {
    color: '#94a3b8',
  },
  body: {
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
    backgroundColor: '#4A9BFF20',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A9BFF',
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
    margin: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
    textAlign: 'center',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  markAllButton: {
    borderRadius: 12,
    paddingVertical: 6,
    backgroundColor: '#4A9BFF',
  },
});

export default NotificationsScreen; 