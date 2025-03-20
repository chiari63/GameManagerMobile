import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Divider, Switch } from 'react-native-paper';
import { Moon, Sun, Bell, Info, RefreshCw, Check, ExternalLink } from 'lucide-react-native';
import { checkIGDBConnection } from '../services/igdbApi';
import darkTheme, { appColors } from '../theme';

const SettingsScreen = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    // Verificar status da API IGDB
    const checkApiStatus = async () => {
      try {
        setApiStatus('checking');
        const isConnected = await checkIGDBConnection();
        setApiStatus(isConnected ? 'connected' : 'disconnected');
      } catch (error) {
        console.error('Erro ao verificar conexão com a API:', error);
        setApiStatus('disconnected');
      }
    };
    
    checkApiStatus();
  }, []);

  const renderThemeSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tema</Text>
        <Divider style={styles.divider} />
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            {isDarkMode ? (
              <Moon size={24} color={appColors.primary} />
            ) : (
              <Sun size={24} color={appColors.primary} />
            )}
            <Text style={styles.settingText}>Tema Escuro</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={setIsDarkMode}
            color={appColors.primary}
          />
        </View>
      </View>
    );
  };

  const renderNotificationsSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificações</Text>
        <Divider style={styles.divider} />
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Bell size={24} color={appColors.primary} />
            <Text style={styles.settingText}>Ativar Notificações</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            color={appColors.primary}
          />
        </View>
      </View>
    );
  };

  const renderIGDBSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API IGDB</Text>
        <Divider style={styles.divider} />
        
        <View style={styles.apiStatusContainer}>
          <Text style={styles.apiStatusLabel}>Status da API:</Text>
          <View style={styles.apiStatusIndicator}>
            {apiStatus === 'checking' ? (
              <ActivityIndicator size="small" color={appColors.primary} />
            ) : (
              <View style={[
                styles.statusDot, 
                { backgroundColor: apiStatus === 'connected' ? '#4ade80' : '#ef4444' }
              ]} />
            )}
            <Text style={styles.apiStatusText}>
              {apiStatus === 'connected' 
                ? 'Conectado' 
                : apiStatus === 'disconnected' 
                  ? 'Desconectado' 
                  : 'Verificando...'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={async () => {
              try {
                setApiStatus('checking');
                const isConnected = await checkIGDBConnection();
                setApiStatus(isConnected ? 'connected' : 'disconnected');
              } catch (error) {
                console.error('Erro ao verificar conexão com a API:', error);
                setApiStatus('disconnected');
              }
            }}
          >
            <RefreshCw size={16} color={appColors.primary} />
            <Text style={styles.refreshButtonText}>Verificar novamente</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.apiInfoContainer}>
          <Text style={styles.apiInfoTitle}>Sobre a IGDB</Text>
          <Text style={styles.apiInfoText}>
            A IGDB (Internet Game Database) é uma API que fornece informações detalhadas sobre jogos, 
            consoles e empresas da indústria de games. Este aplicativo utiliza a IGDB para enriquecer 
            seu catálogo com dados oficiais.
          </Text>
          
          <Text style={styles.apiInfoTitle}>Recursos disponíveis</Text>
          <View style={styles.apiFeatureList}>
            <View style={styles.apiFeatureItem}>
              <Check size={16} color="#4ade80" />
              <Text style={styles.apiFeatureText}>Busca de jogos por nome</Text>
            </View>
            <View style={styles.apiFeatureItem}>
              <Check size={16} color="#4ade80" />
              <Text style={styles.apiFeatureText}>Busca de consoles por nome</Text>
            </View>
            <View style={styles.apiFeatureItem}>
              <Check size={16} color="#4ade80" />
              <Text style={styles.apiFeatureText}>Detalhes completos de jogos</Text>
            </View>
            <View style={styles.apiFeatureItem}>
              <Check size={16} color="#4ade80" />
              <Text style={styles.apiFeatureText}>Detalhes completos de consoles</Text>
            </View>
            <View style={styles.apiFeatureItem}>
              <Check size={16} color="#4ade80" />
              <Text style={styles.apiFeatureText}>Imagens de alta qualidade</Text>
            </View>
          </View>
          
          <Text style={styles.apiInfoTitle}>Links úteis</Text>
          <View style={styles.apiLinksList}>
            <TouchableOpacity 
              style={styles.apiLinkItem}
              onPress={() => Linking.openURL('https://api-docs.igdb.com/')}
            >
              <ExternalLink size={16} color={appColors.primary} />
              <Text style={styles.apiLinkText}>Documentação da API</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.apiLinkItem}
              onPress={() => Linking.openURL('https://www.igdb.com/')}
            >
              <ExternalLink size={16} color={appColors.primary} />
              <Text style={styles.apiLinkText}>Site oficial da IGDB</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderAboutSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sobre</Text>
        <Divider style={styles.divider} />
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Info size={24} color={appColors.primary} />
            <Text style={styles.settingText}>Sobre o Aplicativo</Text>
          </View>
        </View>
      </View>
    );
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Configurações</Text>
        
        {renderThemeSection()}
        {renderNotificationsSection()}
        {renderIGDBSection()}
        {renderAboutSection()}
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Versão 1.0.0</Text>
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
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: darkTheme.colors.onBackground,
    marginBottom: 24,
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: darkTheme.colors.onSurface,
    marginLeft: 12,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  versionText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
  },
  apiStatusContainer: {
    marginBottom: 16,
  },
  apiStatusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: darkTheme.colors.onSurface,
    marginBottom: 8,
  },
  apiStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  apiStatusText: {
    fontSize: 15,
    color: darkTheme.colors.onSurfaceVariant,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    color: appColors.primary,
    marginLeft: 8,
  },
  apiInfoContainer: {
    marginTop: 8,
  },
  apiInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: darkTheme.colors.onSurface,
    marginBottom: 8,
    marginTop: 16,
  },
  apiInfoText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  apiFeatureList: {
    marginTop: 8,
  },
  apiFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  apiFeatureText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginLeft: 8,
  },
  apiLinksList: {
    marginTop: 8,
  },
  apiLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  apiLinkText: {
    fontSize: 14,
    color: appColors.primary,
    marginLeft: 8,
  },
});

export default SettingsScreen; 