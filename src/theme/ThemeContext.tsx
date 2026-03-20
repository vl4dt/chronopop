import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { palettes, FlavorName, ThemeColors } from './colors';

import { useSync } from '../context/SyncContext';

interface ThemeContextType {
  flavor: FlavorName;
  colors: ThemeColors;
  setFlavor: (flavor: FlavorName) => Promise<boolean>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@chronopop_theme_flavor';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const { isPro } = useSync();
  const [flavor, setFlavorState] = useState<FlavorName>(
    systemColorScheme === 'dark' ? 'mocha' : 'latte'
  );

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedFlavor = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedFlavor && palettes[storedFlavor as FlavorName]) {
          // If NOT pro and stored flavor is NOT latte, force latte
          if (!isPro && storedFlavor !== 'latte') {
            setFlavorState('latte');
          } else {
            setFlavorState(storedFlavor as FlavorName);
          }
        }
      } catch (e) {
        console.error('Failed to load theme', e);
      }
    };
    loadTheme();
  }, [isPro]);

  const setFlavor = async (newFlavor: FlavorName) => {
    if (!isPro && newFlavor !== 'latte') {
      return false; // Not upgraded
    }
    setFlavorState(newFlavor);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newFlavor);
      return true;
    } catch (e) {
      console.error('Failed to save theme', e);
      return false;
    }
  };

  const colors = palettes[flavor];
  const isDark = flavor !== 'latte';

  return (
    <ThemeContext.Provider value={{ flavor, colors, setFlavor, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
