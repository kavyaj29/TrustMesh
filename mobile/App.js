import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Import screens
import HomeScreen from './screens/HomeScreen';
import AddSMSScreen from './screens/AddSMSScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import LedgersScreen from './screens/LedgersScreen';
import LedgerDetailScreen from './screens/LedgerDetailScreen';
import AddManualScreen from './screens/AddManualScreen';
import LinkTransactionsScreen from './screens/LinkTransactionsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import BudgetScreen from './screens/BudgetScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Simple icon component
const TabIcon = ({ name, focused, colors }) => {
  const icons = {
    Home: '🏠',
    Ledgers: '📒',
    Add: '➕',
    Budgets: '💰',
    Transactions: '📋',
  };

  return (
    <View style={[styles.iconContainer, focused && { backgroundColor: `${colors.accent}33` }]}>
      <Text style={styles.icon}>{icons[name]}</Text>
    </View>
  );
};

// Tab Navigator with Theme
function TabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBorder,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} colors={colors} />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Ledgers"
        component={LedgersScreen}
        options={{ tabBarLabel: 'Ledgers' }}
      />
      <Tab.Screen
        name="Add"
        component={AddSMSScreen}
        options={{ tabBarLabel: 'Add SMS' }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ tabBarLabel: 'History' }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetScreen}
        options={{ tabBarLabel: 'Budgets' }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { colors } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(null); // null = loading

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const seen = await AsyncStorage.getItem('hasSeenOnboarding');
      setShowOnboarding(seen !== 'true');
    } catch {
      setShowOnboarding(false);
    }
  };

  const handleOnboardingFinish = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch { }
    setShowOnboarding(false);
  };

  if (showOnboarding === null) return null; // Loading

  if (showOnboarding) {
    return <OnboardingScreen onFinish={handleOnboardingFinish} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style={colors.statusBar} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="LedgerDetail" component={LedgerDetailScreen} />
        <Stack.Screen name="AddManual" component={AddManualScreen} />
        <Stack.Screen name="LinkTransactions" component={LinkTransactionsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
});
