import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Divider, Menu, Portal, Modal, Button, TextInput } from 'react-native-paper';
import {
  Calendar, Tag, Gamepad, Bookmark, Star, ArrowLeft, ExternalLink, Monitor,
  Layers, Book, ImageIcon, Globe, MoreVertical, Edit, Trash2, ShoppingBag,
  DollarSign, Info, Trophy, Clock
} from 'lucide-react-native';
import { getConsoles, deleteGame } from '../services/storage';
import { formatImageUrl, getGameDetails } from '../services/igdbApi';
import darkTheme, { appColors } from '../theme';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';
import { commonStyles } from '../theme/commonStyles';
import { formatDate, formatCurrency } from '../utils/formatters';
import { translateText } from '../services/translate';
import { Alert } from 'react-native';


const GameDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { game } = route.params as { game: any };
  const { showValues } = useValuesVisibility();
  const theme = darkTheme;

  const [consoleName, setConsoleName] = useState('');
  const [igdbDetails, setIgdbDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showFullStoryline, setShowFullStoryline] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null);
  const [translatedStoryline, setTranslatedStoryline] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [usingLocalData, setUsingLocalData] = useState(false);
  const [gameMenuVisible, setGameMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'media'>('info');

  useEffect(() => {
    const fetchConsoleName = async () => {
      if (game.consoleId) {
        const consoles = await getConsoles();
        const consoleObj = consoles.find(c => c.id === game.consoleId);
        if (consoleObj) {
          setConsoleName(consoleObj.name);
        }
      }
    };

    const fetchIGDBDetails = async () => {
      // Primeiro, verificar se temos dados salvos localmente
      if (game.igdbData) {
        setIgdbDetails(game.igdbData);
        setUsingLocalData(true);
        return;
      }

      // Se não houver dados salvos, buscar da API
      if (!game.igdbId) {
        setIgdbDetails(null);
        return;
      }

      // Garantir que o ID seja um número
      let gameId;
      if (typeof game.igdbId === 'string') {
        const cleanId = game.igdbId.replace(/[^0-9]/g, '');
        if (cleanId) {
          gameId = parseInt(cleanId, 10);
        } else {
          setIgdbDetails(null);
          return;
        }
      } else {
        gameId = game.igdbId;
      }

      if (isNaN(gameId) || gameId <= 0) {
        setIgdbDetails(null);
        return;
      }

      setLoading(true);
      setUsingLocalData(false);
      try {
        const details = await getGameDetails(gameId, false);
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
      1: 'Site Oficial', 2: 'Wikia', 3: 'Wikipedia', 4: 'Facebook', 5: 'Twitter',
      6: 'Twitch', 8: 'Instagram', 9: 'YouTube', 10: 'iPhone', 11: 'iPad',
      12: 'Android', 13: 'Steam', 14: 'Reddit', 15: 'Itch', 16: 'Epic Games',
      17: 'GOG', 18: 'Discord'
    };
    return categories[category] || 'Link';
  };

  const handleTranslate = async () => {
    if (!igdbDetails) return;
    setTranslating(true);
    try {
      if (igdbDetails.summary) {
        const summary = await translateText(igdbDetails.summary);
        setTranslatedSummary(summary);
      }
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

  const handleEditGame = () => {
    // @ts-ignore
    navigation.navigate('GamesList', { editingGame: game });
  };

  const handleDeleteGame = () => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este jogo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGame(game.id);
              navigation.goBack();
            } catch (error) {
              console.error('Erro ao excluir jogo:', error);
              Alert.alert('Erro', 'Não foi possível excluir o jogo.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroContainer}>
          {game.imageUrl ? (
            <Image source={{ uri: game.imageUrl }} style={styles.heroImageFull} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderHero}>
              <Gamepad size={80} color={appColors.primary} />
            </View>
          )}
          <View style={styles.heroGradient} />

          {/* Floating Action Buttons over Hero */}
          <View style={styles.heroActions}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroActionButton}>
              <ArrowLeft color="#fff" size={24} />
            </TouchableOpacity>

            <Menu
              visible={gameMenuVisible}
              onDismiss={() => setGameMenuVisible(false)}
              anchor={
                <TouchableOpacity onPress={() => setGameMenuVisible(true)} style={styles.heroActionButton}>
                  <MoreVertical color="#fff" size={24} />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={() => { setGameMenuVisible(false); handleEditGame(); }}
                title="Editar Jogo"
                leadingIcon={({ size, color }) => <Edit size={size} color={color} />}
              />
              <Divider />
              <Menu.Item
                onPress={() => { setGameMenuVisible(false); handleDeleteGame(); }}
                title="Excluir Jogo"
                leadingIcon={({ size, color }) => <Trash2 size={size} color={appColors.destructive} />}
                titleStyle={{ color: appColors.destructive }}
              />
            </Menu>
          </View>

          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitleMain}>{game.name}</Text>
            <View style={styles.mainBadgeRow}>
              {game.genre && (
                <View style={[styles.solidBadge, { backgroundColor: appColors.primary }]}>
                  <Tag size={12} color="#fff" />
                  <Text style={styles.solidBadgeText}>{game.genre}</Text>
                </View>
              )}
              {consoleName && (
                <View style={[styles.solidBadge, { backgroundColor: appColors.console }]}>
                  <Gamepad size={12} color="#fff" />
                  <Text style={styles.solidBadgeText}>{consoleName}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Global Summary Card (Floating) */}
        <View style={styles.summaryCardWrapper}>
          <View style={[styles.glassSummaryCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Lançamento</Text>
              <Text style={styles.summaryValue}>{game.releaseYear || 'N/A'}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Formato</Text>
              <Text style={[styles.summaryValue, { color: appColors.primary }]}>
                {game.isPhysical ? 'Físico' : 'Digital'}
              </Text>
            </View>
            {igdbDetails?.rating && (
              <>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Rating</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Star size={14} color="#f59e0b" fill="#f59e0b" />
                    <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                      {(igdbDetails.rating / 10).toFixed(1)}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {/* Purchase Details - Always Visible */}
          <View style={styles.premiumSection}>
            <View style={styles.sectionTitleRow}>
              <ShoppingBag size={20} color={appColors.primary} />
              <Text style={styles.premiumSectionTitle}>Detalhes da Aquisição</Text>
            </View>
            <View style={styles.premiumInfoGrid}>
              <View style={styles.premiumInfoCard}>
                <Calendar size={18} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={styles.premiumInfoLabel}>Comprado em</Text>
                  <Text style={styles.premiumInfoValue}>{formatDate(game.purchaseDate)}</Text>
                </View>
              </View>
              <View style={styles.premiumInfoCard}>
                <Globe size={18} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={styles.premiumInfoLabel}>Região</Text>
                  <Text style={styles.premiumInfoValue}>{game.region || 'N/A'}</Text>
                </View>
              </View>
            </View>
            {game.pricePaid !== undefined && (
              <View style={styles.premiumPriceCard}>
                <View style={styles.row}>
                  <DollarSign size={20} color="#25d07c" />
                  <Text style={styles.premiumPriceLabel}>Valor Pago</Text>
                </View>
                <Text style={[styles.premiumPriceValue, { color: '#25d07c' }]}>
                  {showValues ? formatCurrency(game.pricePaid) : 'R$ ••••••'}
                </Text>
              </View>
            )}
          </View>

          {/* IGDB Content - Only if available */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={appColors.primary} />
              <Text style={styles.loadingText}>Carregando detalhes...</Text>
            </View>
          ) : igdbDetails ? (
            <>
              <View style={styles.divider} />

              {/* Tabs Navigation */}
              <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'info' && styles.tabActive]} onPress={() => setActiveTab('info')} activeOpacity={0.7}>
                  <Info size={18} color={activeTab === 'info' ? appColors.primary : darkTheme.colors.onSurfaceVariant} />
                  <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Informações</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'media' && styles.tabActive]} onPress={() => setActiveTab('media')} activeOpacity={0.7}>
                  <ImageIcon size={18} color={activeTab === 'media' ? appColors.primary : darkTheme.colors.onSurfaceVariant} />
                  <Text style={[styles.tabText, activeTab === 'media' && styles.tabTextActive]}>Mídia</Text>
                </TouchableOpacity>
              </View>

              {activeTab === 'info' ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Sinopse & Detalhes</Text>
                    {(igdbDetails.summary || igdbDetails.storyline) && (
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

                  {/* Summary */}
                  {igdbDetails?.summary && (
                    <View style={styles.descriptionCard}>
                      <Text style={styles.descriptionTitle}>RESUMO</Text>
                      <Text style={styles.descriptionText}>
                        {translatedSummary || igdbDetails.summary}
                      </Text>
                    </View>
                  )}

                  {/* Storyline */}
                  {(igdbDetails?.storyline || translatedStoryline) && (
                    <View style={[styles.descriptionCard, { marginTop: 12 }]}>
                      <Text style={styles.descriptionTitle}>ENREDO</Text>
                      <Text style={styles.descriptionText}>
                        {translatedStoryline || igdbDetails.storyline}
                      </Text>
                    </View>
                  )}

                  {/* Developers & Publishers */}
                  <View style={[styles.premiumSection, { marginTop: 24 }]}>
                    <View style={styles.infoRow}>
                      {getCompanies('developer').length > 0 && (
                        <View style={styles.infoColumn}>
                          <Text style={styles.infoColumnLabel}>Desenvolvedor</Text>
                          <Text style={styles.infoColumnValue}>{getCompanies('developer')[0]}</Text>
                        </View>
                      )}
                      {getCompanies('publisher').length > 0 && (
                        <View style={styles.infoColumn}>
                          <Text style={styles.infoColumnLabel}>Publicadora</Text>
                          <Text style={styles.infoColumnValue}>{getCompanies('publisher')[0]}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Platforms */}
                  {igdbDetails?.platforms && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Plataformas Suportadas</Text>
                      <View style={styles.tagsContainer}>
                        {igdbDetails.platforms.map((platform: any) => (
                          <View key={platform.id} style={styles.tagBadge}>
                            <Text style={styles.tagText}>{platform.name}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Themes/Genres/Modes/Perspectives */}
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Detalhes do Jogo</Text>
                    <View style={styles.tagsContainer}>
                      {igdbDetails?.themes?.map((theme: any) => (
                        <View key={`theme-${theme.id}`} style={styles.tagBadge}>
                          <Text style={styles.tagText}>{theme.name}</Text>
                        </View>
                      ))}
                      {igdbDetails?.genres?.map((genre: any) => (
                        <View key={`genre-${genre.id}`} style={styles.tagBadge}>
                          <Text style={styles.tagText}>{genre.name}</Text>
                        </View>
                      ))}
                      {igdbDetails?.game_modes?.map((mode: any) => (
                        <View key={`mode-${mode.id}`} style={styles.tagBadge}>
                          <Text style={styles.tagText}>{mode.name}</Text>
                        </View>
                      ))}
                      {igdbDetails?.player_perspectives?.map((perspective: any) => (
                        <View key={`perspective-${perspective.id}`} style={styles.tagBadge}>
                          <Text style={styles.tagText}>{perspective.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Galeria e Links</Text>
                  </View>

                  {igdbDetails?.screenshots && igdbDetails.screenshots.length > 0 ? (
                    <View>
                      {igdbDetails.screenshots.map((screenshot: any, index: number) => (
                        <View key={index} style={styles.screenshotCard}>
                          <Image
                            source={{ uri: formatImageUrl(screenshot.image_id, 'screenshot') }}
                            style={styles.screenshotImage}
                            resizeMode="cover"
                          />
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <ImageIcon size={48} color={darkTheme.colors.onSurfaceVariant} />
                      <Text style={styles.emptyStateText}>Nenhuma imagem disponível</Text>
                    </View>
                  )}

                  {igdbDetails?.websites && igdbDetails.websites.length > 0 && (
                    <View style={{ marginTop: 24 }}>
                      <Text style={styles.detailLabel}>Links Externos</Text>
                      <View style={styles.websitesContainer}>
                        {igdbDetails.websites.map((website: any, index: number) => (
                          <TouchableOpacity key={index} style={styles.websiteButton} onPress={() => openWebsite(website.url)}>
                            <ExternalLink size={16} color={appColors.primary} />
                            <Text style={styles.websiteButtonText}>{getWebsiteLabel(website.category)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  heroContainer: { height: 400, width: '100%', position: 'relative' },
  heroImageFull: { width: '100%', height: '100%' },
  placeholderHero: { width: '100%', height: '100%', backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center' },
  heroGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  heroActions: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  heroActionButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroTitleContainer: { position: 'absolute', bottom: 60, left: 24, right: 24 },
  heroTitleMain: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 },
  mainBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  solidBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6 },
  solidBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  summaryCardWrapper: { marginTop: -40, paddingHorizontal: 20, zIndex: 20 },
  glassSummaryCard: { flexDirection: 'row', borderRadius: 24, padding: 24, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 15 },
  content: { paddingHorizontal: 20, paddingTop: 30 },
  tabsContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 6, marginBottom: 24 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  tabActive: { backgroundColor: 'rgba(74, 155, 255, 0.1)' },
  tabText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  tabTextActive: { color: appColors.primary, fontWeight: 'bold' },
  premiumSection: { marginBottom: 24 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  premiumSectionTitle: { fontSize: 18, fontWeight: 'bold', color: appColors.primary, letterSpacing: 0.5 },
  premiumInfoGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  premiumInfoCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  premiumInfoLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },
  premiumInfoValue: { fontSize: 14, color: '#fff', fontWeight: '600', marginTop: 2 },
  premiumPriceCard: { backgroundColor: 'rgba(37, 208, 124, 0.05)', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(37, 208, 124, 0.1)' },
  premiumPriceLabel: { fontSize: 14, color: '#25d07c', fontWeight: '600', marginLeft: 8 },
  premiumPriceValue: { fontSize: 18, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  divider: { backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
  descriptionCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  descriptionTitle: { fontSize: 12, fontWeight: 'bold', color: appColors.primary, marginBottom: 12, letterSpacing: 1 },
  descriptionText: { fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 24 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  infoColumn: { flex: 1 },
  infoColumnLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  infoColumnValue: { fontSize: 15, color: '#fff', fontWeight: '500' },
  detailItem: { marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 16 },
  detailLabel: { fontSize: 14, fontWeight: 'bold', color: appColors.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBadge: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tagText: { color: '#e2e8f0', fontSize: 13 },
  screenshotCard: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', height: 200, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  screenshotImage: { width: '100%', height: '100%' },
  emptyState: { alignItems: 'center', padding: 40, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16 },
  emptyStateText: { color: 'rgba(255,255,255,0.5)', marginTop: 12 },
  websitesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  websiteButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74, 155, 255, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
  websiteButtonText: { color: appColors.primary, fontWeight: '600', fontSize: 13 },
  translateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: appColors.primary },
  translateIcon: { marginRight: 4 },
  translateButtonText: { color: appColors.primary, fontSize: 12, fontWeight: '500' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 16, color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  noDataText: { fontSize: 15, color: darkTheme.colors.onSurfaceVariant, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
});

export default GameDetailsScreen; 