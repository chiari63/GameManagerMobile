import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { Gamepad, Disc3, Gamepad2, Heart, Home } from 'lucide-react-native';
import { useTheme } from 'react-native-paper';
import { 
  MainTabParamList, 
  RootStackParamList, 
  ConsolesStackParamList, 
  AccessoriesStackParamList, 
  GamesStackParamList 
} from './types';

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
  ApiConfigScreen,
} from '../screens';

// Tema de navegação
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f5f5f5',
    card: '#ffffff',
    text: '#333333',
    border: '#e0e0e0',
    primary: '#6200ee',
  },
};

// Criação das pilhas de navegação
const MainTab = createBottomTabNavigator<MainTabParamList>();
const ConsolesStack = createNativeStackNavigator<ConsolesStackParamList>();
const AccessoriesStack = createNativeStackNavigator<AccessoriesStackParamList>();
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
      }}
    >
      <ConsolesStack.Screen 
        name="ConsolesList" 
        component={ConsolesScreen}
        options={{
          title: 'Consoles',
          headerTitleStyle: {
            fontSize: 22,
            fontWeight: 'bold',
          },
        }}
      />
      <ConsolesStack.Screen
        name="ConsoleDetails"
        component={ConsoleDetailsScreen}
        options={{
          title: 'Detalhes do Console',
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
          },
        }}
      />
    </ConsolesStack.Navigator>
  );
};

// Navegador da pilha de acessórios
const AccessoriesNavigator = () => {
  const theme = useTheme();
  
  return (
    <AccessoriesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
      }}
    >
      <AccessoriesStack.Screen 
        name="AccessoriesList" 
        component={AccessoriesScreen}
        options={{
          title: 'Acessórios',
          headerTitleStyle: {
            fontSize: 22,
            fontWeight: 'bold',
          },
        }}
      />
      <AccessoriesStack.Screen
        name="AccessoryDetails"
        component={AccessoryDetailsScreen}
        options={{
          title: 'Detalhes do Acessório',
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
          },
        }}
      />
    </AccessoriesStack.Navigator>
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
      }}
    >
      <GamesStack.Screen 
        name="GamesList" 
        component={GamesScreen}
        options={{
          title: 'Jogos',
          headerTitleStyle: {
            fontSize: 22,
            fontWeight: 'bold',
          },
        }}
      />
      <GamesStack.Screen
        name="GameDetails"
        component={GameDetailsScreen}
        options={{
          title: 'Detalhes do Jogo',
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
          },
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
          borderTopColor: theme.colors.outline
        },
      }}
    >
      <MainTab.Screen 
        name="ConsolesStack" 
        component={ConsolesNavigator}
        options={{
          title: 'Consoles',
          tabBarIcon: ({ color, size }) => <Gamepad color={color} size={size} />,
        }}
      />
      <MainTab.Screen 
        name="AccessoriesStack" 
        component={AccessoriesNavigator}
        options={{
          title: 'Acessórios',
          tabBarIcon: ({ color, size }) => <Gamepad2 color={color} size={size} />,
        }}
      />
      <MainTab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          title: 'Game Manager',
          headerTitle: 'Game Manager',
          headerShown: true,
          headerStyle: { 
            backgroundColor: theme.colors.surface,
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
          title: 'Lista de Desejos',
          tabBarIcon: ({ color, size }) => <Heart color={color === theme.colors.primary ? '#ff5757' : color} size={size} />,
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ 
              color: focused ? '#ff5757' : color, 
              fontSize: 10,
              marginBottom: 2
            }}>
              Lista de Desejos
            </Text>
          ),
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.surface },
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
  
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="GameDetails" component={GameDetailsScreen} options={{ title: 'Detalhes do Jogo' }} />
        <Stack.Screen name="ConsoleDetails" component={ConsoleDetailsScreen} options={{ title: 'Detalhes do Console' }} />
        <Stack.Screen name="AccessoryDetails" component={AccessoryDetailsScreen} options={{ title: 'Detalhes do Acessório' }} />
        <Stack.Screen name="Maintenance" component={MaintenanceScreen} options={{ title: 'Manutenções' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notificações' }} />
        <Stack.Screen name="IGDBSearch" component={IGDBSearchScreen} options={{ title: 'Buscar na IGDB' }} />
        <Stack.Screen name="ApiConfig" component={ApiConfigScreen} options={{ title: 'Configurar API' }} />
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