import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Console, Accessory, MaintenanceItem, Notification } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Chave para armazenar o histórico de notificações
const NOTIFICATIONS_HISTORY_KEY = '@GameManager:notifications';

// Configuração do handler de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Solicitar permissões de notificação
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Device.isDevice) {
    console.log('Notificações não funcionam em emuladores/simuladores');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permissão para notificações não concedida');
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
    
    // Converter a data de próxima manutenção para um objeto Date
    // Definir para o início do dia (00:00:00)
    const nextDate = new Date(nextMaintenanceDate);
    nextDate.setHours(0, 0, 0, 0);
    
    // Obter a data atual e definir para o início do dia
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Calcular a diferença em dias
    const diffTime = nextDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    console.log(`Agendando notificação para ${itemName} (${itemType}). Próxima manutenção em ${diffDays} dias.`);
    
    const notificationIds: string[] = [];
    
    // Só agendar notificações se a data de manutenção for no futuro
    if (diffDays >= 0) {
      // Agendar notificação para exatamente 7 dias antes
      if (diffDays >= 7) {
        const sevenDaysBefore = new Date(nextDate);
        sevenDaysBefore.setDate(nextDate.getDate() - 7);
        sevenDaysBefore.setHours(9, 0, 0, 0); // Notificação às 9h da manhã
        
        // Verificar se a data é no futuro
        if (sevenDaysBefore > now) {
          const sevenDaysBeforeId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Lembrete de Manutenção',
              body: `A manutenção de ${itemName} está programada para daqui a 7 dias.`,
              data: {
                itemId,
                itemType,
                maintenanceDate: nextMaintenanceDate,
                type: 'maintenance_reminder'
              },
            },
            trigger: {
              date: sevenDaysBefore,
              channelId: 'maintenance-reminders',
            },
          });
          
          notificationIds.push(sevenDaysBeforeId);
          console.log(`Notificação agendada para 7 dias antes: ${sevenDaysBefore.toISOString()}`);
          
          // Salvar no histórico
          await saveNotificationToHistory({
            id: sevenDaysBeforeId,
            title: 'Lembrete de Manutenção',
            body: `A manutenção de ${itemName} está programada para daqui a 7 dias.`,
            date: new Date().toISOString(),
            read: false,
            itemId,
            itemType,
            maintenanceDate: nextMaintenanceDate
          });
        }
      }
      
      // Agendar notificação para o dia da manutenção
      const maintenanceDay = new Date(nextDate);
      maintenanceDay.setHours(9, 0, 0, 0); // Notificação às 9h da manhã
      
      // Verificar se a data é no futuro
      if (maintenanceDay > now) {
        const maintenanceDayId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Manutenção Hoje',
            body: `Hoje é o dia programado para a manutenção de ${itemName}.`,
            data: {
              itemId,
              itemType,
              maintenanceDate: nextMaintenanceDate,
              type: 'maintenance_due'
            },
          },
          trigger: {
            date: maintenanceDay,
            channelId: 'maintenance-reminders',
          },
        });
        
        notificationIds.push(maintenanceDayId);
        console.log(`Notificação agendada para o dia da manutenção: ${maintenanceDay.toISOString()}`);
        
        // Salvar no histórico
        await saveNotificationToHistory({
          id: maintenanceDayId,
          title: 'Manutenção Hoje',
          body: `Hoje é o dia programado para a manutenção de ${itemName}.`,
          date: new Date().toISOString(),
          read: false,
          itemId,
          itemType,
          maintenanceDate: nextMaintenanceDate
        });
      }
    }
    
    return notificationIds;
  } catch (error) {
    console.error('Erro ao agendar notificação de manutenção:', error);
    return [];
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

// Calcular a próxima data de manutenção
export const calculateNextMaintenanceDate = (
  lastMaintenanceDate: string | undefined,
  maintenanceInterval: number | undefined
): string | undefined => {
  if (!lastMaintenanceDate || !maintenanceInterval) {
    return undefined;
  }

  try {
    // Verificar se a data está no formato DD/MM/YYYY
    if (lastMaintenanceDate.includes('/')) {
      const [day, month, year] = lastMaintenanceDate.split('/');
      const lastDate = new Date(Number(year), Number(month) - 1, Number(day));
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + maintenanceInterval);
      
      // Retornar no formato brasileiro (DD/MM/YYYY)
      return `${nextDate.getDate().toString().padStart(2, '0')}/${(nextDate.getMonth() + 1).toString().padStart(2, '0')}/${nextDate.getFullYear()}`;
    } else {
      // Assumir que já está em formato ISO
      const lastDate = new Date(lastMaintenanceDate);
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + maintenanceInterval);
      
      // Retornar no formato brasileiro (DD/MM/YYYY)
      return `${nextDate.getDate().toString().padStart(2, '0')}/${(nextDate.getMonth() + 1).toString().padStart(2, '0')}/${nextDate.getFullYear()}`;
    }
  } catch (error) {
    console.error('Erro ao calcular próxima data de manutenção:', error);
    return undefined;
  }
};

