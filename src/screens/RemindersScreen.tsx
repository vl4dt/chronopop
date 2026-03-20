import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { ThemeText } from '../components/ThemeText';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { logStat } from '../utils/stats';
import { updateRoutinesWidget } from '../utils/WidgetService';
import { useSync } from '../context/SyncContext';

export type Profile = {
  id: string;
  name: string;
  type: 'Person' | 'Pet';
  colorKey: keyof ThemeColors;
};

export type TreatmentReminder = {
  id: string;
  profileId: string;
  title: string;
  timeHour: number;
  timeMinute: number;
  durationMinutes?: number;
  completedToday: boolean;
};

const defaultProfiles: Profile[] = [
  { id: 'p1', name: 'Me', type: 'Person', colorKey: 'sapphire' },
  { id: 'p2', name: 'Luna (Cat)', type: 'Pet', colorKey: 'rosewater' },
];

const defaultReminders: TreatmentReminder[] = [
  { id: 'r1', profileId: 'p1', title: 'Stretch / Yoga', timeHour: 8, timeMinute: 0, durationMinutes: 15, completedToday: false },
  { id: 'r2', profileId: 'p2', title: 'Heartworm Pill', timeHour: 10, timeMinute: 0, completedToday: true },
  { id: 'r3', profileId: 'p2', title: 'Nebulizer Therapy', timeHour: 18, timeMinute: 30, durationMinutes: 10, completedToday: false },
];

// -----------------------------------------------------------------------
// Helper: map Convex record (with _id) to local shape
// -----------------------------------------------------------------------
const mapProfile = (p: any): Profile => ({
  id: p._id as string,
  name: p.name,
  type: p.type as 'Person' | 'Pet',
  colorKey: p.colorKey as keyof ThemeColors,
});

const mapReminder = (r: any): TreatmentReminder => ({
  id: r._id as string,
  profileId: r.profileId as string,
  title: r.title,
  timeHour: r.timeHour,
  timeMinute: r.timeMinute,
  durationMinutes: r.durationMinutes,
  completedToday: r.completedToday,
});

