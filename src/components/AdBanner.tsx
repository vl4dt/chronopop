import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeText } from './ThemeText';
import { Ionicons } from '@expo/vector-icons';
import { useSync } from '../context/SyncContext';

interface AdBannerProps {
  onPress: () => void;
}

export const AdBanner = ({ onPress }: AdBannerProps) => {
  const { colors } = useTheme();
  const { isPro } = useSync();

  if (isPro) return null;

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      style={[styles.container, { backgroundColor: colors.surface0, borderColor: colors.surface1 }]}
      onPress={onPress}
    >
      <View style={[styles.badge, { backgroundColor: colors.mauve }]}>
        <ThemeText variant="caption" colorKey="base" style={{ fontWeight: 'bold' }}>PRO</ThemeText>
      </View>
      <View style={styles.content}>
        <ThemeText variant="body" style={{ fontWeight: 'bold' }}>Upgrade to Chronopop Pro</ThemeText>
        <ThemeText variant="caption" colorKey="subtext0">Remove ads and unlock unlimited features!</ThemeText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.subtext0} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  content: {
    flex: 1,
  }
});
