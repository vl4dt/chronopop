import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WorldClockScreen } from '../screens/WorldClockScreen';
import { RemindersScreen } from '../screens/RemindersScreen';
import { AlarmsScreen } from '../screens/AlarmsScreen';
import { StopwatchScreen } from '../screens/StopwatchScreen';
import { TimersScreen } from '../screens/TimersScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const AccountStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ 
      headerStyle: { backgroundColor: colors.mantle },
      headerTintColor: colors.text,
      animation: 'slide_from_right'
    }}>
      <Stack.Screen 
        name="Stats" 
        component={StatsScreen} 
        options={({ navigation }) => ({ 
          title: 'Your Progress',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => navigation.navigate('Settings')}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          )
        })} 
      />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
};

export const RootNavigator = () => {
  const { colors, isDark } = useTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.mauve,
      background: colors.base,
      card: colors.mantle,
      text: colors.text,
      border: colors.crust,
      notification: colors.red,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: colors.mantle },
          headerTintColor: colors.text,
          tabBarStyle: { backgroundColor: colors.mantle, borderTopColor: colors.crust },
          tabBarActiveTintColor: colors.mauve,
          tabBarInactiveTintColor: colors.overlay0,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'globe-outline';

            if (route.name === 'World Clock') {
              iconName = focused ? 'globe' : 'globe-outline';
            } else if (route.name === 'Routines') {
              iconName = focused ? 'medical' : 'medical-outline'; // This will be overridden by specific options
            } else if (route.name === 'Alarms') {
              iconName = focused ? 'alarm' : 'alarm-outline';
            } else if (route.name === 'Stopwatch') {
              iconName = focused ? 'stopwatch' : 'stopwatch-outline';
            } else if (route.name === 'Timers') {
              iconName = focused ? 'timer' : 'timer-outline';
            } else if (route.name === 'Account') {
              iconName = focused ? 'person' : 'person-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="World Clock" component={WorldClockScreen} />
        <Tab.Screen
          name="Routines"
          component={RemindersScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />
          }}
        />
        <Tab.Screen
          name="Account"
          component={AccountStack}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />
          }}
        />
        <Tab.Screen name="Alarms" component={AlarmsScreen} />
        <Tab.Screen name="Stopwatch" component={StopwatchScreen} />
        <Tab.Screen name="Timers" component={TimersScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
