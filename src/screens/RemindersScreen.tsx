import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { api } from '../../convex/_generated/api';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { ThemeText } from '../components/ThemeText';
import { Ionicons } from '@expo/vector-icons';
import { logStat } from '../utils/stats';
import { updateRoutinesWidget } from '../utils/WidgetService';
import { useSync } from '../context/SyncContext';
import { usePersistentProfiles, usePersistentReminders } from '../hooks/usePersistentData';
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';

export const RemindersScreen = () => {
  const { colors } = useTheme();
  const { syncCode, isSyncActive, isPro } = useSync();
  const navigation = useNavigation<BottomTabNavigationProp<any>>();

  const { profiles, create: createProfile, remove: removeProfile, update: updateProfile } = usePersistentProfiles();
  const { reminders, create: createReminder, remove: removeReminder, update: updateReminder, markComplete } = usePersistentReminders();

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
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileType, setProfileType] = useState<'Person' | 'Pet'>('Person');
  const [profileColor, setProfileColor] = useState<keyof ThemeColors>('blue');

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

  // ── Toggle completion ─────────────────────────────────────────────────
  const toggleCompletion = async (id: string) => {
    const reminder = reminders.find(r => r._id === id);
    if (!reminder) return;
    const nowDone = !reminder.completedToday;
    logStat('treatment', nowDone ? 1 : -1);
    await markComplete({ id, completed: nowDone, deviceId: syncCode });
  };

  // ── Create routine ────────────────────────────────────────────────────
  const createRoutine = async () => {
    if (!newProfileId || !newTitle.trim()) {
      Alert.alert('Missing Fields', 'Please enter a title and assign a profile.');
      return;
    }
    setAddVisible(false);
    
    await createReminder({
      deviceId: syncCode,
      profileId: newProfileId as any,
      title: newTitle,
      timeHour: parseInt(newHour) || 0,
      timeMinute: parseInt(newMinute) || 0,
      durationMinutes: newDuration ? parseInt(newDuration) : undefined,
    });

    setNewTitle('');
    setNewDuration('');
  };

  // ── Profile CRUD ──────────────────────────────────────────────────────
  const openAddProfile = () => {
    setEditingProfile(null); setProfileName(''); setProfileType('Person'); setProfileColor('blue');
    setProfileModalVisible(true);
  };
  const openEditProfile = (p: any) => {
    setEditingProfile(p); setProfileName(p.name); setProfileType(p.type); setProfileColor(p.colorKey);
    setProfileModalVisible(true);
  };

  const saveProfile = async () => {
    if (!profileName.trim()) { Alert.alert('Missing Info', 'Please provide a name.'); return; }
    setProfileModalVisible(false);

    if (editingProfile) {
      await updateProfile({ id: editingProfile._id, name: profileName, type: profileType, colorKey: profileColor });
    } else {
      await createProfile({ deviceId: syncCode, name: profileName, type: profileType, colorKey: profileColor });
    }
  };

  const deleteProfile = () => {
    if (!editingProfile) return;
    Alert.alert('Delete Profile?', `Delete "${editingProfile.name}" and all its routines?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setProfileModalVisible(false);
        if (selectedProfileId === editingProfile._id) setSelectedProfileId(null);

        // Delete all reminders for this profile first
        const toDelete = reminders.filter(r => r.profileId === editingProfile._id);
        for (const r of toDelete) {
           await removeReminder({ id: r._id });
        }
        await removeProfile({ id: editingProfile._id });
      }}
    ]);
  };

  const getProfile = (id: string) => profiles.find(p => p._id === id);

  // ── Render ────────────────────────────────────────────────────────────
  const renderReminder = ({ item }: { item: any }) => {
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
              onPress={() => toggleCompletion(item._id)}
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

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <SyncStatusIndicator />

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
              key={p._id}
              style={[styles.profileChip, { backgroundColor: selectedProfileId === p._id ? colors[p.colorKey as keyof ThemeColors] : colors.surface0 }]}
              onPress={() => setSelectedProfileId(p._id)}
              onLongPress={() => openEditProfile(p)}
            >
              <ThemeText variant="body" colorKey={selectedProfileId === p._id ? 'base' : 'text'}>{p.name}</ThemeText>
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

        <FlatList
          data={[...filteredReminders].sort((a, b) => (a.timeHour * 60 + a.timeMinute) - (b.timeHour * 60 + b.timeMinute))}
          keyExtractor={item => item._id}
          renderItem={renderReminder}
          contentContainerStyle={styles.listContent}
        />

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
                    key={p._id}
                    style={[styles.profileChip, { backgroundColor: newProfileId === p._id ? colors[p.colorKey as keyof ThemeColors] : colors.surface0 }]}
                    onPress={() => setNewProfileId(p._id)}
                  >
                    <ThemeText variant="body" colorKey={newProfileId === p._id ? 'base' : 'text'}>{p.name}</ThemeText>
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
