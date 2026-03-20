import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SyncProvider } from './src/context/SyncContext';
import { configureNotifications, setupAndroidChannel, requestNotificationPermissions } from './src/utils/NotificationService';
import { useAlarmNotificationSync } from './src/hooks/useAlarmNotificationSync';
import { useDataMigration } from './src/hooks/useDataMigration';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

const AppContent = () => {
  const { isDark } = useTheme();
  useAlarmNotificationSync();
  useDataMigration();

  useEffect(() => {
    const setup = async () => {
      try {
        configureNotifications();
        await setupAndroidChannel();
        await requestNotificationPermissions();
      } catch (err) {
        console.warn('App notification setup issue:', err);
      }
    };
    setup();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
};

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SyncProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </SyncProvider>
      </GestureHandlerRootView>
    </ConvexProvider>
  );
}
