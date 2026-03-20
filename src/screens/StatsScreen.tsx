import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme } from '../theme/ThemeContext';
import { ThemeText } from '../components/ThemeText';
import { Ionicons } from '@expo/vector-icons';
import { getStats } from '../utils/stats';
import { useSync } from '../context/SyncContext';

export const StatsScreen = () => {
  const { colors } = useTheme();
  const { syncCode, isSyncActive } = useSync();
  const [localStats, setLocalStats] = useState({ focusMinutes: 0, treatments: 0 });
  const [refreshing, setRefreshing] = useState(false);

  // Real-time Convex stats subscription (when premium sync is on)
  const convexStats = useQuery(
    api.db.getGlobalStats,
    syncCode && isSyncActive ? { deviceId: syncCode } : 'skip'
  );

  const loadLocalStats = async () => {
    const data = await getStats();
    setLocalStats(data);
  };

  useFocusEffect(useCallback(() => { loadLocalStats(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocalStats();
    setRefreshing(false);
  };

  const stats = isSyncActive && convexStats
    ? { focusMinutes: convexStats.totalFocusMinutes, treatments: convexStats.treatmentsCompleted }
    : localStats;

  const hours = Math.floor(stats.focusMinutes / 60);
  const minutes = stats.focusMinutes % 60;

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        <View style={[styles.statCard, { backgroundColor: colors.surface0, shadowColor: colors.crust, marginTop: 16 }]}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(235, 160, 172, 0.2)' }]}>
            <Ionicons name="timer" size={32} color={colors.maroon} />
          </View>
          <View style={styles.statInfo}>
            <ThemeText variant="body" colorKey="subtext0">Total Focus Time</ThemeText>
            <ThemeText variant="h1" colorKey="maroon">
              {hours > 0 ? `${hours}h ` : ''}{minutes}m
            </ThemeText>
          </View>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface0, shadowColor: colors.crust }]}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(166, 227, 161, 0.2)' }]}>
            <Ionicons name="checkbox-outline" size={32} color={colors.green} />
          </View>
          <View style={styles.statInfo}>
            <ThemeText variant="body" colorKey="subtext0">Routines</ThemeText>
            <ThemeText variant="h1" colorKey="green">
              {stats.treatments} routines completed
            </ThemeText>
          </View>
        </View>

        <View style={[styles.rewardCard, { backgroundColor: colors.surface1, shadowColor: colors.crust }]}>
            <Ionicons name="trophy-outline" size={48} color={colors.yellow} style={{ marginBottom: 16 }} />
            <ThemeText variant="h2" colorKey="text" style={{ textAlign: 'center', marginBottom: 8 }}>Keep up the great work!</ThemeText>
            <ThemeText variant="body" colorKey="subtext0" style={{ textAlign: 'center' }}>
              Your progress is safely stored and synced across your devices. Keep focusing to watch these numbers climb!
            </ThemeText>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  statInfo: {
    flex: 1,
  },
  rewardCard: {
    marginTop: 32,
    padding: 32,
    borderRadius: 32,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  }
});
