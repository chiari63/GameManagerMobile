import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Console, Accessory, MaintenanceItem, Notification } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appLog } from '../config/environment';

// Chave para armazenar o histórico de notificações
const NOTIFICATIONS_HISTORY_KEY = '@GameManager:notifications';

// Configuração do handler de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Solicitar permissões de notificação
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Device.isDevice) {
    appLog.warn('Notificações não funcionam em emuladores/simuladores');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    appLog.warn('Permissão para notificações não concedida');
    return false;
  }

  if (Platform.OS === 'android') {
    await createNotificationChannels();
  }

  return true;
};

// Criar canais de notificação para Android
export const createNotificationChannels = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('maintenance-reminders', {
      name: 'Lembretes de Manutenção',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A9BFF',
      description: 'Notificações sobre manutenções preventivas de consoles e acessórios',
    });
  }
};

// Agendar notificação para manutenção
export const scheduleMaintenanceNotification = async (
  itemId: string,
  itemName: string,
  itemType: 'console' | 'accessory',
  nextMaintenanceDate: string
): Promise<string[]> => {
  try {
    // Cancelar notificações existentes para este item
    await cancelMaintenanceNotification(itemId);

    // Converter a data de próxima manutenção para um objeto Date usando parsing robusto
    const nextDate = parseBrazilianDate(nextMaintenanceDate);
    nextDate.setHours(0, 0, 0, 0);

    // Obter a data atual e definir para o início do dia
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Calcular a diferença em dias
    const diffTime = nextDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    appLog.debug(`Scheduling notification for ${itemName} (${itemType}). Next maintenance in ${diffDays} days.`);

    const notificationIds: string[] = [];

    // Agendar notificações progressivas (30, 15, 5 e 0 dias)
    const notificationTimes = [
      { days: 30, title: 'Lembrete de Manutenção', body: `A manutenção de ${itemName} está programada para daqui a 30 dias.` },
      { days: 15, title: 'Lembrete de Manutenção', body: `A manutenção de ${itemName} está programada para daqui a 15 dias.` },
      { days: 5, title: 'Manutenção Próxima', body: `A manutenção de ${itemName} está próxima! Restam apenas 5 dias.` },
      { days: 0, title: 'Manutenção Hoje', body: `Hoje é o dia programado para a manutenção de ${itemName}!` }
    ];

    for (const notification of notificationTimes) {
      if (diffDays >= notification.days) {
        const notificationDate = new Date(nextDate);
        notificationDate.setDate(nextDate.getDate() - notification.days);
        notificationDate.setHours(9, 0, 0, 0); // Notificação às 9h da manhã

        // Verificar se a data é no futuro
        if (notificationDate > now) {
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: notification.title,
              body: notification.body,
              data: {
                itemId,
                itemType,
                maintenanceDate: nextMaintenanceDate,
                type: 'maintenance_reminder'
              },
            },
            trigger: {
              date: notificationDate,
              channelId: 'maintenance-reminders',
            },
          });

          notificationIds.push(notificationId);
          appLog.debug(`Notification scheduled for ${notification.days} days before: ${notificationDate.toISOString()}`);

          // Salvar no histórico
          await saveNotificationToHistory({
            id: notificationId,
            title: notification.title,
            body: notification.body,
            date: new Date().toISOString(),
            read: false,
            itemId,
            itemType,
            maintenanceDate: nextMaintenanceDate
          });
        }
      }
    }

    // Se a manutenção está atrasada, agendar notificação de atraso
    if (diffDays < 0) {
      const overdueDate = new Date(now);
      overdueDate.setDate(now.getDate() + 1); // Amanhã às 9h
      overdueDate.setHours(9, 0, 0, 0);

      const overdueNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Manutenção Atrasada',
          body: `A manutenção de ${itemName} está ${Math.abs(diffDays)} dias atrasada!`,
          data: {
            itemId,
            itemType,
            maintenanceDate: nextMaintenanceDate,
            type: 'maintenance_overdue'
          },
        },
        trigger: {
          date: overdueDate,
          channelId: 'maintenance-reminders',
        },
      });

      notificationIds.push(overdueNotificationId);
      appLog.debug(`Overdue notification scheduled: ${overdueDate.toISOString()}`);
    }

    return notificationIds;
  } catch (error) {
    appLog.error('Error scheduling maintenance notification:', error);
    return [];
  }
};

