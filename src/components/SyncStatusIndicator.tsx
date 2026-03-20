import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSync } from '../context/SyncContext';
import { useTheme } from '../theme/ThemeContext';
import { ThemeText } from './ThemeText';
import { Ionicons } from '@expo/vector-icons';
import { useConvex } from "convex/react";

export const SyncStatusIndicator = () => {
  const { isSyncActive, isPro } = useSync();
  const { colors } = useTheme();
  const convex = useConvex();
  
  // We can't easily check 'online' status directly from convex hook without extra work, 
  // but we can assume if sync is inactive it's offline-mode.
  
  if (!isPro) return null;

  return (
    <View style={styles.container}>
      {isSyncActive ? (
        <View style={styles.row}>
          <Ionicons name="cloud-done-outline" size={14} color={colors.green} />
          <ThemeText variant="caption" colorKey="green" style={styles.text}>Synced</ThemeText>
        </View>
      ) : (
        <View style={styles.row}>
          <Ionicons name="cloud-offline-outline" size={14} color={colors.subtext0} />
          <ThemeText variant="caption" colorKey="subtext0" style={styles.text}>Local Only</ThemeText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '600',
  }
});
