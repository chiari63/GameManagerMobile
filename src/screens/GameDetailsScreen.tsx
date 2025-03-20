import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Divider } from 'react-native-paper';
import { Calendar, Tag, Gamepad, Bookmark, Star, ArrowLeft, ExternalLink, Monitor, Layers, Book, ImageIcon, Globe } from 'lucide-react-native';
import { getConsoles } from '../services/storage';
import { formatImageUrl, getGameDetails } from '../services/igdbApi';
import darkTheme, { appColors } from '../theme';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';

// Função para traduzir texto usando a API do Google Translate
const translateText = async (text: string, targetLanguage = 'pt') => {
  if (!text) return '';
  
  try {
    // Usando a API pública do Google Translate
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    // A resposta vem em um formato específico, precisamos extrair o texto traduzido
    let translatedText = '';
    if (data && data[0]) {
      data[0].forEach((item: any) => {
        if (item[0]) {
          translatedText += item[0];
        }
      });
    }
    
    return translatedText;
  } catch (error) {
    console.error('Erro ao traduzir texto:', error);
    return text; // Retorna o texto original em caso de erro
  }
};

const GameDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { game } = route.params as { game: any };
  const { showValues } = useValuesVisibility();
  const [consoleName, setConsoleName] = useState('');
  const [igdbDetails, setIgdbDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showFullStoryline, setShowFullStoryline] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null);
  const [translatedStoryline, setTranslatedStoryline] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    const fetchConsoleName = async () => {
      if (game.consoleId) {
        const consoles = await getConsoles();
        const console = consoles.find(c => c.id === game.consoleId);
        if (console) {
          setConsoleName(console.name);
        }
      }
    };

    const fetchIGDBDetails = async () => {
      console.log('GameDetailsScreen - Dados do jogo:', JSON.stringify(game));
      
      if (!game.igdbId) {
        console.log('Nenhum ID IGDB fornecido para o jogo:', game.name);
        return;
      }
      
      console.log('Buscando detalhes do jogo com ID:', game.igdbId);
      console.log('Tipo do ID:', typeof game.igdbId);
      
      // Garantir que o ID seja um número
      let gameId;
      
      if (typeof game.igdbId === 'string') {
        // Remover qualquer caractere não numérico
        const cleanId = game.igdbId.replace(/[^0-9]/g, '');
        console.log('ID limpo (apenas números):', cleanId);
        
        if (cleanId) {
          gameId = parseInt(cleanId, 10);
        } else {
          console.error('ID do jogo não contém números válidos:', game.igdbId);
          setIgdbDetails(null);
          setLoading(false);
          return;
        }
      } else {
        gameId = game.igdbId;
      }
      
      console.log('ID convertido para número:', gameId);
      
      if (isNaN(gameId) || gameId <= 0) {
        console.error('ID do jogo inválido após conversão:', gameId);
        setIgdbDetails(null);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Forçar uma nova requisição sem usar o cache
        const details = await getGameDetails(gameId, false);
        console.log('IGDB Details recebidos:', details ? 'Sim' : 'Não');
        if (details) {
          console.log('IGDB Details ID:', details.id);
          console.log('IGDB Details Nome:', details.name);
          console.log('IGDB Details Plataformas:', details.platforms ? details.platforms.length : 0);
          console.log('IGDB Details História:', details.storyline ? 'Sim' : 'Não');
          console.log('IGDB Details Resumo:', details.summary ? 'Sim' : 'Não');
          
          // Log de todas as propriedades do objeto para depuração
          console.log('IGDB Details - Todas as propriedades:', Object.keys(details));
          
          // Log de propriedades específicas
          if (details.involved_companies) {
            console.log('IGDB Details - Empresas envolvidas:', details.involved_companies.length);
          }
          if (details.websites) {
            console.log('IGDB Details - Websites:', details.websites.length);
          }
          if (details.screenshots) {
            console.log('IGDB Details - Screenshots:', details.screenshots.length);
          }
        } else {
          console.log('Nenhum detalhe recebido da API');
        }
        setIgdbDetails(details);
      } catch (error) {
        console.error('Erro ao buscar detalhes do IGDB:', error);
        setIgdbDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchConsoleName();
    fetchIGDBDetails();
  }, [game]);

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

  const formatRating = (rating: number) => {
    return rating ? (rating / 10).toFixed(1) : 'N/A';
  };

  const getCompanies = (type: 'developer' | 'publisher') => {
    if (!igdbDetails?.involved_companies) return [];
    
    return igdbDetails.involved_companies
      .filter((company: any) => company[type])
      .map((company: any) => company.company.name);
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
      10: 'iPhone',
      11: 'iPad',
      12: 'Android',
      13: 'Steam',
      14: 'Reddit',
      15: 'Itch',
      16: 'Epic Games',
      17: 'GOG',
      18: 'Discord'
    };
    return categories[category] || 'Link';
  };

  // Função para traduzir o resumo e a história
  const handleTranslate = async () => {
    if (!igdbDetails) return;
    
    setTranslating(true);
    
    try {
      // Traduzir o resumo se existir
      if (igdbDetails.summary) {
        const summary = await translateText(igdbDetails.summary);
        setTranslatedSummary(summary);
      }
      
      // Traduzir a história se existir
      if (igdbDetails.storyline) {
        const storyline = await translateText(igdbDetails.storyline);
        setTranslatedStoryline(storyline);
      }
    } catch (error) {
      console.error('Erro ao traduzir conteúdo:', error);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
      {game.imageUrl ? (
          <Image source={{ uri: game.imageUrl }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={styles.placeholderImage}>
            <Gamepad size={80} color={appColors.primary} />
        </View>
      )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{game.name}</Text>
        
        <View style={styles.badgeContainer}>
          {game.genre && (
            <View style={styles.badge}>
              <Tag size={14} color={appColors.foreground} style={styles.badgeIcon} />
              <Text style={styles.badgeText}>{game.genre}</Text>
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
            <Text style={styles.sectionTitle}>Informações Gerais</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Calendar size={20} color={appColors.primary} />
            <Text style={styles.infoLabel}>Ano de Lançamento</Text>
            <Text style={styles.infoValue}>{game.releaseYear || 'Não informado'}</Text>
            </View>

            <View style={styles.infoItem}>
              <Monitor size={20} color={appColors.primary} />
              <Text style={styles.infoLabel}>Formato</Text>
              <Text style={styles.infoValue}>{game.isPhysical ? 'Físico' : 'Digital'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações de Compra</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Bookmark size={20} color={appColors.primary} />
              <Text style={styles.infoLabel}>Data de Aquisição</Text>
              <Text style={styles.infoValue}>{formatDate(game.purchaseDate)}</Text>
            </View>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Preço Pago:</Text>
            <Text style={styles.priceValue}>
              {showValues ? `R$ ${(game.pricePaid || 0).toFixed(2)}` : 'R$ ******'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={appColors.primary} />
            <Text style={styles.loadingText}>Carregando detalhes da IGDB...</Text>
          </View>
        ) : (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Detalhes da IGDB</Text>
              
              {igdbDetails && (igdbDetails.summary || igdbDetails.storyline) && (
                <TouchableOpacity 
                  style={styles.translateButton}
                  onPress={handleTranslate}
                  disabled={translating}
                >
                  {translating ? (
                    <ActivityIndicator size="small" color={appColors.primary} />
                  ) : (
                    <>
                      <Globe size={16} color={appColors.primary} style={styles.translateIcon} />
                      <Text style={styles.translateButtonText}>
                        {translatedSummary || translatedStoryline ? 'Traduzido' : 'Traduzir'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
            
            <Divider style={styles.divider} />
            
            {!igdbDetails && game.igdbId ? (
              <View>
                <Text style={styles.noDataText}>Não foi possível carregar os detalhes da IGDB.</Text>
                <Text style={styles.noDataText}>ID IGDB: {game.igdbId}</Text>
                <Text style={styles.noDataText}>Isso pode ocorrer se o jogo não estiver cadastrado na base de dados da IGDB ou se houver problemas de conexão.</Text>
              </View>
            ) : !game.igdbId ? (
              <View>
                <Text style={styles.noDataText}>Este jogo não possui um ID IGDB associado.</Text>
                <Text style={styles.noDataText}>Você pode editar o jogo e adicionar um ID IGDB para ver informações detalhadas.</Text>
              </View>
            ) : (
              <>
                {/* Resumo - Renderização simplificada */}
                <View style={styles.detailItem}>
                  <View style={styles.detailLabelContainer}>
                    <Tag size={18} color={appColors.primary} style={styles.detailIcon} />
                    <Text style={styles.detailLabel}>Resumo</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {translatedSummary 
                      ? (showFullDescription 
                          ? translatedSummary 
                          : (translatedSummary.length > 150 
                              ? translatedSummary.substring(0, 150) + '...' 
                              : translatedSummary))
                      : igdbDetails?.summary 
                        ? (showFullDescription 
                            ? igdbDetails.summary 
                            : (igdbDetails.summary.length > 150 
                                ? igdbDetails.summary.substring(0, 150) + '...' 
                                : igdbDetails.summary))
                        : 'Informação não disponível'}
                  </Text>
                  {((translatedSummary && translatedSummary.length > 150) || 
                    (igdbDetails?.summary && igdbDetails.summary.length > 150)) && (
                    <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                      <Text style={styles.readMore}>
                        {showFullDescription ? 'Mostrar menos' : 'Ler mais'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* Classificação */}
                {(igdbDetails?.rating || igdbDetails?.aggregated_rating) && (
                  <View style={styles.detailItem}>
                    <View style={styles.detailLabelContainer}>
                      <Star size={18} color={appColors.primary} style={styles.detailIcon} />
                      <Text style={styles.detailLabel}>Classificação</Text>
                    </View>
                    <View style={styles.ratingsContainer}>
                      {igdbDetails?.rating && (
                        <View style={styles.ratingItem}>
                          <Star size={16} color={appColors.primary} />
                          <Text style={styles.ratingLabel}>Usuários:</Text>
                          <Text style={styles.ratingValue}>{formatRating(igdbDetails.rating)}/10</Text>
                          <Text style={styles.ratingCount}>({igdbDetails.rating_count || 0} votos)</Text>
                        </View>
                      )}
                      
                      {igdbDetails?.aggregated_rating && (
                        <View style={styles.ratingItem}>
                          <Star size={16} color={appColors.primary} />
                          <Text style={styles.ratingLabel}>Críticos:</Text>
                          <Text style={styles.ratingValue}>{formatRating(igdbDetails.aggregated_rating)}/10</Text>
                          <Text style={styles.ratingCount}>({igdbDetails.aggregated_rating_count || 0} críticas)</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                
                {/* Desenvolvedores */}
                {getCompanies('developer').length > 0 && (
                  <View style={styles.detailItem}>
                    <View style={styles.detailLabelContainer}>
                      <Monitor size={18} color={appColors.primary} style={styles.detailIcon} />
                      <Text style={styles.detailLabel}>Desenvolvedores</Text>
                    </View>
                    <Text style={styles.detailValue}>{getCompanies('developer').join(', ')}</Text>
                  </View>
                )}
                
                {/* Publicadoras */}
                {getCompanies('publisher').length > 0 && (
                  <View style={styles.detailItem}>
                    <View style={styles.detailLabelContainer}>
                      <Bookmark size={18} color={appColors.primary} style={styles.detailIcon} />
                      <Text style={styles.detailLabel}>Publicadoras</Text>
                    </View>
                    <Text style={styles.detailValue}>{getCompanies('publisher').join(', ')}</Text>
                  </View>
                )}
                
                {/* Plataformas Suportadas */}
                <View style={styles.detailItem}>
                  <View style={styles.detailLabelContainer}>
                    <Layers size={18} color={appColors.primary} style={styles.detailIcon} />
                    <Text style={styles.detailLabel}>Plataformas Suportadas</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {igdbDetails?.platforms ? 
                      igdbDetails.platforms.map((platform: any) => platform.name).join(', ') : 
                      'Informação não disponível'}
                  </Text>
                </View>
                
                {/* História */}
                <View style={styles.detailItem}>
                  <View style={styles.detailLabelContainer}>
                    <Book size={18} color={appColors.primary} style={styles.detailIcon} />
                    <Text style={styles.detailLabel}>História</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {translatedStoryline 
                      ? (showFullStoryline 
                          ? translatedStoryline 
                          : (translatedStoryline.length > 150 
                              ? translatedStoryline.substring(0, 150) + '...' 
                              : translatedStoryline))
                      : igdbDetails?.storyline 
                        ? (showFullStoryline 
                            ? igdbDetails.storyline 
                            : (igdbDetails.storyline.length > 150 
                                ? igdbDetails.storyline.substring(0, 150) + '...' 
                                : igdbDetails.storyline))
                        : 'Informação não disponível'}
                  </Text>
                  {((translatedStoryline && translatedStoryline.length > 150) || 
                    (igdbDetails?.storyline && igdbDetails.storyline.length > 150)) && (
                    <TouchableOpacity onPress={() => setShowFullStoryline(!showFullStoryline)}>
                      <Text style={styles.readMore}>
                        {showFullStoryline ? 'Mostrar menos' : 'Ler mais'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* Modos de Jogo */}
                {igdbDetails?.game_modes && igdbDetails.game_modes.length > 0 && (
                  <View style={styles.detailItem}>
                    <View style={styles.detailLabelContainer}>
                      <Gamepad size={18} color={appColors.primary} style={styles.detailIcon} />
                      <Text style={styles.detailLabel}>Modos de Jogo</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {igdbDetails.game_modes.map((mode: any) => mode.name).join(', ')}
                    </Text>
                  </View>
                )}
                
                {/* Temas */}
                {igdbDetails?.themes && igdbDetails.themes.length > 0 && (
                  <View style={styles.detailItem}>
                    <View style={styles.detailLabelContainer}>
                      <Tag size={18} color={appColors.primary} style={styles.detailIcon} />
                      <Text style={styles.detailLabel}>Temas</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {igdbDetails.themes.map((theme: any) => theme.name).join(', ')}
                    </Text>
                  </View>
                )}
                
                {/* Capturas de Tela */}
                {igdbDetails?.screenshots && igdbDetails.screenshots.length > 0 && (
                  <View style={styles.detailItem}>
                    <View style={styles.detailLabelContainer}>
                      <ImageIcon size={18} color={appColors.primary} style={styles.detailIcon} />
                      <Text style={styles.detailLabel}>Capturas de Tela</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.screenshotsContainer}>
                      {igdbDetails.screenshots.map((screenshot: any, index: number) => (
                        <Image 
                          key={index}
                          source={{ uri: formatImageUrl(screenshot.image_id, 'screenshot') }}
                          style={styles.screenshotImage}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </View>
        )}
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
  ratingsContainer: {
    marginTop: 8,
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginLeft: 8,
    marginRight: 4,
  },
  ratingValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: darkTheme.colors.onSurface,
  },
  ratingCount: {
    fontSize: 13,
    color: darkTheme.colors.onSurfaceVariant,
    marginLeft: 4,
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
  screenshotsContainer: {
    marginTop: 8,
  },
  screenshotImage: {
    width: 280,
    height: 158,
    borderRadius: 8,
    marginRight: 8,
  },
  noDataText: {
    fontSize: 15,
    color: darkTheme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.primary,
  },
  translateIcon: {
    marginRight: 4,
  },
  translateButtonText: {
    color: appColors.primary,
    fontSize: 12,
    fontWeight: '500',
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

export default GameDetailsScreen; 