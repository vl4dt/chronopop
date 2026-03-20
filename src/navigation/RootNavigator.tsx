import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

import { WorldClockScreen } from '../screens/WorldClockScreen';
import { RemindersScreen } from '../screens/RemindersScreen';
import { AlarmsScreen } from '../screens/AlarmsScreen';
import { StopwatchScreen } from '../screens/StopwatchScreen';
import { TimersScreen } from '../screens/TimersScreen';

const Tab = createBottomTabNavigator();

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
              iconName = focused ? 'medical' : 'medical-outline';
            } else if (route.name === 'Alarms') {
              iconName = focused ? 'alarm' : 'alarm-outline';
            } else if (route.name === 'Stopwatch') {
              iconName = focused ? 'stopwatch' : 'stopwatch-outline';
            } else if (route.name === 'Timers') {
              iconName = focused ? 'timer' : 'timer-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="World Clock" component={WorldClockScreen} />
        <Tab.Screen name="Routines" component={RemindersScreen} />
        <Tab.Screen name="Alarms" component={AlarmsScreen} />
        <Tab.Screen name="Stopwatch" component={StopwatchScreen} />
        <Tab.Screen name="Timers" component={TimersScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
