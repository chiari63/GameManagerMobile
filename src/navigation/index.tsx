import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { Gamepad, Disc3, Heart, Home } from 'lucide-react-native';
import { useTheme } from 'react-native-paper';
import {
  MainTabParamList,
  RootStackParamList,
  ConsolesStackParamList,
  GamesStackParamList
} from './types';
import { darkTheme } from '../theme';

// Importação das telas do arquivo de barril
import {
  HomeScreen,
  GamesScreen,
  ConsolesScreen,
  AccessoriesScreen,
  WishlistScreen,
  ConsoleDetailsScreen,
  AccessoryDetailsScreen,
  GameDetailsScreen,
  MaintenanceScreen,
  NotificationsScreen,
  IGDBSearchScreen,
  ApisConfigScreen,
  ApiConfigScreen,
  OnboardingScreen,
} from '../screens';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator } from 'react-native-paper';

// Tema de navegação integrado com o tema global
const navigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: darkTheme.colors.primary,
    background: darkTheme.colors.background,
    card: darkTheme.colors.surface,
    text: darkTheme.colors.onSurface,
    border: darkTheme.colors.outline,
    notification: darkTheme.colors.error,
  },
};

// Criação das pilhas de navegação
const MainTab = createBottomTabNavigator<MainTabParamList>();
const ConsolesStack = createNativeStackNavigator<ConsolesStackParamList>();
const GamesStack = createNativeStackNavigator<GamesStackParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Navegador da pilha de consoles
const ConsolesNavigator = () => {
  const theme = useTheme();

  return (
    <ConsolesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <ConsolesStack.Screen
        name="ConsolesList"
        component={ConsolesScreen}
        options={{
          title: 'Consoles',
        }}
      />
      <ConsolesStack.Screen
        name="ConsoleDetails"
        component={ConsoleDetailsScreen}
        options={{
          title: 'Detalhes',
        }}
      />
    </ConsolesStack.Navigator>
  );
};

// Navegador da pilha de jogos
const GamesNavigator = () => {
  const theme = useTheme();

  return (
    <GamesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <GamesStack.Screen
        name="GamesList"
        component={GamesScreen}
        options={{
          title: 'Jogos',
        }}
      />
      <GamesStack.Screen
        name="GameDetails"
        component={GameDetailsScreen}
        options={{
          title: 'Detalhes',
        }}
      />
    </GamesStack.Navigator>
  );
};

// Navegação principal
const MainTabNavigator = () => {
  const theme = useTheme();

  return (
    <MainTab.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <MainTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Início',
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.background, // Match background for clean look
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: theme.colors.onSurface,
          headerTitleStyle: {
            fontSize: 22,
            fontWeight: 'bold',
          },
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <MainTab.Screen
        name="ConsolesStack"
        component={ConsolesNavigator}
        options={{
          title: 'Consoles',
          tabBarIcon: ({ color, size }) => <Gamepad color={color} size={size} />,
        }}
      />
      <MainTab.Screen
        name="GamesStack"
        component={GamesNavigator}
        options={{
          title: 'Jogos',
          tabBarIcon: ({ color, size }) => <Disc3 color={color} size={size} />,
        }}
      />
      <MainTab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          title: 'Desejos',
          tabBarIcon: ({ color, size }) => <Heart color={color === theme.colors.primary ? '#ff5757' : color} size={size} />,
          tabBarLabel: ({ color, focused }) => (
            <Text style={{
              color: focused ? '#ff5757' : color,
              fontSize: 10,
              marginBottom: 2,
              fontWeight: '500'
            }}>
              Desejos
            </Text>
          ),
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.surface,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: theme.colors.onSurface,
          headerTitleStyle: {
            fontSize: 22,
            fontWeight: 'bold',
          },
        }}
      />
    </MainTab.Navigator>
  );
};

// Navegador raiz que contém todas as telas
const AppNavigator = () => {
  const theme = useTheme();
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
          headerShadowVisible: false, // Clean look
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: theme.colors.background,
          }
        }}
      >
        {!currentUser.hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
            <Stack.Screen name="GameDetails" component={GameDetailsScreen} options={{ title: 'Detalhes do Jogo' }} />
            <Stack.Screen name="ConsoleDetails" component={ConsoleDetailsScreen} options={{ title: 'Detalhes do Console' }} />
            <Stack.Screen name="AccessoryDetails" component={AccessoryDetailsScreen} options={{ title: 'Detalhes do Acessório' }} />
            <Stack.Screen name="Accessories" component={AccessoriesScreen} options={{ title: 'Meus Acessórios' }} />
            <Stack.Screen name="Maintenance" component={MaintenanceScreen} options={{ title: 'Manutenções' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notificações' }} />
            <Stack.Screen name="IGDBSearch" component={IGDBSearchScreen} options={{ title: 'Buscar na IGDB' }} />
            <Stack.Screen name="ApisConfig" component={ApisConfigScreen} options={{ title: 'Configurar APIs' }} />
            <Stack.Screen name="ApiConfig" component={ApiConfigScreen} options={{ title: 'API IGDB', headerTitle: 'Configuração IGDB' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Componente principal de navegação
export const Navigation = () => {
  return (
    <AppNavigator />
  );
}; 