// Obter itens com manutenção próxima
export const getUpcomingMaintenanceItems = (
  consoles: Console[],
  accessories: Accessory[]
): MaintenanceItem[] => {
  const items: MaintenanceItem[] = [];
  
  // Definir a data atual para o início do dia
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  console.log(`Verificando itens de manutenção para a data: ${now.toISOString()}`);
  
  // Função auxiliar para determinar se um item deve ser incluído
  const shouldIncludeItem = (diffDays: number): boolean => {
    // Incluir apenas itens com exatamente 7 dias restantes ou para hoje (0 dias)
    return diffDays === 7 || diffDays === 0;
  };
  
  // Função para analisar a data no formato brasileiro (DD/MM/YYYY)
  const parseDate = (dateString: string): Date => {
    try {
      // Se a data estiver no formato ISO, converter diretamente
      if (dateString.includes('T') || dateString.includes('-')) {
        const date = new Date(dateString);
        date.setHours(0, 0, 0, 0);
        return date;
      }
      
      // Se estiver no formato brasileiro (DD/MM/YYYY)
      const [day, month, year] = dateString.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
      return date;
    } catch (error) {
      console.error(`Erro ao analisar data: ${dateString}`, error);
      throw error;
    }
  };
  
  // Processar consoles
  try {
    console.log(`Processando ${consoles.length} consoles para manutenção`);
    consoles.forEach(consoleItem => {
      if (consoleItem.nextMaintenanceDate) {
        try {
          const nextDate = parseDate(consoleItem.nextMaintenanceDate);
          const diffTime = nextDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (shouldIncludeItem(diffDays)) {
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
          console.error(`Erro ao processar data para console ${consoleItem.id}:`, dateError);
        }
      }
    });
  } catch (error) {
    console.error('Erro ao processar consoles:', error instanceof Error ? error.message : 'Erro desconhecido');
  }
  
  // Processar acessórios
  try {
    console.log(`Processando ${accessories.length} acessórios para manutenção`);
    accessories.forEach(accessory => {
      if (accessory.nextMaintenanceDate) {
        try {
          const nextDate = parseDate(accessory.nextMaintenanceDate);
          const diffTime = nextDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (shouldIncludeItem(diffDays)) {
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
          console.error(`Erro ao processar data para acessório ${accessory.id}:`, dateError);
        }
      }
    });
  } catch (error) {
    console.error('Erro ao processar acessórios:', error instanceof Error ? error.message : 'Erro desconhecido');
  }

  // Ordenar por dias restantes (mais urgentes primeiro)
  const sortedItems = items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  console.log(`Total de itens de manutenção encontrados: ${sortedItems.length}`);
  
  return sortedItems;
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
    
    console.log(`Notificação salva no histórico: ${notification.title}`);
  } catch (error) {
    console.error('Erro ao salvar notificação no histórico:', error);
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
    console.error('Erro ao obter histórico de notificações:', error);
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
    console.log(`Notificação ${notificationId} marcada como lida`);
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
  }
};

// Marcar todas as notificações como lidas
export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    const history = await getNotificationHistory();
    
    const updatedHistory = history.map(notification => ({ ...notification, read: true }));
    
    await AsyncStorage.setItem(NOTIFICATIONS_HISTORY_KEY, JSON.stringify(updatedHistory));
    console.log('Todas as notificações marcadas como lidas');
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
  }
};

// Contar notificações não lidas
export const countUnreadNotifications = async (): Promise<number> => {
  try {
    const history = await getNotificationHistory();
    return history.filter(notification => !notification.read).length;
  } catch (error) {
    console.error('Erro ao contar notificações não lidas:', error);
    return 0;
  }
};

// Limpar todas as notificações
export const clearAllNotifications = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_HISTORY_KEY, JSON.stringify([]));
    console.log('Todas as notificações foram removidas');
  } catch (error) {
    console.error('Erro ao limpar notificações:', error);
  }
}; 