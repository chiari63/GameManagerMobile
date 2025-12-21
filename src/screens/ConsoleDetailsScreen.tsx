import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Divider } from 'react-native-paper';
import { Calendar, Tag, Gamepad, ArrowLeft, ExternalLink, Wrench, ShoppingBag, DollarSign } from 'lucide-react-native';
import { formatImageUrl, getPlatformDetails } from '../services/igdbApi';
import darkTheme, { appColors } from '../theme';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';

const ConsoleDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { console } = route.params as { console: any };
  const { showValues } = useValuesVisibility();
  const [igdbDetails, setIgdbDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    const fetchIGDBDetails = async () => {
      if (console.igdbId) {
        setLoading(true);
        try {
          const details = await getPlatformDetails(console.igdbId);
          setIgdbDetails(details);
        } catch (error) {
          console.error('Erro ao buscar detalhes do IGDB:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchIGDBDetails();
  }, [console]);

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

  const openWebsite = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Erro ao abrir URL:', err));
  };

  const getWebsiteLabel = (category: number) => {
    const categories: Record<number, string> = {
      1: 'Site Oficial',
      2: 'Wikia',
      3: 'Wikipedia',
      4: 'Facebook',
      5: 'Twitter',
      6: 'Twitch',
      8: 'Instagram',
      9: 'YouTube',
      13: 'Steam',
      14: 'Reddit',
      15: 'Itch',
      16: 'Epic Games',
      17: 'GOG',
      18: 'Discord'
    };
    return categories[category] || 'Link';
  };

  const getCategoryName = (category: number) => {
    const categories: Record<number, string> = {
      1: 'Console',
      2: 'Portátil',
      3: 'Computador',
      4: 'Mobile',
      5: 'Arcade',
      6: 'Virtual Reality'
    };
    return categories[category] || 'Outro';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        {console.imageUrl ? (
          <Image source={{ uri: console.imageUrl }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.placeholderImage}>
            <Gamepad size={80} color={appColors.primary} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{console.name}</Text>
        
        <View style={styles.badgeContainer}>
          {console.brand && (
            <View style={styles.badge}>
              <Tag size={14} color={appColors.foreground} style={styles.badgeIcon} />
              <Text style={styles.badgeText}>{console.brand}</Text>
            </View>
          )}
          
          {console.model && (
            <View style={styles.badge}>
              <Gamepad size={14} color={appColors.foreground} style={styles.badgeIcon} />
              <Text style={styles.badgeText}>{console.model}</Text>
            </View>
          )}
          
          {console.region && (
            <View style={styles.badge}>
              <Tag size={14} color={appColors.foreground} style={styles.badgeIcon} />
              <Text style={styles.badgeText}>{console.region}</Text>
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
              <Text style={styles.infoValue}>{formatDate(console.purchaseDate)}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Tag size={20} color={appColors.primary} />
              <Text style={styles.infoLabel}>Condição</Text>
              <Text style={styles.infoValue}>
                {console.condition || 'Não informado'}
              </Text>
            </View>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Preço Pago:</Text>
            <Text style={styles.priceValue}>
              {showValues ? `R$ ${(console.pricePaid || 0).toFixed(2)}` : 'R$ ******'}
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
                {console.lastMaintenanceDate ? formatDate(console.lastMaintenanceDate) : 'Nunca'}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Calendar size={20} color={appColors.primary} />
              <Text style={styles.infoLabel}>Próxima Manutenção</Text>
              <Text style={styles.infoValue}>
                {console.nextMaintenanceDate ? formatDate(console.nextMaintenanceDate) : 'Não agendada'}
              </Text>
            </View>
          </View>
          
          {console.maintenanceDescription && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Observações:</Text>
              <Text style={styles.notesText}>{console.maintenanceDescription}</Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={appColors.primary} />
            <Text style={styles.loadingText}>Carregando detalhes da IGDB...</Text>
          </View>
        ) : igdbDetails ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalhes da IGDB</Text>
            <Divider style={styles.divider} />
            
            {igdbDetails.summary && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Resumo</Text>
                <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                  <Text style={styles.detailValue}>
                    {showFullDescription 
                      ? igdbDetails.summary 
                      : (igdbDetails.summary.length > 150 
                        ? igdbDetails.summary.substring(0, 150) + '...' 
                        : igdbDetails.summary)
                    }
                  </Text>
                  {igdbDetails.summary.length > 150 && (
                    <Text style={styles.readMore}>
                      {showFullDescription ? 'Mostrar menos' : 'Ler mais'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            
            {igdbDetails.generation && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Geração</Text>
                <Text style={styles.detailValue}>{igdbDetails.generation}</Text>
              </View>
            )}
            
            {igdbDetails.platform_family && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Família</Text>
                <Text style={styles.detailValue}>{igdbDetails.platform_family.name}</Text>
              </View>
            )}
            
            {igdbDetails.category && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Categoria</Text>
                <Text style={styles.detailValue}>{getCategoryName(igdbDetails.category)}</Text>
              </View>
            )}
            
            {igdbDetails.versions && igdbDetails.versions.length > 0 && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Versões</Text>
                <View style={styles.versionsContainer}>
                  {igdbDetails.versions.map((version: any, index: number) => (
                    <View key={index} style={styles.versionItem}>
                      <Text style={styles.versionName}>{version.name}</Text>
                      {version.platform_version_release_dates && version.platform_version_release_dates.length > 0 && (
                        <Text style={styles.versionDate}>
                          Lançamento: {new Date(version.platform_version_release_dates[0].date * 1000).toLocaleDateString('pt-BR')}
                          {version.platform_version_release_dates[0].region && ` (${version.platform_version_release_dates[0].region})`}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {igdbDetails.websites && igdbDetails.websites.length > 0 && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Links</Text>
                <View style={styles.websitesContainer}>
                  {igdbDetails.websites.map((website: any, index: number) => (
                    <TouchableOpacity 
                      key={index}
                      style={styles.websiteButton}
                      onPress={() => openWebsite(website.url)}
                    >
                      <ExternalLink size={16} color={appColors.primary} />
                      <Text style={styles.websiteButtonText}>
                        {getWebsiteLabel(website.category)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : console.igdbId ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalhes da IGDB</Text>
            <Divider style={styles.divider} />
            <Text style={styles.noDataText}>Não foi possível carregar os detalhes da IGDB.</Text>
          </View>
        ) : null}
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
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: darkTheme.colors.onSurfaceVariant,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: darkTheme.colors.onSurface,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 22,
  },
  readMore: {
    color: appColors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  versionsContainer: {
    marginTop: 8,
  },
  versionItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 8,
  },
  versionName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: darkTheme.colors.onSurface,
    marginBottom: 4,
  },
  versionDate: {
    fontSize: 13,
    color: darkTheme.colors.onSurfaceVariant,
  },
  websitesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  websiteButtonText: {
    color: appColors.primary,
    fontWeight: '500',
    marginLeft: 6,
  },
  noDataText: {
    fontSize: 15,
    color: darkTheme.colors.onSurfaceVariant,
    fontStyle: 'italic',
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

export default ConsoleDetailsScreen; 