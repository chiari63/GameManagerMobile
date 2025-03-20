import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Divider } from 'react-native-paper';
import { Calendar, Tag, Gamepad, ArrowLeft, Wrench, ShoppingBag } from 'lucide-react-native';
import { getConsoles } from '../services/storage';
import darkTheme, { appColors } from '../theme';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';

const AccessoryDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { accessory } = route.params as { accessory: any };
  const { showValues } = useValuesVisibility();
  const [consoleName, setConsoleName] = useState('');

  useEffect(() => {
    const fetchConsoleName = async () => {
      if (accessory.consoleId) {
        const consoles = await getConsoles();
        const console = consoles.find(c => c.id === accessory.consoleId);
        if (console) {
          setConsoleName(console.name);
        }
      }
    };

    fetchConsoleName();
  }, [accessory]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data não disponível';
    
    try {
      // Verificar se a data já está no formato DD/MM/YYYY
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        return dateString;
      }
      
      // Tentar converter para Date e formatar
      const date = new Date(dateString);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        // Tentar converter de formato DD/MM/YYYY para Date
        const [day, month, year] = dateString.split('/');
        if (day && month && year) {
          const newDate = new Date(Number(year), Number(month) - 1, Number(day));
          if (!isNaN(newDate.getTime())) {
            return dateString; // Já está no formato correto
          }
        }
        return 'Data inválida';
      }
      
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        {accessory.imageUrl ? (
          <Image source={{ uri: accessory.imageUrl }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.placeholderImage}>
            <Gamepad size={80} color={appColors.primary} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{accessory.name}</Text>
        
        <View style={styles.badgeContainer}>
          {accessory.type && (
            <View style={styles.badge}>
              <Tag size={14} color={appColors.foreground} style={styles.badgeIcon} />
              <Text style={styles.badgeText}>{accessory.type}</Text>
            </View>
          )}
          
          {consoleName && (
            <View style={styles.badge}>
              <Gamepad size={14} color={appColors.foreground} style={styles.badgeIcon} />
              <Text style={styles.badgeText}>{consoleName}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações de Compra</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <ShoppingBag size={20} color={appColors.primary} />
              <Text style={styles.infoLabel}>Data de Compra</Text>
              <Text style={styles.infoValue}>{formatDate(accessory.purchaseDate)}</Text>
            </View>
            
            {accessory.condition && (
              <View style={styles.infoItem}>
                <Tag size={20} color={appColors.primary} />
                <Text style={styles.infoLabel}>Condição</Text>
                <Text style={styles.infoValue}>{accessory.condition}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Preço Pago:</Text>
            <Text style={styles.priceValue}>
              {showValues ? `R$ ${(accessory.pricePaid || 0).toFixed(2)}` : 'R$ ******'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manutenção</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Wrench size={20} color={appColors.primary} />
              <Text style={styles.infoLabel}>Última Manutenção</Text>
              <Text style={styles.infoValue}>
                {accessory.lastMaintenanceDate ? formatDate(accessory.lastMaintenanceDate) : 'Nunca'}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Calendar size={20} color={appColors.primary} />
              <Text style={styles.infoLabel}>Próxima Manutenção</Text>
              <Text style={styles.infoValue}>
                {accessory.nextMaintenanceDate ? formatDate(accessory.nextMaintenanceDate) : 'Não agendada'}
              </Text>
            </View>
          </View>
          
          {accessory.maintenanceDescription && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Observações:</Text>
              <Text style={styles.notesText}>{accessory.maintenanceDescription}</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  imageContainer: {
    height: 250,
    backgroundColor: darkTheme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.surfaceVariant,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: darkTheme.colors.onBackground,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: appColors.primary,
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    color: appColors.foreground,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: appColors.primary,
    marginBottom: 8,
  },
  divider: {
    backgroundColor: darkTheme.colors.outlineVariant,
    height: 1,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: darkTheme.colors.onSurface,
    marginTop: 2,
    textAlign: 'center',
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  notesText: {
    color: darkTheme.colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  priceContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(0, 120, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    color: darkTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  priceValue: {
    color: darkTheme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AccessoryDetailsScreen; 