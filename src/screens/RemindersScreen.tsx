import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { ThemeText } from '../components/ThemeText';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColorPicker } from '../components/ThemeColorPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

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

export const RemindersScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reminders, setReminders] = useState<TreatmentReminder[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Add Routine State
  const [addVisible, setAddVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProfileId, setNewProfileId] = useState<string | null>(null);
  const [newHour, setNewHour] = useState('08');
  const [newMinute, setNewMinute] = useState('00');
  const [newDuration, setNewDuration] = useState('');

  // Profile Management State
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileType, setProfileType] = useState<'Person' | 'Pet'>('Person');
  const [profileColor, setProfileColor] = useState<keyof ThemeColors>('blue');

  // Offline-First Local Storage Load
  useEffect(() => {
    const loadLocalData = async () => {
      try {
        const p = await AsyncStorage.getItem('@profiles');
        const r = await AsyncStorage.getItem('@reminders');
        
        if (p) setProfiles(JSON.parse(p));
        else {
          setProfiles(defaultProfiles);
          await AsyncStorage.setItem('@profiles', JSON.stringify(defaultProfiles));
        }
        
        if (r) setReminders(JSON.parse(r));
        else {
          setReminders(defaultReminders);
          await AsyncStorage.setItem('@reminders', JSON.stringify(defaultReminders));
        }
      } catch (e) {
        console.error("Local Storage Error", e);
      }
    };
    loadLocalData();
  }, []);

  const saveProfiles = async (newProfiles: Profile[]) => {
    setProfiles(newProfiles);
    await AsyncStorage.setItem('@profiles', JSON.stringify(newProfiles));
  };

  const saveReminders = async (newReminders: TreatmentReminder[]) => {
    setReminders(newReminders);
    await AsyncStorage.setItem('@reminders', JSON.stringify(newReminders));
  };

  const toggleCompletion = (id: string) => {
    const updated = reminders.map(r => r.id === id ? { ...r, completedToday: !r.completedToday } : r);
    saveReminders(updated);
  };

  const createRoutine = () => {
    if (!newProfileId || !newTitle.trim()) {
      Alert.alert('Missing Fields', 'Please enter a routine title and select an assigned profile.');
      return;
    }
    const newRoutine: TreatmentReminder = {
      id: Crypto.randomUUID(),
      profileId: newProfileId,
      title: newTitle,
      timeHour: parseInt(newHour) || 0,
      timeMinute: parseInt(newMinute) || 0,
      durationMinutes: newDuration ? parseInt(newDuration) : undefined,
      completedToday: false
    };
    saveReminders([...reminders, newRoutine]);
    setAddVisible(false);
    setNewTitle('');
    setNewDuration('');
  };

  const openAddProfile = () => {
    setEditingProfile(null);
    setProfileName('');
    setProfileType('Person');
    setProfileColor('blue');
    setProfileModalVisible(true);
  };

  const openEditProfile = (p: Profile) => {
    setEditingProfile(p);
    setProfileName(p.name);
    setProfileType(p.type);
    setProfileColor(p.colorKey);
    setProfileModalVisible(true);
  };

  const saveProfile = () => {
    if (!profileName.trim()) {
      Alert.alert('Missing Info', 'Please provide a name for the profile.');
      return;
    }
    if (editingProfile) {
      const updated = profiles.map(p => p.id === editingProfile.id ? { ...p, name: profileName, type: profileType, colorKey: profileColor } : p);
      saveProfiles(updated);
    } else {
      const newP: Profile = { id: Crypto.randomUUID(), name: profileName, type: profileType, colorKey: profileColor };
      saveProfiles([...profiles, newP]);
    }
    setProfileModalVisible(false);
  };

  const deleteProfile = () => {
    if (!editingProfile) return;
    Alert.alert('Delete Profile?', `Are you sure you want to delete ${editingProfile.name}? All associated routines will also be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        saveProfiles(profiles.filter(p => p.id !== editingProfile.id));
        saveReminders(reminders.filter(r => r.profileId !== editingProfile.id));
        if (selectedProfileId === editingProfile.id) setSelectedProfileId(null);
        setProfileModalVisible(false);
      }}
    ])
  };

  const getProfile = (id: string) => profiles.find(p => p.id === id);

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
                onPress={() => {
                  navigation.navigate('Timers', {
                    createTimer: {
                      title: item.title,
                      colorKey: pColor,
                      durationMs: item.durationMinutes! * 60 * 1000,
                    }
                  });
                }}
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

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
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

      <FlatList
        data={[...filteredReminders].sort((a,b) => (a.timeHour * 60 + a.timeMinute) - (b.timeHour * 60 + b.timeMinute))}
        keyExtractor={item => item.id}
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

              <ThemeText variant="caption" colorKey="subtext0" style={{ marginBottom: 8 }}>OPTIONAL THERAPY TIMER (MINUTES)</ThemeText>
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
                <TouchableOpacity 
                  style={[styles.modalBtn, { flex: 1, marginRight: 8, paddingVertical: 12, backgroundColor: profileType === 'Person' ? colors.sapphire : colors.surface0 }]}
                  onPress={() => setProfileType('Person')}
                >
                  <ThemeText variant="body" colorKey={profileType === 'Person' ? 'base' : 'text'}>Person</ThemeText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, { flex: 1, marginLeft: 8, paddingVertical: 12, backgroundColor: profileType === 'Pet' ? colors.rosewater : colors.surface0 }]}
                  onPress={() => setProfileType('Pet')}
                >
                  <ThemeText variant="body" colorKey={profileType === 'Pet' ? 'base' : 'text'}>Pet</ThemeText>
                </TouchableOpacity>
              </View>

              <ThemeText variant="caption" colorKey="subtext0" style={{ marginBottom: 8 }}>PROFILE COLOR</ThemeText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {(['blue', 'lavender', 'sapphire', 'sky', 'teal', 'green', 'yellow', 'peach', 'maroon', 'red', 'mauve', 'pink', 'flamingo', 'rosewater'] as (keyof ThemeColors)[]).map(c => (
                  <TouchableOpacity
                    key={c}
                    style={{
                      width: 48, height: 48, borderRadius: 24, marginHorizontal: 6,
                      backgroundColor: colors[c],
                      borderWidth: profileColor === c ? 3 : 0,
                      borderColor: colors.text
                    }}
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
  }
});
