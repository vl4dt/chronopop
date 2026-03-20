import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SyncProvider } from './src/context/SyncContext';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

const AppContent = () => {
  const { isDark } = useTheme();
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
        <ThemeProvider>
          <SyncProvider>
            <AppContent />
          </SyncProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ConvexProvider>
  );
}