export const RemindersScreen = () => {
  const { colors } = useTheme();
  const { syncCode, isPremiumSync } = useSync();
  const navigation = useNavigation<BottomTabNavigationProp<any>>();

  // ── Local (offline) state ──────────────────────────────────────────────
  const [localProfiles, setLocalProfiles] = useState<Profile[]>([]);
  const [localReminders, setLocalReminders] = useState<TreatmentReminder[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // ── Add Routine modal state ────────────────────────────────────────────
  const [addVisible, setAddVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProfileId, setNewProfileId] = useState<string | null>(null);
  const [newHour, setNewHour] = useState('08');
  const [newMinute, setNewMinute] = useState('00');
  const [newDuration, setNewDuration] = useState('');

  // ── Profile management modal state ────────────────────────────────────
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileType, setProfileType] = useState<'Person' | 'Pet'>('Person');
  const [profileColor, setProfileColor] = useState<keyof ThemeColors>('blue');

  // ── Convex real-time hooks (only active when syncCode is non-empty) ────
  const convexProfiles = useQuery(
    api.db.getProfiles,
    syncCode && isPremiumSync ? { deviceId: syncCode } : 'skip'
  );
  const convexReminders = useQuery(
    api.db.getReminders,
    syncCode && isPremiumSync ? { deviceId: syncCode } : 'skip'
  );

  // Convex mutations
  const convexCreateProfile = useMutation(api.db.createProfile);
  const convexRemoveProfile = useMutation(api.db.removeProfile);
  const convexSaveReminder = useMutation(api.db.saveReminder);
  const convexMarkComplete = useMutation(api.db.markReminderComplete);
  const convexDeleteReminder = useMutation(api.db.deleteReminder);
  const convexUpdateProfile = useMutation(api.db.updateProfile);
  const convexUpdateReminder = useMutation(api.db.updateReminder);

  // ── Seed local storage on first launch ────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const p = await AsyncStorage.getItem('@profiles');
      const r = await AsyncStorage.getItem('@reminders');
      if (p) setLocalProfiles(JSON.parse(p));
      else {
        setLocalProfiles(defaultProfiles);
        await AsyncStorage.setItem('@profiles', JSON.stringify(defaultProfiles));
      }
      if (r) setLocalReminders(JSON.parse(r));
      else {
        setLocalReminders(defaultReminders);
        await AsyncStorage.setItem('@reminders', JSON.stringify(defaultReminders));
      }
    };
    init();
  }, []);

  // ── Sync Convex real-time data to local state + AsyncStorage ──────────
  useEffect(() => {
    if (!isPremiumSync || !convexProfiles) return;
    const mapped = convexProfiles.map(mapProfile);
    setLocalProfiles(mapped);
    AsyncStorage.setItem('@profiles', JSON.stringify(mapped));
  }, [convexProfiles, isPremiumSync]);

  useEffect(() => {
    if (!isPremiumSync || !convexReminders) return;
    const mapped = convexReminders.map(mapReminder);
    setLocalReminders(mapped);
    AsyncStorage.setItem('@reminders', JSON.stringify(mapped));
  }, [convexReminders, isPremiumSync]);

  // ── Derived state ─────────────────────────────────────────────────────
  const profiles = localProfiles;
  const reminders = localReminders;

  // Update Widget when reminders change
  useEffect(() => {
    const sorted = [...reminders].sort((a, b) => (a.timeHour * 60 + a.timeMinute) - (b.timeHour * 60 + b.timeMinute));
    const next = sorted.find(r => !r.completedToday);
    
    if (next) {
      const timeStr = `${next.timeHour.toString().padStart(2, '0')}:${next.timeMinute.toString().padStart(2, '0')}`;
      const remaining = reminders.filter(r => !r.completedToday).length;
      updateRoutinesWidget(next.title, timeStr, remaining);
    } else {
      updateRoutinesWidget("All Done!", "Relax", 0);
    }
  }, [reminders]);

  // ── Save helpers (write to both stores) ───────────────────────────────
  const saveProfilesLocal = async (next: Profile[]) => {
    setLocalProfiles(next);
    await AsyncStorage.setItem('@profiles', JSON.stringify(next));
  };

  const saveRemindersLocal = async (next: TreatmentReminder[]) => {
    setLocalReminders(next);
    await AsyncStorage.setItem('@reminders', JSON.stringify(next));
  };

  // ── Toggle completion ─────────────────────────────────────────────────
  const toggleCompletion = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    const nowDone = !reminder.completedToday;
    logStat('treatment', nowDone ? 1 : -1);

    if (isPremiumSync && syncCode) {
      // IDs from Convex are the actual `_id`s; pass directly
      try {
        await convexMarkComplete({ id: id as any, completed: nowDone, deviceId: syncCode });
      } catch (e) {
        console.warn('Convex mark complete failed, saving locally', e);
        const next = reminders.map(r => r.id === id ? { ...r, completedToday: nowDone } : r);
        await saveRemindersLocal(next);
      }
    } else {
      const next = reminders.map(r => r.id === id ? { ...r, completedToday: nowDone } : r);
      await saveRemindersLocal(next);
    }
  };

  // ── Create routine ────────────────────────────────────────────────────
  const createRoutine = async () => {
    if (!newProfileId || !newTitle.trim()) {
      Alert.alert('Missing Fields', 'Please enter a title and assign a profile.');
      return;
    }
    setAddVisible(false);
    setNewTitle('');
    setNewDuration('');

    if (isPremiumSync && syncCode) {
      try {
        await convexSaveReminder({
          deviceId: syncCode,
          profileId: newProfileId as any,
          title: newTitle,
          timeHour: parseInt(newHour) || 0,
          timeMinute: parseInt(newMinute) || 0,
          durationMinutes: newDuration ? parseInt(newDuration) : undefined,
          completedToday: false,
        });
        return; // Convex subscription will update UI
      } catch (e) { console.warn('Convex create routine failed, saving locally', e); }
    }

    const newRoutine: TreatmentReminder = {
      id: Crypto.randomUUID(),
      profileId: newProfileId,
      title: newTitle,
      timeHour: parseInt(newHour) || 0,
      timeMinute: parseInt(newMinute) || 0,
      durationMinutes: newDuration ? parseInt(newDuration) : undefined,
      completedToday: false,
    };
    await saveRemindersLocal([...reminders, newRoutine]);
  };

  // ── Profile CRUD ──────────────────────────────────────────────────────
  const openAddProfile = () => {
    setEditingProfile(null); setProfileName(''); setProfileType('Person'); setProfileColor('blue');
    setProfileModalVisible(true);
  };
  const openEditProfile = (p: Profile) => {
    setEditingProfile(p); setProfileName(p.name); setProfileType(p.type); setProfileColor(p.colorKey);
    setProfileModalVisible(true);
  };

  const saveProfile = async () => {
    if (!profileName.trim()) { Alert.alert('Missing Info', 'Please provide a name.'); return; }
    setProfileModalVisible(false);

    if (isPremiumSync && syncCode) {
      try {
        if (editingProfile) {
          await convexUpdateProfile({ id: editingProfile.id as any, name: profileName, type: profileType, colorKey: profileColor });
        } else {
          await convexCreateProfile({ deviceId: syncCode, name: profileName, type: profileType, colorKey: profileColor });
        }
        return; // subscription updates UI
      } catch (e) { console.warn('Convex profile save failed, saving locally', e); }
    }

    if (editingProfile) {
      await saveProfilesLocal(profiles.map(p => p.id === editingProfile.id ? { ...p, name: profileName, type: profileType, colorKey: profileColor } : p));
    } else {
      const newP: Profile = { id: Crypto.randomUUID(), name: profileName, type: profileType, colorKey: profileColor };
      await saveProfilesLocal([...profiles, newP]);
    }
  };

  const deleteProfile = () => {
    if (!editingProfile) return;
    Alert.alert('Delete Profile?', `Delete "${editingProfile.name}" and all its routines?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setProfileModalVisible(false);
        if (selectedProfileId === editingProfile.id) setSelectedProfileId(null);

        if (isPremiumSync && syncCode) {
          try {
            // Delete all reminders for this profile first
            const toDelete = reminders.filter(r => r.profileId === editingProfile.id);
            await Promise.all(toDelete.map(r => convexDeleteReminder({ id: r.id as any })));
            await convexRemoveProfile({ id: editingProfile.id as any });
            return;
          } catch (e) { console.warn('Convex delete failed, removing locally', e); }
        }

        await saveProfilesLocal(profiles.filter(p => p.id !== editingProfile.id));
        await saveRemindersLocal(reminders.filter(r => r.profileId !== editingProfile.id));
      }}
    ]);
  };

  const getProfile = (id: string) => profiles.find(p => p.id === id);

  // ── Render ────────────────────────────────────────────────────────────
  const renderReminder = ({ item }: { item: TreatmentReminder }) => {
    const profile = getProfile(item.profileId);
    if (!profile) return null;
    const timeStr = `${item.timeHour.toString().padStart(2, '0')}:${item.timeMinute.toString().padStart(2, '0')}`;
    const pColor = profile.colorKey as keyof ThemeColors;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface0, borderColor: item.completedToday ? colors[pColor] : 'transparent', borderWidth: item.completedToday ? 2 : 0 }]}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <View style={[styles.profileDot, { backgroundColor: colors[pColor] }]} />
            <ThemeText variant="h2" colorKey="text" style={item.completedToday ? { textDecorationLine: 'line-through', opacity: 0.5 } : {}}>
              {item.title}
            </ThemeText>
          </View>
          <ThemeText variant="h1" colorKey={pColor}>{timeStr}</ThemeText>
        </View>
        <View style={styles.cardFooter}>
          <ThemeText variant="caption" colorKey="subtext0">For: {profile.name}</ThemeText>
          <View style={styles.actionsRow}>
            {item.durationMinutes && (
              <TouchableOpacity
                style={[styles.therapyBtn, { backgroundColor: colors.surface1 }]}
                onPress={() => navigation.navigate('Timers', { createTimer: { title: item.title, colorKey: pColor, durationMs: item.durationMinutes! * 60 * 1000 } })}
              >
                <Ionicons name="timer-outline" size={20} color={colors.text} style={{ marginRight: 6 }} />
                <ThemeText variant="caption" colorKey="text">{item.durationMinutes}m Therapy</ThemeText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.checkBtn, { backgroundColor: item.completedToday ? colors[pColor] : colors.surface1 }]}
              onPress={() => toggleCompletion(item.id)}
            >
              <Ionicons name="checkmark" size={24} color={item.completedToday ? colors.base : colors.subtext0} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const filteredReminders = selectedProfileId
    ? reminders.filter(r => r.profileId === selectedProfileId)
    : reminders;

  const isLoading = isPremiumSync && (convexProfiles === undefined || convexReminders === undefined);

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      {/* Premium sync indicator */}
      {isPremiumSync && (
        <View style={[styles.syncBadge, { backgroundColor: colors.surface0 }]}>
          <Ionicons name="cloud" size={14} color={colors.sky} />
          <ThemeText variant="caption" colorKey="sky" style={{ marginLeft: 6 }}>Live Sync Active</ThemeText>
        </View>
      )}

      {/* Profile tabs */}
      <View style={styles.profilesHeader}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.profileChip, { backgroundColor: selectedProfileId === null ? colors.text : colors.surface0 }]}
            onPress={() => setSelectedProfileId(null)}
          >
            <ThemeText variant="body" colorKey={selectedProfileId === null ? 'base' : 'text'}>All</ThemeText>
          </TouchableOpacity>
          {profiles.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.profileChip, { backgroundColor: selectedProfileId === p.id ? colors[p.colorKey as keyof ThemeColors] : colors.surface0 }]}
              onPress={() => setSelectedProfileId(p.id)}
              onLongPress={() => openEditProfile(p)}
            >
              <ThemeText variant="body" colorKey={selectedProfileId === p.id ? 'base' : 'text'}>{p.name}</ThemeText>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.profileChip, { backgroundColor: colors.surface0, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.subtext0, paddingHorizontal: 12 }]}
            onPress={openAddProfile}
          >
            <Ionicons name="add" size={18} color={colors.text} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.sky} />
          <ThemeText variant="body" colorKey="subtext0" style={{ marginTop: 16 }}>Connecting to Live Sync...</ThemeText>
        </View>
      ) : (
        <FlatList
          data={[...filteredReminders].sort((a, b) => (a.timeHour * 60 + a.timeMinute) - (b.timeHour * 60 + b.timeMinute))}
          keyExtractor={item => item.id}
          renderItem={renderReminder}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.mauve, shadowColor: colors.crust }]}
        onPress={() => setAddVisible(true)}
      >
        <Ionicons name="add" size={32} color={colors.base} />
      </TouchableOpacity>

      {/* Add Routine Modal */}
      {addVisible && (
        <Modal transparent animationType="slide">
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.base }]}>
              <ThemeText variant="h2" style={{ marginBottom: 16 }}>New Routine</ThemeText>
              <ThemeText variant="caption" colorKey="subtext0" style={{ marginBottom: 8 }}>ROUTINE NAME</ThemeText>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface0, color: colors.text, marginBottom: 16 }]}
                placeholder="e.g. Morning Yoga"
                placeholderTextColor={colors.subtext0}
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <ThemeText variant="caption" colorKey="subtext0" style={{ marginBottom: 8 }}>ASSIGN TO PROFILE</ThemeText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }}>
                {profiles.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.profileChip, { backgroundColor: newProfileId === p.id ? colors[p.colorKey as keyof ThemeColors] : colors.surface0 }]}
                    onPress={() => setNewProfileId(p.id)}
                  >
                    <ThemeText variant="body" colorKey={newProfileId === p.id ? 'base' : 'text'}>{p.name}</ThemeText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <ThemeText variant="caption" colorKey="subtext0" style={{ marginBottom: 8 }}>HOUR (0-23)</ThemeText>
                  <TextInput style={[styles.textInput, { backgroundColor: colors.surface0, color: colors.text }]} keyboardType="numeric" value={newHour} onChangeText={setNewHour} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <ThemeText variant="caption" colorKey="subtext0" style={{ marginBottom: 8 }}>MINUTE (0-59)</ThemeText>
                  <TextInput style={[styles.textInput, { backgroundColor: colors.surface0, color: colors.text }]} keyboardType="numeric" value={newMinute} onChangeText={setNewMinute} />
                </View>
              </View>
              <ThemeText variant="caption" colorKey="subtext0" style={{ marginBottom: 8 }}>OPTIONAL ROUTINE DURATION (MINUTES)</ThemeText>
              <TextInput style={[styles.textInput, { backgroundColor: colors.surface0, color: colors.text, marginBottom: 24 }]} keyboardType="numeric" placeholder="Leave blank if none" placeholderTextColor={colors.subtext0} value={newDuration} onChangeText={setNewDuration} />
              <View style={{ flexDirection: 'row', width: '100%' }}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surface1, flex: 1, marginRight: 8 }]} onPress={() => setAddVisible(false)}>
                  <ThemeText variant="body" colorKey="text">Cancel</ThemeText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.mauve, flex: 1, marginLeft: 8 }]} onPress={createRoutine}>
                  <ThemeText variant="body" colorKey="base" style={{ fontWeight: 'bold' }}>Save</ThemeText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Profile Management Modal */}
      {profileModalVisible && (
        <Modal transparent animationType="slide">
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.base }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <ThemeText variant="h2">{editingProfile ? 'Edit Profile' : 'New Profile'}</ThemeText>
                {editingProfile && (
                  <TouchableOpacity onPress={deleteProfile}>
                    <Ionicons name="trash-outline" size={24} color={colors.red} />
                  </TouchableOpacity>
                )}
              </View>
              <ThemeText variant="caption" colorKey="subtext0" style={{ marginBottom: 8 }}>PROFILE NAME</ThemeText>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface0, color: colors.text, marginBottom: 16 }]}
                placeholder="e.g. John, Mittens"
                placeholderTextColor={colors.subtext0}
                value={profileName}
                onChangeText={setProfileName}
              />
              <ThemeText variant="caption" colorKey="subtext0" style={{ marginBottom: 8 }}>PROFILE CATEGORY</ThemeText>
              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <TouchableOpacity style={[styles.modalBtn, { flex: 1, marginRight: 8, paddingVertical: 12, backgroundColor: profileType === 'Person' ? colors.sapphire : colors.surface0 }]} onPress={() => setProfileType('Person')}>
                  <ThemeText variant="body" colorKey={profileType === 'Person' ? 'base' : 'text'}>Person</ThemeText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { flex: 1, marginLeft: 8, paddingVertical: 12, backgroundColor: profileType === 'Pet' ? colors.rosewater : colors.surface0 }]} onPress={() => setProfileType('Pet')}>
                  <ThemeText variant="body" colorKey={profileType === 'Pet' ? 'base' : 'text'}>Pet</ThemeText>
                </TouchableOpacity>
              </View>
              <ThemeText variant="caption" colorKey="subtext0" style={{ marginBottom: 8 }}>PROFILE COLOR</ThemeText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {(['blue', 'lavender', 'sapphire', 'sky', 'teal', 'green', 'yellow', 'peach', 'maroon', 'red', 'mauve', 'pink', 'flamingo', 'rosewater'] as (keyof ThemeColors)[]).map(c => (
                  <TouchableOpacity
                    key={c}
                    style={{ width: 48, height: 48, borderRadius: 24, marginHorizontal: 6, backgroundColor: colors[c], borderWidth: profileColor === c ? 3 : 0, borderColor: colors.text }}
                    onPress={() => setProfileColor(c)}
                  />
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', width: '100%' }}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surface1, flex: 1, marginRight: 8 }]} onPress={() => setProfileModalVisible(false)}>
                  <ThemeText variant="body" colorKey="text">Cancel</ThemeText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.green, flex: 1, marginLeft: 8 }]} onPress={saveProfile}>
                  <ThemeText variant="body" colorKey="base" style={{ fontWeight: 'bold' }}>Save</ThemeText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    margin: 12,
    marginBottom: 0,
  },
  profilesHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  profileChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    padding: 24,
    marginBottom: 16,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  profileDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
    paddingTop: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  therapyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 12,
  },
  checkBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  textInput: {
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
  },
  modalBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
