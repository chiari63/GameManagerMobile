import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Accessory, Console } from '../types';
import { commonStyles } from '../theme/commonStyles';
import { Calendar, Settings, Gamepad2 } from 'lucide-react-native';
import { appColors } from '../theme';
import { getConsoles } from '../services/storage';
import type { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  AccessoriesStack: undefined;
  AccessoryDetails: { accessory: Accessory };
};

type AccessoryDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AccessoryDetails'>;

type AccessoryDetailsScreenProps = {
  route: {
    params: {
      accessory: Accessory;
    };
  };
  navigation: AccessoryDetailsScreenNavigationProp;
};

const AccessoryDetailsScreen = ({ route, navigation }: AccessoryDetailsScreenProps) => {
  const { accessory } = route.params;
  const theme = useTheme();
  const [consoleName, setConsoleName] = useState<string>('');

  useEffect(() => {
    const loadConsoleName = async () => {
      try {
        const consoles = await getConsoles();
        const console = consoles.find((c: Console) => c.id === accessory.consoleId);
        setConsoleName(console?.name || 'N/A');
      } catch (error) {
        console.error('Erro ao carregar nome do console:', error);
        setConsoleName('N/A');
      }
    };
    loadConsoleName();
  }, [accessory.consoleId]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {accessory.imageUrl ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: accessory.imageUrl }} style={styles.image} resizeMode="cover" />
        </View>
      ) : (
        <View style={styles.placeholderImage}>
          <Gamepad2 color={appColors.primary} size={64} />
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{accessory.name}</Text>
        <View style={styles.badgeRow}>
          <View style={[commonStyles.badge, { marginRight: 8 }]}>
            <Text style={commonStyles.badgeText}>{accessory.type}</Text>
          </View>
          <View style={commonStyles.badge}>
            <Text style={commonStyles.badgeText}>{consoleName}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.sectionTitle}>Informações de Compra</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Data de Compra</Text>
            <Text style={styles.infoValue}>{accessory.purchaseDate}</Text>
          </View>
        </View>

        {(accessory.maintenanceDescription || accessory.lastMaintenanceDate) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Settings size={20} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.sectionTitle}>Manutenção</Text>
            </View>
            <View style={styles.infoCard}>
              {accessory.maintenanceDescription && (
                <>
                  <Text style={styles.infoLabel}>Descrição</Text>
                  <Text style={styles.infoValue}>{accessory.maintenanceDescription}</Text>
                </>
              )}
              {accessory.lastMaintenanceDate && (
                <>
                  <Text style={[styles.infoLabel, { marginTop: 12 }]}>Última Manutenção</Text>
                  <Text style={styles.infoValue}>{accessory.lastMaintenanceDate}</Text>
                </>
              )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 300,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: 300,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#ffffff',
  },
});

export default AccessoryDetailsScreen; 