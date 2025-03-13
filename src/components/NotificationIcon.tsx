import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Bell } from 'lucide-react-native';
import { countUnreadNotifications } from '../services/notifications';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  MainTabs: undefined;
  Notifications: undefined;
};

type NotificationIconNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NotificationIconProps {
  size?: number;
  color?: string;
}

const NotificationIcon: React.FC<NotificationIconProps> = ({ size = 24, color }) => {
  const theme = useTheme();
  const navigation = useNavigation<NotificationIconNavigationProp>();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Carregar contagem inicial
    loadUnreadCount();

    // Configurar atualização periódica
    const interval = setInterval(loadUnreadCount, 30000); // Atualizar a cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    const count = await countUnreadNotifications();
    setUnreadCount(count);
  };

  const handlePress = () => {
    navigation.navigate('Notifications');
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <Bell size={size} color={color || theme.colors.onSurface} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default NotificationIcon; 