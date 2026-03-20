import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme } from '../theme/ThemeContext';
import { ThemeText } from '../components/ThemeText';
import { Ionicons } from '@expo/vector-icons';
import { getStats } from '../utils/stats';
import { getDeviceSyncCode, pushLocalDataToCloud, pullCloudDataToLocal, setDeviceSyncCode } from '../utils/sync';
import { useSync } from '../context/SyncContext';

export const StatsScreen = () => {
  const { colors } = useTheme();
  const { syncCode, isSyncActive, toggleSync, setSyncCode, isPro } = useSync();
  const [localStats, setLocalStats] = useState({ focusMinutes: 0, treatments: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [inputCode, setInputCode] = useState('');

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

  const handleToggleSync = async (value: boolean) => {
    if (!isPro && value) {
      Alert.alert("Pro Required", "Cloud Sync is a Pro feature. Please upgrade to enable it.");
      return;
    }
    
    if (value) {
      await toggleSync(true);
      Alert.alert("Sync Enabled", "Your data will now be synced to the cloud. Local data will be migrated automatically.");
    } else {
      Alert.alert('Disable Sync?', 'Your data will remain offline only. You can re-enable sync at any time.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: () => toggleSync(false) },
      ]);
    }
  };

  const handlePull = async () => {
    if (!inputCode || inputCode.replace('-', '').length < 8) return Alert.alert("Invalid Code", "Please enter a valid sync code.");
    setRefreshing(true);
    // Setting the sync code will trigger the useSync init or we can call it manually
    await setSyncCode(inputCode.toUpperCase());
    setRefreshing(false);
    setInputCode('');
    Alert.alert("Code Set", "Your device is now linked to code " + inputCode.toUpperCase());
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        <ThemeText variant="h1" style={styles.headerTitle}>Your Progress</ThemeText>
        
        <View style={[styles.statCard, { backgroundColor: colors.surface0, shadowColor: colors.crust }]}>
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
              Your offline progress is safely stored right here on your device. Complete more Pomodoro sessions and daily routines to watch these numbers climb!
            </ThemeText>
        </View>

        <View style={[styles.syncCard, { backgroundColor: colors.surface0, shadowColor: colors.crust }]}>
          {/* Header with toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="cloud" size={28} color={isSyncActive ? colors.sky : colors.subtext0} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <ThemeText variant="h2" colorKey="text">Real-Time Cloud Sync</ThemeText>
              <ThemeText variant="caption" colorKey={isSyncActive ? 'sky' : 'subtext0'}>
                {isSyncActive ? '● Live – syncing across devices' : '○ Offline only'}
              </ThemeText>
            </View>
            <Switch
              value={isSyncActive}
              onValueChange={handleToggleSync}
              trackColor={{ false: colors.surface2, true: colors.sky }}
              thumbColor={isSyncActive ? colors.base : colors.subtext0}
            />
          </View>

          <ThemeText variant="body" colorKey="subtext0" style={{ marginBottom: 16, lineHeight: 22 }}>
            No account required. Your sync code is your private key — anyone who knows it can share your data.
          </ThemeText>

          <View style={[styles.codeBox, { backgroundColor: colors.surface1 }]}>
            <ThemeText variant="caption" colorKey="subtext0">YOUR SYNC CODE</ThemeText>
            <ThemeText variant="h1" colorKey="sky" style={{ letterSpacing: 4, marginVertical: 8 }}>{syncCode}</ThemeText>
            <View style={{ padding: 12, backgroundColor: colors.surface0, borderRadius: 12, width: '100%', alignItems: 'center' }}>
               <ThemeText variant="caption" colorKey="subtext0">
                 {isSyncActive ? "Your data is automatically backed up." : "Enable sync to back up your data."}
               </ThemeText>
            </View>
          </View>

          <View style={[styles.pullBox, { borderColor: colors.surface1 }]}>
            <ThemeText variant="caption" colorKey="subtext0" style={{ marginBottom: 8 }}>LINK / RESTORE FROM ANOTHER DEVICE</ThemeText>
            <View style={{ flexDirection: 'row' }}>
              <TextInput
                style={[styles.syncInput, { backgroundColor: colors.surface1, color: colors.text }]}
                placeholder="e.g. A7B9-X2M4"
                placeholderTextColor={colors.subtext0}
                value={inputCode}
                onChangeText={setInputCode}
                autoCapitalize="characters"
                maxLength={9}
              />
              <TouchableOpacity style={[styles.pullBtn, { backgroundColor: colors.text }]} onPress={handlePull}>
                <ThemeText variant="body" colorKey="base" style={{ fontWeight: 'bold' }}>Link</ThemeText>
              </TouchableOpacity>
            </View>
          </View>
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
  headerTitle: {
    marginBottom: 32,
    marginTop: 16,
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
  },
  syncCard: {
    marginTop: 24,
    padding: 24,
    borderRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  codeBox: {
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  syncBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 100,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  pullBox: {
    borderTopWidth: 2,
    paddingTop: 20,
  },
  syncInput: {
    flex: 1,
    padding: 16,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  pullBtn: {
    paddingHorizontal: 24,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
