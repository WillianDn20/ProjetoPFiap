import { useContext, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthContext, AuthProvider } from './src/context/AuthContext';
import AdminScreen from './src/screens/AdminScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import NoticesScreen from './src/screens/NoticesScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import PostFormScreen from './src/screens/PostFormScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';
import UserFormScreen from './src/screens/UserFormScreen';

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function PageMenu({ isTeacher, user, activeRoute, navigation }) {
  const [visible, setVisible] = useState(false);
  const pages = [
    { name: 'Postagens', route: 'Home' },
    { name: 'Calendário', route: 'Calendar' },
    { name: 'Avisos', route: 'Notices' },
    ...(isTeacher
      ? [
          { name: 'Administração', route: 'Admin' },
          { name: 'Usuários', route: 'UserManagement' },
        ]
      : []),
  ];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir menu de páginas"
        onPress={() => setVisible(true)}
        style={styles.menuButton}
      >
        <Text style={styles.menuIcon}>☰</Text>
      </Pressable>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.menuPanel} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.menuHeading}>Páginas</Text>
            {isTeacher && user?.name && (
              <Text style={styles.menuGreeting}>Olá, {user.name}</Text>
            )}
            {pages.map((page) => (
              <Pressable
                key={page.route}
                accessibilityRole="button"
                onPress={() => {
                  setVisible(false);
                  navigation.navigate(page.route);
                }}
                accessibilityState={{ selected: activeRoute === page.route }}
                style={[
                  styles.menuItem,
                  activeRoute === page.route && styles.menuItemActive,
                ]}
              >
                <Text style={[
                  styles.menuItemText,
                  activeRoute === page.route && styles.menuItemTextActive,
                ]}>
                  {page.name}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function AccountAction({ navigation }) {
  const { isTeacher, signOut, user } = useContext(AuthContext);

  const handlePress = async () => {
    if (isTeacher) {
      await signOut();
      const rootNavigation = navigation.getParent?.();
      if (rootNavigation) rootNavigation.navigate('Main');
      else navigation.navigate('Main');
      return;
    }

    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('Login');
      return;
    }
    navigation.navigate('Login');
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isTeacher ? `Sair da conta de ${user?.name || 'professor'}` : 'Login'}
      onPress={handlePress}
      style={styles.accountButton}
    >
      <Text style={styles.accountText} numberOfLines={1}>
        {isTeacher ? 'Sair' : 'Login'}
      </Text>
    </Pressable>
  );
}

function MainTabs() {
  const { isTeacher, user } = useContext(AuthContext);

  return (
    <Tabs.Navigator
      screenOptions={({ navigation, route }) => ({
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#0f172a',
        headerLeft: () => (
          <PageMenu
            isTeacher={isTeacher}
            user={user}
            activeRoute={route.name}
            navigation={navigation}
          />
        ),
        headerLeftContainerStyle: { paddingLeft: 12 },
        headerRight: () => <AccountAction navigation={navigation} />,
        headerRightContainerStyle: { paddingRight: 12 },
        tabBarStyle: { display: 'none' },
        tabBarActiveTintColor: '#2563eb',
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: 'Postagens' }} />
      <Tabs.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendário' }} />
      <Tabs.Screen name="Notices" component={NoticesScreen} options={{ title: 'Avisos' }} />
      {isTeacher && (
        <>
          <Tabs.Screen name="Admin" component={AdminScreen} options={{ title: 'Administração' }} />
          <Tabs.Screen name="UserManagement" component={UserManagementScreen} options={{ title: 'Gerenciar usuários' }} />
        </>
      )}
    </Tabs.Navigator>
  );
}

function AppNavigator() {
  const { ready, isTeacher } = useContext(AuthContext);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerBackTitle: 'Voltar' }}>
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Postagem' }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Acesso do professor' }} />
        {isTeacher && (
          <Stack.Screen
            name="UserForm"
            component={UserFormScreen}
            options={{ title: 'Cadastro' }}
          />
        )}
        {isTeacher && (
          <Stack.Screen name="PostForm" component={PostFormScreen} options={{ title: 'Publicação' }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  menuButton: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountButton: {
    maxWidth: 140,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  accountText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  menuIcon: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '700',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  menuPanel: {
    position: 'absolute',
    top: 56,
    left: 12,
    width: 260,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  menuHeading: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuGreeting: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  menuItem: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  menuItemActive: {
    backgroundColor: '#dbeafe',
  },
  menuItemText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  menuItemTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
});
