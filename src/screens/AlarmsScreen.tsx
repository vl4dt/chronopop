import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Switch, TouchableOpacity, Platform, Modal, TextInput, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { ThemeText } from '../components/ThemeText';
import { ThemeColorPicker } from '../components/ThemeColorPicker';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useSync } from '../context/SyncContext';
import { Doc, Id } from '../../convex/_generated/dataModel';

export const AlarmsScreen = () => {
  const { colors } = useTheme();
  const { syncCode } = useSync();
  
  const alarms = useQuery(api.db.getAlarms, { deviceId: syncCode }) || [];
  const createAlarmMutable = useMutation(api.db.createAlarm);
  const updateAlarmMutable = useMutation(api.db.updateAlarm);
  const deleteAlarmMutable = useMutation(api.db.deleteAlarm);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedAlarmId, setSelectedAlarmId] = useState<Id<"alarms"> | null>(null);
  
  // For time picker
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState<Id<"alarms"> | null>(null);

  // For Missions
  const [missionVisible, setMissionVisible] = useState(false);
  const [currentMission, setCurrentMission] = useState({ q: '10 + 10', a: 20 });
  const [missionInput, setMissionInput] = useState('');

  const generateMission = () => {
    const n1 = Math.floor(Math.random() * 50) + 12;
    const n2 = Math.floor(Math.random() * 50) + 12;
    setCurrentMission({ q: `${n1} + ${n2}`, a: n1 + n2 });
    setMissionInput('');
  };

  const checkMission = async () => {
    if (parseInt(missionInput) === currentMission.a) {
      setMissionVisible(false);
      Alert.alert('Mission accomplished!', 'Alarm disabled.');
    }
  };

  const toggleAlarm = async (id: Id<"alarms">) => {
    const alarm = alarms.find(a => a._id === id);
    if (alarm) {
      updateAlarmMutable({ id, enabled: !alarm.enabled });
    }
  };

  const addAlarm = () => {
    const now = new Date();
    now.setHours(7, 0, 0, 0);
    createAlarmMutable({
      deviceId: syncCode,
      timeUnixMs: now.getTime(),
      enabled: true,
      colorKey: 'blue',
      missionEnabled: false,
    });
  };

  const modifyAlarmTime = (hours: number, minutes: number) => {
    if (!editingAlarmId) return;
    const alarm = alarms.find(a => a._id === editingAlarmId);
    if (!alarm) return;
    
    const newTime = new Date(alarm.timeUnixMs);
    newTime.setHours(newTime.getHours() + hours);
    newTime.setMinutes(newTime.getMinutes() + minutes);
    updateAlarmMutable({ id: editingAlarmId, timeUnixMs: newTime.getTime() });
  };

  const renderItem = ({ item }: { item: Doc<"alarms"> }) => {
    const alarmTime = new Date(item.timeUnixMs);
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    
    return (
      <View style={[styles.card, { backgroundColor: colors.surface0, shadowColor: colors.crust }]}>
        <View style={styles.cardHeader}>
          <TouchableOpacity 
            style={styles.timeContainer}
            onPress={() => {
              setEditingAlarmId(item._id);
              setShowTimePicker(true);
            }}
          >
            <ThemeText variant="h1" colorKey={item.colorKey as keyof ThemeColors} style={{ opacity: item.enabled ? 1 : 0.5 }}>
              {formatter.format(alarmTime)}
            </ThemeText>
          </TouchableOpacity>
          <Switch
            value={item.enabled}
            onValueChange={() => toggleAlarm(item._id)}
            trackColor={{ false: colors.surface2, true: colors[item.colorKey as keyof ThemeColors] }}
            thumbColor={Platform.OS === 'ios' ? undefined : colors.base}
          />
        </View>
        
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={[styles.colorButton, { backgroundColor: colors[item.colorKey as keyof ThemeColors] }]}
            onPress={() => {
              setSelectedAlarmId(item._id);
              setPickerVisible(true);
            }}
          />
          <TouchableOpacity 
            style={[styles.missionBtn, { backgroundColor: item.missionEnabled ? colors.peach : colors.surface1 }]}
            onPress={() => {
              updateAlarmMutable({ id: item._id, missionEnabled: !item.missionEnabled });
            }}
          >
            <ThemeText variant="caption" colorKey={item.missionEnabled ? 'base' : 'text'} style={{ fontWeight: 'bold' }}>
              {item.missionEnabled ? 'Mission ON' : 'Mission OFF'}
            </ThemeText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteAlarmMutable({ id: item._id })}>
            <Ionicons name="trash-outline" size={24} color={colors.red} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <FlatList
        data={alarms}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.mauve, shadowColor: colors.crust }]} 
        onPress={addAlarm}
      >
        <Ionicons name="add" size={32} color={colors.base} />
      </TouchableOpacity>

      {selectedAlarmId && (
        <ThemeColorPicker
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          selectedColorKey={alarms.find(a => a._id === selectedAlarmId)?.colorKey as keyof ThemeColors}
          onSelectColor={(colorKey) => {
            updateAlarmMutable({ id: selectedAlarmId, colorKey });
          }}
        />
      )}

      {showTimePicker && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.base, borderColor: colors.crust }]}>
              <ThemeText variant="h2" style={{ marginBottom: 20, textAlign: 'center' }}>Set Time</ThemeText>
              
              <View style={styles.timeEditorRow}>
                <View style={styles.timeColumn}>
                  <TouchableOpacity style={[styles.timeIncBtn, { backgroundColor: colors.surface1 }]} onPress={() => modifyAlarmTime(1, 0)}>
                    <Ionicons name="chevron-up" size={24} color={colors.text} />
                  </TouchableOpacity>
                  <ThemeText variant="h1" colorKey="text">
                    {new Date(alarms.find(a => a._id === editingAlarmId)?.timeUnixMs || 0).getHours().toString().padStart(2, '0')}
                  </ThemeText>
                  <TouchableOpacity style={[styles.timeIncBtn, { backgroundColor: colors.surface1 }]} onPress={() => modifyAlarmTime(-1, 0)}>
                    <Ionicons name="chevron-down" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ThemeText variant="h1" style={{ marginHorizontal: 16 }}>:</ThemeText>

                <View style={styles.timeColumn}>
                  <TouchableOpacity style={[styles.timeIncBtn, { backgroundColor: colors.surface1 }]} onPress={() => modifyAlarmTime(0, 1)}>
                    <Ionicons name="chevron-up" size={24} color={colors.text} />
                  </TouchableOpacity>
                  <ThemeText variant="h1" colorKey="text">
                    {new Date(alarms.find(a => a._id === editingAlarmId)?.timeUnixMs || 0).getMinutes().toString().padStart(2, '0')}
                  </ThemeText>
                  <TouchableOpacity style={[styles.timeIncBtn, { backgroundColor: colors.surface1 }]} onPress={() => modifyAlarmTime(0, -1)}>
                    <Ionicons name="chevron-down" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={[styles.doneButton, { backgroundColor: colors.mauve }]} onPress={() => setShowTimePicker(false)}>
                <ThemeText variant="body" colorKey="base" style={{ fontWeight: 'bold' }}>Done</ThemeText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {missionVisible && (
        <Modal visible transparent animationType="slide">
          <View style={[styles.modalOverlay, { backgroundColor: colors.base }]}>
            <View style={{ alignItems: 'center', width: '80%' }}>
              <Ionicons name="warning" size={64} color={colors.peach} style={{ marginBottom: 20 }} />
              <ThemeText variant="h1" colorKey="peach" style={{ marginBottom: 8 }}>ALARM!</ThemeText>
              <ThemeText variant="body" colorKey="text" style={{ textAlign: 'center', marginBottom: 32 }}>
                Solve the math problem to prove you are awake and dismiss the alarm.
              </ThemeText>
              
              <View style={[styles.missionBox, { backgroundColor: colors.surface0, borderColor: colors.crust }]}>
                <ThemeText variant="h1" colorKey="text">{currentMission.q}</ThemeText>
              </View>

              <TextInput
                style={[styles.missionInput, { backgroundColor: colors.surface1, color: colors.text }]}
                keyboardType="numeric"
                value={missionInput}
                onChangeText={setMissionInput}
                placeholder="?"
                placeholderTextColor={colors.subtext0}
                autoFocus
              />

              <TouchableOpacity style={[styles.doneButton, { backgroundColor: colors.peach, marginTop: 24 }]} onPress={checkMission}>
                <ThemeText variant="h2" colorKey="base" style={{ fontWeight: 'bold' }}>DISMISS</ThemeText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    marginBottom: 20,
  },
  timeContainer: {
    paddingVertical: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
    paddingTop: 16,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    width: '80%',
    alignItems: 'center',
  },
  timeEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  timeColumn: {
    alignItems: 'center',
  },
  timeIncBtn: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 12,
  },
  doneButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  missionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  missionBox: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 2,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  missionInput: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    padding: 16,
    borderRadius: 16,
  }
});