/**
 * Re-agenda todas as notificações de manutenção para todos os consoles e acessórios.
 * Útil após a restauração de um backup.
 */
export const rescheduleAllNotifications = async (
  consoles: Console[],
  accessories: Accessory[]
): Promise<void> => {
  try {
    appLog.info('Iniciando reagendamento de todas as notificações...');

    // 1. Cancelar todas as notificações agendadas para começar do zero
    await Notifications.cancelAllScheduledNotificationsAsync();
    appLog.debug('Todas as notificações agendadas foram canceladas');

    // 2. Agendar para consoles
    for (const consoleItem of consoles) {
      if (consoleItem.notifyMaintenance && consoleItem.nextMaintenanceDate) {
        await scheduleMaintenanceNotification(
          consoleItem.id,
          consoleItem.name,
          'console',
          consoleItem.nextMaintenanceDate
        );
      }
    }

    // 3. Agendar para acessórios
    for (const accessory of accessories) {
      if (accessory.notifyMaintenance && accessory.nextMaintenanceDate) {
        await scheduleMaintenanceNotification(
          accessory.id,
          accessory.name,
          'accessory',
          accessory.nextMaintenanceDate
        );
      }
    }

    appLog.info('Reagendamento de notificações concluído com sucesso');
  } catch (error) {
    appLog.error('Erro ao reagendar notificações:', error);
  }
};

/**
 * Verifica se existem manutenções atrasadas e envia uma notificação de lembrete imediata.
 * Chamada na entrada do app (HomeScreen).
 */
export const checkAndNotifyOverdue = async (
  consoles: Console[],
  accessories: Accessory[]
): Promise<void> => {
  try {
    const overdueItems: string[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Verificar consoles
    consoles.forEach(c => {
      if (c.nextMaintenanceDate) {
        const nextDate = parseBrazilianDate(c.nextMaintenanceDate);
        nextDate.setHours(0, 0, 0, 0);
        if (nextDate < now) {
          overdueItems.push(c.name);
        }
      }
    });

    // Verificar acessórios
    accessories.forEach(a => {
      if (a.nextMaintenanceDate) {
        const nextDate = parseBrazilianDate(a.nextMaintenanceDate);
        nextDate.setHours(0, 0, 0, 0);
        if (nextDate < now) {
          overdueItems.push(a.name);
        }
      }
    });

    if (overdueItems.length > 0) {
      appLog.info(`Encontrados ${overdueItems.length} itens com manutenção atrasada. Enviando notificação local...`);

      const title = overdueItems.length === 1
        ? 'Manutenção Atrasada'
        : 'Múltiplas Manutenções Atrasadas';

      const body = overdueItems.length === 1
        ? `A manutenção de ${overdueItems[0]} está atrasada. Realize-a o quanto antes!`
        : `Você tem ${overdueItems.length} itens com manutenção atrasada. Confira sua coleção!`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'overdue_nudge_summary' },
        },
        trigger: null, // Disparar imediatamente
      });
    }
  } catch (error) {
    appLog.error('Erro ao verificar manutenções atrasadas:', error);
  }
};

// Cancelar notificação de manutenção
export const cancelMaintenanceNotification = async (itemId: string): Promise<void> => {
  try {
    // Obter todas as notificações agendadas
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    // Encontrar notificações relacionadas a este item
    for (const notification of scheduledNotifications) {
      const data = notification.content.data as any;
      if (data && data.itemId === itemId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (error) {
    console.error('Erro ao cancelar notificação:', error);
  }
};

// Função auxiliar para parsing robusto de datas
export const parseBrazilianDate = (dateString: string): Date => {
  try {
    appLog.debug(`Parsing date: ${dateString}`);

    // Verificar se a data está no formato DD/MM/YYYY
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);

        // Validar se os números são válidos
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
          // Criar data no timezone local para evitar problemas de UTC
          const date = new Date(year, month - 1, day, 12, 0, 0, 0); // Meio-dia para evitar problemas de timezone
          appLog.debug(`Date parsed (local): ${date.toISOString()}`);
          return date;
        }
      }
    }

    // Tentar parsear como ISO
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
      appLog.debug(`ISO date parsed: ${isoDate.toISOString()}`);
      return isoDate;
    }

    throw new Error(`Formato de data inválido: ${dateString}`);
  } catch (error) {
    appLog.error(`Error parsing date: ${dateString}`, error);
    throw error;
  }
};

