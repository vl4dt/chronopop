import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { ThemeText } from '../components/ThemeText';
import { ThemeColorPicker } from '../components/ThemeColorPicker';
import { Ionicons } from '@expo/vector-icons';
import { logStat } from '../utils/stats';
import { startPomodoroActivity, endPomodoroActivity, updatePomodoroActivity } from '../utils/WidgetService';
import { useSync } from '../context/SyncContext';
import { usePersistentTimers } from '../hooks/usePersistentData';
import { useSyncedClock } from '../hooks/useSyncedClock';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Doc, Id } from '../../convex/_generated/dataModel';
import { ProUpgradeModal } from '../components/ProUpgradeModal';
import { AdBanner } from '../components/AdBanner';
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';

const COLOR_OPTIONS: (keyof ThemeColors)[] = ['blue', 'sapphire', 'teal', 'green', 'yellow', 'peach', 'red', 'mauve', 'pink'];

const formatTime = (ms: number) => {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const TimerCard = ({ 
  timer, 
  onDelete, 
  onToggle, 
  onReset, 
  onUpdate, 
  onPickColor,
  onAddTime,
  onSubTime
}: { 
  timer: any; 
  onDelete: (id: string) => void;
  onToggle: (id: string, isRunning: boolean) => void;
  onReset: (id: string) => void;
  onUpdate: (id: string, patch: any) => void;
  onPickColor: (id: string) => void;
  onAddTime: (id: string, mins: number, secs: number) => void;
  onSubTime: (id: string, mins: number, secs: number) => void;
}) => {
  const { colors } = useTheme();
  const displayTime = useSyncedClock({
    startTimeMs: timer.startTimeMs,
    baseTimeMs: timer.baseTimeMs,
    isRunning: timer.isRunning,
    type: 'timer'
  });

  const isFinished = timer.isFinished || (timer.isRunning && displayTime <= 0);

  return (
    <View style={[
      styles.card, 
      { 
        backgroundColor: colors.surface0, 
        borderColor: timer.isPomodoro ? colors.red : (isFinished ? colors[timer.colorKey as keyof ThemeColors] : 'transparent'),
        borderWidth: (isFinished || timer.isPomodoro) ? 2 : 0,
        shadowColor: colors.crust 
      }
    ]}>
      {timer.isPomodoro && (
        <View style={[styles.pomoBadge, { backgroundColor: colors.surface1 }]}>
          <Ionicons name="flame" size={16} color={timer.pomodoroState === 'work' ? colors.red : colors.green} />
          <ThemeText variant="caption" colorKey={timer.pomodoroState === 'work' ? 'red' : 'green'} style={{ fontWeight: 'bold', marginLeft: 6 }}>
            POMODORO • {timer.pomodoroState?.toUpperCase() || 'WORK'}
          </ThemeText>
        </View>
      )}
      
      <View style={styles.cardHeader}>
        <TextInput
          style={[styles.nameInput, { color: colors.text }]}
          value={timer.name}
          onChangeText={(text) => onUpdate(timer._id, { name: text })}
          placeholderTextColor={colors.subtext0}
        />
        <TouchableOpacity onPress={() => onDelete(timer._id)}>
          <Ionicons name="close" size={24} color={colors.subtext0} />
        </TouchableOpacity>
      </View>

      <View style={styles.timeContainer}>
        <ThemeText style={[styles.timeText, { opacity: isFinished ? 0.3 : 1 }]} colorKey={timer.colorKey as keyof ThemeColors}>
          {formatTime(displayTime)}
        </ThemeText>
        {isFinished && (
          <ThemeText style={styles.finishedText} colorKey={timer.colorKey as keyof ThemeColors} variant="h2">Times Up!</ThemeText>
        )}
      </View>

      {!timer.isRunning && !isFinished && (
        <View style={styles.timeAdders}>
          <TouchableOpacity style={[styles.timeBtn, { backgroundColor: colors.surface1 }]} onPress={() => onSubTime(timer._id, 1, 0)}>
            <ThemeText variant="caption">-1m</ThemeText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.timeBtn, { backgroundColor: colors.surface1 }]} onPress={() => onAddTime(timer._id, 0, 15)}>
            <ThemeText variant="caption">+15s</ThemeText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.timeBtn, { backgroundColor: colors.surface1 }]} onPress={() => onAddTime(timer._id, 1, 0)}>
            <ThemeText variant="caption">+1m</ThemeText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.timeBtn, { backgroundColor: colors.surface1 }]} onPress={() => onAddTime(timer._id, 5, 0)}>
            <ThemeText variant="caption">+5m</ThemeText>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface1 }]} onPress={() => onPickColor(timer._id)}>
          <View style={[styles.colorDot, { backgroundColor: colors[timer.colorKey as keyof ThemeColors] }]} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface1 }]} onPress={() => onReset(timer._id)}>
          <Ionicons name="refresh" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.playButton, { backgroundColor: colors[timer.colorKey as keyof ThemeColors], shadowColor: colors.crust }]} onPress={() => onToggle(timer._id, !timer.isRunning)}>
          <Ionicons name={timer.isRunning ? "pause" : (isFinished ? "refresh" : "play")} size={24} color={colors.base} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const TimersScreen = () => {
  const { colors } = useTheme();
  const { syncCode, isPro } = useSync();
  const route = useRoute<any>();
  
  const { timers, create, remove, toggle, reset, update } = usePersistentTimers();

  const [proModalVisible, setProModalVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Pomodoro Configuration
  const [pomoConfigVisible, setPomoConfigVisible] = useState(false);
  const [pomoWorkMin, setPomoWorkMin] = useState('25');
  const [pomoBreakMin, setPomoBreakMin] = useState('5');

  const addTimer = (mins: number) => {
    if (!isPro && timers.length >= 3) {
      setProModalVisible(true);
      return;
    }
    const durationMs = mins * 60 * 1000;
    create({
      deviceId: syncCode,
      name: `Timer ${timers.length + 1}`,
      durationMs,
      baseTimeMs: durationMs,
      isRunning: false,
      colorKey: COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)],
      isFinished: false,
    });
  };

  const addPomodoroTimer = () => {
    if (!isPro && timers.length >= 3) {
      setPomoConfigVisible(false);
      setProModalVisible(true);
      return;
    }
    const workMs = parseInt(pomoWorkMin || '25') * 60 * 1000;
    const breakMs = parseInt(pomoBreakMin || '5') * 60 * 1000;
    
    create({
      deviceId: syncCode,
      name: 'Deep Focus',
      colorKey: 'red',
      durationMs: workMs,
      baseTimeMs: workMs, // Add missings field
      isRunning: false,
      isFinished: false,
      isPomodoro: true,
      pomodoroState: 'work',
      pomodoroWorkMs: workMs,
      pomodoroBreakMs: breakMs,
    }).then(() => {
       setPomoConfigVisible(false);
       startPomodoroActivity(new Date(Date.now() + workMs), 'Work');
    });
  };

  useEffect(() => {
    if (route.params?.createTimer) {
      if (!isPro && timers.length >= 3) {
        setProModalVisible(true);
        route.params.createTimer = undefined;
        return;
      }
      const { title, colorKey, durationMs } = route.params.createTimer;
      create({
        deviceId: syncCode,
        name: title,
        colorKey: colorKey || 'blue',
        durationMs: durationMs,
        baseTimeMs: durationMs,
        isRunning: false,
        isFinished: false,
      });
      route.params.createTimer = undefined;
    }
  }, [route.params?.createTimer, syncCode, isPro, timers.length]);

  useEffect(() => {
    // Check for finished timers
    // We only want to process timers that ARE RUNNING and have PASSED their time.
    const now = Date.now();
    const finishedTimers = timers.filter(t => 
      t.isRunning && 
      t.startTimeMs && 
      !t.isFinished && // Skip if already marked finished in this cycle
      (t.baseTimeMs - (now - t.startTimeMs) <= 0)
    );

    if (finishedTimers.length === 0) return;

    // Process each finished timer
    finishedTimers.forEach(async (tm) => {
      // 1. Immediately stop it locally to prevent duplicate triggers
      await toggle({ id: tm._id, isRunning: false });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (tm.isPomodoro) {
        const isWork = tm.pomodoroState === 'work';
        if (isWork) logStat('focus', Math.floor(tm.durationMs / 60000));
        
        // Auto-switch pomodoro state
        const nextState = isWork ? 'break' : 'work';
        const nextMs = isWork ? (tm.pomodoroBreakMs || 5 * 60000) : (tm.pomodoroWorkMs || 25 * 60000);
        
        await update({ 
          id: tm._id, 
          durationMs: nextMs, 
          baseTimeMs: nextMs,
          pomodoroState: nextState,
          name: nextState === 'work' ? 'Deep Focus' : 'Break Time',
          colorKey: nextState === 'work' ? 'red' : 'green',
          isFinished: false // Ensure it's not finished
        });
        
        // Optionally show alert OR just auto-start
        // Alert.alert(isWork ? 'Focus Session Complete!' : 'Break Complete!', 'Starting the next phase.');
        await toggle({ id: tm._id, isRunning: true });
      } else {
        await update({ id: tm._id, isFinished: true });
        Alert.alert('Timer Finished!', `Your timer "${tm.name}" has completed!`);
      }
    });
  }, [timers, toggle, update]); // Added toggle/update to deps although they are likely stable

  const deleteTimer = (id: string) => {
    const tm = timers.find(t => t._id === id);
    if (tm?.isPomodoro) endPomodoroActivity();
    remove({ id });
  };
  const handleToggle = (id: string, isRunning: boolean) => {
    const tm = timers.find(t => t._id === id);
    if (tm?.isPomodoro) {
       const displayTime = tm.baseTimeMs - (tm.startTimeMs ? (Date.now() - tm.startTimeMs) : 0);
       updatePomodoroActivity(!isRunning, tm.pomodoroState === 'work' ? 'Work' : 'Break', new Date(Date.now() + displayTime));
    }
    toggle({ id, isRunning });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <SyncStatusIndicator />
      <FlatList
        data={timers}
        ListHeaderComponent={<AdBanner onPress={() => setProModalVisible(true)} />}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <TimerCard 
            timer={item} 
            onDelete={deleteTimer}
            onToggle={handleToggle}
            onReset={(id) => reset({ id })}
            onUpdate={(id, patch) => update({ id, ...patch })}
            onPickColor={(id) => { setSelectedId(id); setPickerVisible(true); }}
            onAddTime={(id, mins, secs) => {
              const delta = (mins * 60 + secs) * 1000;
              update({ id, baseTimeMs: item.baseTimeMs + delta });
            }}
            onSubTime={(id, mins, secs) => {
              const delta = (mins * 60 + secs) * 1000;
              update({ id, baseTimeMs: Math.max(0, item.baseTimeMs - delta) });
            }}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemeText variant="h2" colorKey="subtext0">No Timers</ThemeText>
            <ThemeText style={{ marginTop: 8 }} colorKey="subtext1">Tap the + button to add one.</ThemeText>
          </View>
        }
      />
      
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: colors.surface1, marginRight: 16 }]} 
          onPress={() => setPomoConfigVisible(true)}
        >
          <Ionicons name="flame" size={24} color={colors.red} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: colors.mauve }]} 
          onPress={() => addTimer(1)} // Default to 1 min for new FAB
        >
          <Ionicons name="add" size={32} color={colors.base} />
        </TouchableOpacity>
      </View>

      {pomoConfigVisible && (
        <Modal visible={pomoConfigVisible} transparent animationType="fade">
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <View style={[styles.pomoConfigBox, { backgroundColor: colors.base, borderColor: colors.crust }]}>
              <Ionicons name="flame" size={48} color={colors.red} style={{ marginBottom: 16 }} />
              <ThemeText variant="h2" style={{ marginBottom: 8, textAlign: 'center' }}>Focus Settings</ThemeText>
              <ThemeText variant="body" colorKey="subtext0" style={{ textAlign: 'center', marginBottom: 24 }}>
                Customize your Pomodoro intervals for maximum productivity.
              </ThemeText>

              <View style={styles.pomoRow}>
                <View style={styles.pomoInputCol}>
                  <ThemeText variant="caption" colorKey="text" style={{ fontWeight: 'bold', marginBottom: 8 }}>WORK (MIN)</ThemeText>
                  <TextInput
                    style={[styles.pomoInput, { backgroundColor: colors.surface0, color: colors.text }]}
                    keyboardType="numeric"
                    value={pomoWorkMin}
                    onChangeText={setPomoWorkMin}
                  />
                </View>

                <View style={styles.pomoInputCol}>
                  <ThemeText variant="caption" colorKey="text" style={{ fontWeight: 'bold', marginBottom: 8 }}>BREAK (MIN)</ThemeText>
                  <TextInput
                    style={[styles.pomoInput, { backgroundColor: colors.surface0, color: colors.text }]}
                    keyboardType="numeric"
                    value={pomoBreakMin}
                    onChangeText={setPomoBreakMin}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', width: '100%', marginTop: 32 }}>
                <TouchableOpacity style={[styles.pomoBtn, { backgroundColor: colors.surface1, flex: 1, marginRight: 8 }]} onPress={() => setPomoConfigVisible(false)}>
                  <ThemeText variant="body" colorKey="text">Cancel</ThemeText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pomoBtn, { backgroundColor: colors.red, flex: 1, marginLeft: 8 }]} onPress={addPomodoroTimer}>
                  <ThemeText variant="body" colorKey="base" style={{ fontWeight: 'bold' }}>Start Focus</ThemeText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {selectedId && (
        <ThemeColorPicker
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          selectedColorKey={timers.find(t => t._id === selectedId)?.colorKey as keyof ThemeColors}
          onSelectColor={(colorKey) => {
            update({ id: selectedId, colorKey });
          }}
        />
      )}

      <ProUpgradeModal 
        visible={proModalVisible} 
        onClose={() => setProModalVisible(false)} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100, flexGrow: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  },
  nameInput: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  timeContainer: {
    alignItems: 'center',
    marginVertical: 12,
    minHeight: 80,
    justifyContent: 'center',
  },
  timeText: {
    fontVariant: ['tabular-nums'],
    fontSize: 56,
    fontWeight: 'bold',
  },
  finishedText: {
    position: 'absolute',
    fontWeight: '900',
  },
  timeAdders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  timeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
  },
  fab: {
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pomoConfigBox: {
    width: '100%',
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
  },
  pomoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  pomoInputCol: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  pomoInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    paddingVertical: 16,
    borderRadius: 16,
  },
  pomoBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pomoBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  }
});
