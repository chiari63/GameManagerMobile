import React from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Console } from '../types';
import { commonStyles } from '../theme/commonStyles';
import { Calendar, Settings, Gamepad, ChevronLeft } from 'lucide-react-native';
import { appColors } from '../theme';
import type { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  ConsolesStack: undefined;
  ConsoleDetails: { console: Console };
};

type ConsoleDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ConsoleDetails'>;

type ConsoleDetailsScreenProps = {
  route: {
    params: {
      console: Console;
    };
  };
  navigation: ConsoleDetailsScreenNavigationProp;
};

const ConsoleDetailsScreen = ({ route, navigation }: ConsoleDetailsScreenProps) => {
  const { console } = route.params;
  const theme = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color={theme.colors.onSurface} size={24} />
        </TouchableOpacity>
      </View>
      {console.imageUrl ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: console.imageUrl }} style={styles.image} resizeMode="cover" />
        </View>
      ) : (
        <View style={styles.placeholderImage}>
          <Gamepad color={appColors.primary} size={64} />
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{console.name}</Text>
        <View style={styles.badgeRow}>
          <View style={[commonStyles.badge, { marginRight: 8 }]}>
            <Text style={commonStyles.badgeText}>{console.brand}</Text>
          </View>
          <View style={[commonStyles.badge, { marginRight: 8 }]}>
            <Text style={commonStyles.badgeText}>{console.model}</Text>
          </View>
          {console.region && (
            <View style={commonStyles.badge}>
              <Text style={commonStyles.badgeText}>{console.region}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.sectionTitle}>Informações de Compra</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Data de Compra</Text>
            <Text style={styles.infoValue}>{console.purchaseDate}</Text>
          </View>
        </View>

        {(console.maintenanceDescription || console.lastMaintenanceDate) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Settings size={20} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.sectionTitle}>Manutenção</Text>
            </View>
            <View style={styles.infoCard}>
              {console.maintenanceDescription && (
                <>
                  <Text style={styles.infoLabel}>Descrição</Text>
                  <Text style={styles.infoValue}>{console.maintenanceDescription}</Text>
                </>
              )}
              {console.lastMaintenanceDate && (
                <>
                  <Text style={[styles.infoLabel, { marginTop: 12 }]}>Última Manutenção</Text>
                  <Text style={styles.infoValue}>{console.lastMaintenanceDate}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    padding: 8,
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

export default ConsoleDetailsScreen; 