// Função auxiliar para formatar data no padrão brasileiro
const formatBrazilianDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Calcular a próxima data de manutenção
export const calculateNextMaintenanceDate = (
  lastMaintenanceDate: string | undefined,
  maintenanceInterval: number | undefined
): string | undefined => {
  if (!lastMaintenanceDate || !maintenanceInterval) {
    appLog.debug('Insufficient data for maintenance calculation:', { lastMaintenanceDate, maintenanceInterval });
    return undefined;
  }

  try {
    appLog.debug(`Calculating next maintenance for: ${lastMaintenanceDate}, interval: ${maintenanceInterval} months`);

    const lastDate = parseBrazilianDate(lastMaintenanceDate);
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + maintenanceInterval);

    const result = formatBrazilianDate(nextDate);
    appLog.debug(`Next maintenance calculated: ${result}`);
    return result;
  } catch (error) {
    appLog.error('Error calculating next maintenance date:', error);
    return undefined;
  }
};

// Cache para evitar recálculos desnecessários
let maintenanceItemsCache: { items: MaintenanceItem[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Obter itens com manutenção próxima
export const getUpcomingMaintenanceItems = (
  consoles: Console[],
  accessories: Accessory[]
): MaintenanceItem[] => {
  // Verificar cache primeiro
  const now = Date.now();
  if (maintenanceItemsCache && (now - maintenanceItemsCache.timestamp) < CACHE_DURATION) {
    appLog.debug('Returning cached maintenance items');
    return maintenanceItemsCache.items;
  }

  const items: MaintenanceItem[] = [];

  // Definir a data atual para o início do dia
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  appLog.debug(`Checking maintenance items for date: ${currentDate.toISOString()}`);

  // Função auxiliar para determinar se um item deve ser incluído
  const shouldIncludeItem = (diffDays: number): boolean => {
    // Incluir apenas itens que estão nos próximos 30 dias (não atrasados para esta lista)
    return diffDays >= 0 && diffDays <= 30;
  };

  // Usar a função robusta de parsing que já criamos
  const parseDate = (dateString: string): Date => {
    const date = parseBrazilianDate(dateString);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // Processar consoles
  try {
    appLog.debug(`Processing ${consoles.length} consoles for maintenance`);
    consoles.forEach(consoleItem => {
      if (consoleItem.nextMaintenanceDate) {
        try {
          const nextDate = parseDate(consoleItem.nextMaintenanceDate);
          const diffTime = nextDate.getTime() - currentDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (shouldIncludeItem(diffDays)) {
            appLog.debug(`Including console ${consoleItem.name} in maintenance list (${diffDays} days remaining)`);
            items.push({
              id: consoleItem.id,
              name: consoleItem.name,
              type: 'console',
              nextMaintenanceDate: consoleItem.nextMaintenanceDate,
              daysRemaining: diffDays,
              lastMaintenanceDate: consoleItem.lastMaintenanceDate
            });
          }
        } catch (dateError) {
          appLog.error(`Error processing date for console ${consoleItem.id}:`, dateError);
        }
      }
    });
  } catch (error) {
    appLog.error('Error processing consoles:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Processar acessórios
  try {
    appLog.debug(`Processing ${accessories.length} accessories for maintenance`);
    accessories.forEach(accessory => {
      if (accessory.nextMaintenanceDate) {
        try {
          const nextDate = parseDate(accessory.nextMaintenanceDate);
          const diffTime = nextDate.getTime() - currentDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (shouldIncludeItem(diffDays)) {
            appLog.debug(`Including accessory ${accessory.name} in maintenance list (${diffDays} days remaining)`);
            items.push({
              id: accessory.id,
              name: accessory.name,
              type: 'accessory',
              itemType: accessory.type,
              nextMaintenanceDate: accessory.nextMaintenanceDate,
              daysRemaining: diffDays,
              lastMaintenanceDate: accessory.lastMaintenanceDate
            });
          }
        } catch (dateError) {
          appLog.error(`Error processing date for accessory ${accessory.id}:`, dateError);
        }
      }
    });
  } catch (error) {
    appLog.error('Error processing accessories:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Ordenar por dias restantes (mais urgentes primeiro)
  const sortedItems = items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  appLog.debug(`Total maintenance items found: ${sortedItems.length}`);

  // Atualizar cache
  maintenanceItemsCache = {
    items: sortedItems,
    timestamp: now
  };

  return sortedItems;
};

/**
 * Obtém todos os itens com manutenção atrasada.
 */
export const getOverdueMaintenanceItems = (
  consoles: Console[],
  accessories: Accessory[]
): MaintenanceItem[] => {
  const overdueItems: MaintenanceItem[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Processar consoles
  consoles.forEach(consoleItem => {
    if (consoleItem.nextMaintenanceDate) {
      try {
        const nextDate = parseBrazilianDate(consoleItem.nextMaintenanceDate);
        nextDate.setHours(0, 0, 0, 0);

        if (nextDate < now) {
          const diffTime = nextDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          overdueItems.push({
            id: consoleItem.id,
            name: consoleItem.name,
            type: 'console',
            nextMaintenanceDate: consoleItem.nextMaintenanceDate,
            daysRemaining: diffDays,
            lastMaintenanceDate: consoleItem.lastMaintenanceDate
          });
        }
      } catch (e) {
        appLog.error(`Erro ao processar console atrasado ${consoleItem.id}:`, e);
      }
    }
  });

  // Processar acessórios
  accessories.forEach(accessory => {
    if (accessory.nextMaintenanceDate) {
      try {
        const nextDate = parseBrazilianDate(accessory.nextMaintenanceDate);
        nextDate.setHours(0, 0, 0, 0);

        if (nextDate < now) {
          const diffTime = nextDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          overdueItems.push({
            id: accessory.id,
            name: accessory.name,
            type: 'accessory',
            itemType: accessory.type,
            nextMaintenanceDate: accessory.nextMaintenanceDate,
            daysRemaining: diffDays,
            lastMaintenanceDate: accessory.lastMaintenanceDate
          });
        }
      } catch (e) {
        appLog.error(`Erro ao processar acessório atrasado ${accessory.id}:`, e);
      }
    }
  });

  return overdueItems.sort((a, b) => a.daysRemaining - b.daysRemaining);
};

// Limpar cache de itens de manutenção
export const clearMaintenanceItemsCache = (): void => {
  maintenanceItemsCache = null;
  appLog.debug('Maintenance items cache cleared');
};

// Salvar notificação no histórico
export const saveNotificationToHistory = async (notification: Notification): Promise<void> => {
  try {
    // Obter histórico atual
    const history = await getNotificationHistory();

    // Adicionar nova notificação
    history.unshift(notification); // Adicionar no início da lista

    // Limitar o histórico a 50 notificações
    const limitedHistory = history.slice(0, 50);

    // Salvar histórico atualizado
    await AsyncStorage.setItem(NOTIFICATIONS_HISTORY_KEY, JSON.stringify(limitedHistory));

    appLog.debug(`Notification saved to history: ${notification.title}`);
  } catch (error) {
    appLog.error('Error saving notification to history:', error);
  }
};

// Obter histórico de notificações
export const getNotificationHistory = async (): Promise<Notification[]> => {
  try {
    const historyJson = await AsyncStorage.getItem(NOTIFICATIONS_HISTORY_KEY);
    if (!historyJson) {
      return [];
    }
    return JSON.parse(historyJson);
  } catch (error) {
    appLog.error('Error getting notification history:', error);
    return [];
  }
};

// Marcar notificação como lida
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const history = await getNotificationHistory();

    const updatedHistory = history.map(notification =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    );

    await AsyncStorage.setItem(NOTIFICATIONS_HISTORY_KEY, JSON.stringify(updatedHistory));
    appLog.debug(`Notification ${notificationId} marked as read`);
  } catch (error) {
    appLog.error('Error marking notification as read:', error);
  }
};

// Marcar todas as notificações como lidas
export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    const history = await getNotificationHistory();

    const updatedHistory = history.map(notification => ({ ...notification, read: true }));

    await AsyncStorage.setItem(NOTIFICATIONS_HISTORY_KEY, JSON.stringify(updatedHistory));
    appLog.debug('All notifications marked as read');
  } catch (error) {
    appLog.error('Error marking all notifications as read:', error);
  }
};

// Contar notificações não lidas
export const countUnreadNotifications = async (): Promise<number> => {
  try {
    const history = await getNotificationHistory();
    return history.filter(notification => !notification.read).length;
  } catch (error) {
    appLog.error('Error counting unread notifications:', error);
    return 0;
  }
};

// Limpar todas as notificações
export const clearAllNotifications = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_HISTORY_KEY, JSON.stringify([]));
    appLog.debug('All notifications cleared');
  } catch (error) {
    appLog.error('Error clearing notifications:', error);
  }
};
