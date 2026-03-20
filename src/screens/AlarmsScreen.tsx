import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Switch, TouchableOpacity, Platform, Modal, TextInput, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { ThemeText } from '../components/ThemeText';
import { ThemeColorPicker } from '../components/ThemeColorPicker';
import { Ionicons } from '@expo/vector-icons';

type Alarm = {
  id: string;
  time: Date;
  enabled: boolean;
  colorKey: keyof ThemeColors;
  missionEnabled: boolean;
};

const initialAlarms: Alarm[] = [
  { id: '1', time: new Date(new Date().setHours(7, 0, 0, 0)), enabled: true, colorKey: 'peach', missionEnabled: true },
  { id: '2', time: new Date(new Date().setHours(8, 30, 0, 0)), enabled: false, colorKey: 'lavender', missionEnabled: false },
];

export const AlarmsScreen = () => {
  const { colors } = useTheme();
  const [alarms, setAlarms] = useState<Alarm[]>(initialAlarms);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedAlarmId, setSelectedAlarmId] = useState<string | null>(null);
  
  // For time picker
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);

  // For Missions
  const [missionVisible, setMissionVisible] = useState(false);
  const [currentMission, setCurrentMission] = useState({ q: '10 + 10', a: 20 });
  const [missionInput, setMissionInput] = useState('');

  const playSound = async (loop: boolean = false) => {
    // Legacy support: We trigger an Alert instead of Audio since ExponentAV requires Custom Dev Client
    if (!loop) {
      Alert.alert('Alarm ringing!', 'Time to check your alarms.');
    }
  };

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

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setAlarms(prev => {
        let changed = false;
        const next = prev.map(a => {
          if (!a.enabled) return a;
          if (a.time.getHours() === now.getHours() && a.time.getMinutes() === now.getMinutes() && now.getSeconds() === 0) {
            if (a.missionEnabled) {
               generateMission();
               setMissionVisible(true);
               playSound(true);
            } else {
               playSound(false);
            }
            changed = true;
            return { ...a, enabled: false };
          }
          return a;
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleAlarm = (id: string) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const addAlarm = () => {
    const newAlarm: Alarm = {
      id: Date.now().toString(),
      time: new Date(),
      enabled: true,
      colorKey: 'blue',
      missionEnabled: false,
    };
    setAlarms(prev => [...prev, newAlarm]);
  };

  const deleteAlarm = (id: string) => {
    setAlarms(prev => prev.filter(a => a.id !== id));
  };

  const modifyAlarmTime = (hours: number, minutes: number) => {
    if (!editingAlarmId) return;
    setAlarms(prev => prev.map(a => {
      if (a.id !== editingAlarmId) return a;
      const newTime = new Date(a.time);
      newTime.setHours(newTime.getHours() + hours);
      newTime.setMinutes(newTime.getMinutes() + minutes);
      return { ...a, time: newTime };
    }));
  };

  const renderItem = ({ item }: { item: Alarm }) => {
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
              setEditingAlarmId(item.id);
              setShowTimePicker(true);
            }}
          >
            <ThemeText variant="h1" colorKey={item.colorKey} style={{ opacity: item.enabled ? 1 : 0.5 }}>
              {formatter.format(item.time)}
            </ThemeText>
          </TouchableOpacity>
          <Switch
            value={item.enabled}
            onValueChange={() => toggleAlarm(item.id)}
            trackColor={{ false: colors.surface2, true: colors[item.colorKey] }}
            thumbColor={Platform.OS === 'ios' ? undefined : colors.base}
          />
        </View>
        
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={[styles.colorButton, { backgroundColor: colors[item.colorKey] }]}
            onPress={() => {
              setSelectedAlarmId(item.id);
              setPickerVisible(true);
            }}
          />
          <TouchableOpacity 
            style={[styles.missionBtn, { backgroundColor: item.missionEnabled ? colors.peach : colors.surface1 }]}
            onPress={() => {
              setAlarms(prev => prev.map(a => a.id === item.id ? { ...a, missionEnabled: !a.missionEnabled } : a));
            }}
          >
            <ThemeText variant="caption" colorKey={item.missionEnabled ? 'base' : 'text'} style={{ fontWeight: 'bold' }}>
              {item.missionEnabled ? 'Mission ON' : 'Mission OFF'}
            </ThemeText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteAlarm(item.id)}>
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
        keyExtractor={item => item.id}
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
          selectedColorKey={alarms.find(a => a.id === selectedAlarmId)?.colorKey}
          onSelectColor={(colorKey) => {
            setAlarms(prev => prev.map(a => a.id === selectedAlarmId ? { ...a, colorKey } : a));
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
                    {alarms.find(a => a.id === editingAlarmId)?.time.getHours().toString().padStart(2, '0') || '00'}
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
                    {alarms.find(a => a.id === editingAlarmId)?.time.getMinutes().toString().padStart(2, '0') || '00'}
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
