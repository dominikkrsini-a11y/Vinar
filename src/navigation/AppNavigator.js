import { useEffect, useState, useContext } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { onAuthChange } from '../firebase/auth';
import { getUserProfile } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';

import LoginScreen       from '../screens/LoginScreen';
import DashboardScreen   from '../screens/DashboardScreen';
import AddWineScreen     from '../screens/AddWineScreen';
import EditWineScreen    from '../screens/EditWineScreen';
import WineDetailScreen  from '../screens/WineDetailScreen';
import AddEntryScreen    from '../screens/AddEntryScreen';
import ReferenceScreen   from '../screens/ReferenceScreen';
import CalculatorScreen  from '../screens/CalculatorScreen';
import AssistantScreen   from '../screens/AssistantScreen';
import ProfileScreen     from '../screens/ProfileScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import LanguageSelectScreen from '../screens/LanguageSelectScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ name, color }) {
  const icons = {
    Dashboard: '🍷', Calculator: '🧪',
    Marketplace: '🛒', Assistant: '💬', Profile: '👤',
  };
  return <Text style={{ fontSize: 20, color }}>{icons[name]}</Text>;
}

function MainTabs() {
  const { language } = useContext(LanguageContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor:   colors.gold,
        tabBarInactiveTintColor: colors.iconInactive,
        tabBarLabelStyle: { fontSize: 11, marginBottom: 4 },
      }}
    >
      <Tab.Screen name="Dashboard"   component={DashboardScreen}
        options={{
          tabBarLabel: language === 'hr' ? 'Naslovna' : 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon name="Dashboard" color={color} />,
        }} />
      <Tab.Screen name="Calculator"  component={CalculatorScreen}
        options={{
          tabBarLabel: language === 'hr' ? 'Kalkulator' : 'Calculator',
          tabBarIcon: ({ color }) => <TabIcon name="Calculator" color={color} />,
        }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen}
        options={{
          tabBarLabel: language === 'hr' ? 'Tržnica' : 'Marketplace',
          tabBarIcon: ({ color }) => <TabIcon name="Marketplace" color={color} />,
        }} />
      <Tab.Screen name="Assistant"   component={AssistantScreen}
        options={{
          tabBarLabel: language === 'hr' ? 'Asistent' : 'Assistant',
          tabBarIcon: ({ color }) => <TabIcon name="Assistant" color={color} />,
        }} />
      <Tab.Screen name="Profile"     component={ProfileScreen}
        options={{
          tabBarLabel: language === 'hr' ? 'Profil' : 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="Profile" color={color} />,
        }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [user,         setUser]         = useState(undefined);
  const [needsLang,    setNeedsLang]    = useState(false);
  const [checkingLang, setCheckingLang] = useState(false);
  const { language, setLanguage }       = useContext(LanguageContext);

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setUser(u);
      if (!u) {
        setCheckingLang(false);
        setNeedsLang(false);
        return;
      }
      setCheckingLang(true);
      try {
        const profile = await getUserProfile(u.uid);
        if (profile?.language) {
          setLanguage(profile.language);
          setNeedsLang(false);
        } else {
          setNeedsLang(true);
        }
      } catch (e) {
        setNeedsLang(true);
      } finally {
        setCheckingLang(false);
      }
    });
    return unsub;
  }, []);

  if (user === undefined || checkingLang) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background,
        alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  // Language not set yet — show language selection
  if (user && needsLang) {
    return (
      <LanguageSelectScreen onLanguageSelected={(lang) => {
        setLanguage(lang);
        setNeedsLang(false);
      }} />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main"       component={MainTabs} />
            <Stack.Screen name="AddWine"    component={AddWineScreen} />
            <Stack.Screen name="WineDetail" component={WineDetailScreen} />
            <Stack.Screen name="AddEntry"   component={AddEntryScreen} />
            <Stack.Screen name="EditWine"   component={EditWineScreen} />
            <Stack.Screen name="Reference"  component={ReferenceScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
