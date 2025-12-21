import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Card, Text, Button, Chip, useTheme, ActivityIndicator } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { appColors } from '../theme';
import { Gamepad2, Wifi, WifiOff, RefreshCw } from 'lucide-react-native';
import { getIGDBCredentials } from '../services/igdbAuth';
import { checkIGDBConnection } from '../services/igdbApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storage';

type ApisConfigNavigationProp = StackNavigationProp<RootStackParamList, 'ApisConfig'>;

const ApisConfigScreen: React.FC = () => {
  const navigation = useNavigation<ApisConfigNavigationProp>();
  const theme = useTheme();

  const [igdbConfigured, setIgdbConfigured] = useState(false);
  const [igdbTokenValid, setIgdbTokenValid] = useState(false);
  const [igdbConnectionStatus, setIgdbConnectionStatus] = useState<{
    connected: boolean;
    message: string;
    checking: boolean;
  }>({
    connected: false,
    message: '',
    checking: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({
      title: 'Configurar APIs',
    });
  }, [navigation]);

  // Verificar status de conexão do IGDB
  const checkIgdbConnection = async () => {
    if (!igdbConfigured) {
      setIgdbConnectionStatus({
        connected: false,
        message: 'API não configurada',
        checking: false,
      });
      return;
    }

    try {
      setIgdbConnectionStatus(prev => ({ ...prev, checking: true }));
      const status = await checkIGDBConnection();
      setIgdbConnectionStatus({
        connected: status.connected,
        message: status.message,
        checking: false,
      });
    } catch (error) {
      setIgdbConnectionStatus({
        connected: false,
        message: 'Erro ao verificar conexão',
        checking: false,
      });
    }
  };

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoading(true);
        const creds = await getIGDBCredentials();
        const token = await AsyncStorage.getItem(STORAGE_KEYS.IGDB_ACCESS_TOKEN);
        const expiry = await AsyncStorage.getItem(STORAGE_KEYS.IGDB_TOKEN_EXPIRY);
        setIgdbConfigured(!!creds.clientId && !!creds.clientSecret);
        setIgdbTokenValid(!!expiry && new Date(expiry).getTime() > Date.now() && !!token);
        
        // Verificar conexão se estiver configurado
        if (creds.clientId && creds.clientSecret) {
          await checkIgdbConnection();
        }
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, []);

  // Atualizar status quando a tela for focada
  useFocusEffect(
    useCallback(() => {
      if (igdbConfigured) {
        checkIgdbConnection();
      }
    }, [igdbConfigured])
  );

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title
          title="APIs opcionais"
          subtitle="Configure apenas as que quiser usar"
        />
        <Card.Content>
          <Text style={styles.infoText}>
            As integrações são opcionais. Você pode configurar uma ou várias APIs conforme a necessidade.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title
          title="IGDB"
          subtitle="Banco de dados de jogos"
          left={() => (
            <View style={styles.iconWrapper}>
              <Gamepad2 color={theme.colors.onSurface} size={24} />
            </View>
          )}
        />
        <Card.Content>
          <Text style={styles.description}>
            Configure o acesso à IGDB para buscar informações de jogos, plataformas e mídias.
          </Text>

          <View style={styles.chipsRow}>
            <Chip mode="outlined" style={styles.chip}>
              Opcional
            </Chip>
            {loading ? (
              <ActivityIndicator size="small" />
            ) : (
              <>
                <Chip
                  icon={igdbConfigured ? 'check' : 'alert'}
                  selectedColor={igdbConfigured ? '#16a34a' : theme.colors.onSurface}
                  style={styles.chip}
                >
                  {igdbConfigured ? 'Credenciais salvas' : 'Não configurada'}
                </Chip>
                <Chip
                  icon={igdbTokenValid ? 'check' : 'clock-alert'}
                  selectedColor={igdbTokenValid ? '#16a34a' : theme.colors.onSurface}
                  style={styles.chip}
                >
                  {igdbTokenValid ? 'Token ativo' : 'Token ausente/expirado'}
                </Chip>
                {igdbConfigured && (
                  <Chip
                    icon={() => 
                      igdbConnectionStatus.checking ? (
                        <RefreshCw size={16} color={theme.colors.onSurface} />
                      ) : igdbConnectionStatus.connected ? (
                        <Wifi size={16} color="#22c55e" />
                      ) : (
                        <WifiOff size={16} color="#ef4444" />
                      )
                    }
                    selectedColor={igdbConnectionStatus.connected ? '#22c55e' : '#ef4444'}
                    style={styles.chip}
                    onPress={checkIgdbConnection}
                  >
                    {igdbConnectionStatus.checking
                      ? 'Verificando...'
                      : igdbConnectionStatus.connected
                      ? 'Conectado'
                      : 'Desconectado'}
                  </Chip>
                )}
              </>
            )}
          </View>

          {igdbConfigured && igdbConnectionStatus.message && (
            <View style={styles.statusMessageContainer}>
              <Text
                style={[
                  styles.statusMessage,
                  {
                    color: igdbConnectionStatus.connected
                      ? '#22c55e'
                      : '#ef4444',
                  },
                ]}
              >
                {igdbConnectionStatus.message}
              </Text>
            </View>
          )}

          <Button
            mode="contained"
            style={styles.button}
            onPress={() => navigation.navigate('ApiConfig')}
          >
            Configurar IGDB
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  card: {
    margin: 16,
    elevation: 3,
  },
  infoText: {
    lineHeight: 20,
  },
  description: {
    marginBottom: 12,
    lineHeight: 20,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    marginRight: 4,
    marginTop: 4,
  },
  button: {
    marginTop: 4,
  },
  statusMessageContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
  },
  statusMessage: {
    fontSize: 12,
    textAlign: 'center',
  },
  spacer: {
    height: 32,
  },
});

export default ApisConfigScreen;

