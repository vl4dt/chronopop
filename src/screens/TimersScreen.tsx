import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { ThemeText } from '../components/ThemeText';
import { ThemeColorPicker } from '../components/ThemeColorPicker';
import { Ionicons } from '@expo/vector-icons';

type Timer = {
  id: string;
  name: string;
  colorKey: keyof ThemeColors;
  pattern: number; // For different haptic patterns
  originalDurationMs: number;
  timeRemainingMs: number;
  isRunning: boolean;
  lastTickTime: number;
  isFinished: boolean;
};

const COLOR_OPTIONS: (keyof ThemeColors)[] = ['blue', 'sapphire', 'teal', 'green', 'yellow', 'peach', 'red', 'mauve', 'pink'];

const formatTime = (ms: number) => {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const TimersScreen = () => {
  const { colors } = useTheme();
  const [timers, setTimers] = useState<Timer[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setTimers(prev => prev.map(tm => {
        if (!tm.isRunning || tm.isFinished) return tm;
        
        const now = Date.now();
        const delta = now - tm.lastTickTime;
        const newRemaining = Math.max(0, tm.timeRemainingMs - delta);
        
        if (newRemaining === 0) {
          playHapticPattern(tm.pattern);
          return { ...tm, timeRemainingMs: 0, isRunning: false, isFinished: true, lastTickTime: now };
        }
        
        return { ...tm, timeRemainingMs: newRemaining, lastTickTime: now };
      }));
    }, 50);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const playHapticPattern = (pattern: number) => {
    // Fire-and-forget haptic sequences to emulate different "sounds"
    if (pattern === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (pattern === 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const addTimer = () => {
    const randomColor = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)];
    const pattern = Math.floor(Math.random() * 3);
    const newTm: Timer = {
      id: Date.now().toString(),
      name: `Timer ${timers.length + 1}`,
      colorKey: randomColor,
      pattern,
      originalDurationMs: 60 * 1000, // 1 min default
      timeRemainingMs: 60 * 1000,
      isRunning: false,
      lastTickTime: Date.now(),
      isFinished: false,
    };
    setTimers(prev => [...prev, newTm]);
  };

  const deleteTm = (id: string) => {
    setTimers(prev => prev.filter(tm => tm.id !== id));
  };

  const toggleRun = (id: string) => {
    setTimers(prev => prev.map(tm => {
      if (tm.id !== id) return tm;
      if (tm.isFinished) {
        // Restart
        return { ...tm, isFinished: false, isRunning: true, timeRemainingMs: tm.originalDurationMs, lastTickTime: Date.now() };
      }
      return { 
        ...tm, 
        isRunning: !tm.isRunning, 
        lastTickTime: !tm.isRunning ? Date.now() : tm.lastTickTime 
      };
    }));
  };

  const resetTm = (id: string) => {
    setTimers(prev => prev.map(tm => {
      if (tm.id !== id) return tm;
      return { ...tm, isRunning: false, isFinished: false, timeRemainingMs: tm.originalDurationMs };
    }));
  };

  const addTime = (id: string, mins: number, secs: number) => {
    setTimers(prev => prev.map(tm => {
      if (tm.id !== id) return tm;
      const addMs = (mins * 60 + secs) * 1000;
      const newDuration = tm.originalDurationMs + addMs;
      // If adding time when finished, unfinish it
      if (tm.isFinished) {
        return { ...tm, originalDurationMs: newDuration, timeRemainingMs: addMs, isFinished: false };
      }
      return { ...tm, originalDurationMs: newDuration, timeRemainingMs: tm.timeRemainingMs + addMs };
    }));
  };
  
  const subTime = (id: string, mins: number, secs: number) => {
    setTimers(prev => prev.map(tm => {
      if (tm.id !== id) return tm;
      const subMs = (mins * 60 + secs) * 1000;
      const newDuration = Math.max(0, tm.originalDurationMs - subMs);
      const newRemaining = Math.max(0, tm.timeRemainingMs - subMs);
      return { ...tm, originalDurationMs: newDuration, timeRemainingMs: newRemaining };
    }));
  };

  const renderItem = ({ item }: { item: Timer }) => {
    return (
      <View style={[
        styles.card, 
        { 
          backgroundColor: colors.surface0, 
          shadowColor: colors.crust,
          borderColor: item.isFinished ? colors[item.colorKey] : 'transparent',
          borderWidth: item.isFinished ? 2 : 0,
        }
      ]}>
        <View style={styles.cardHeader}>
          <TextInput
            style={[styles.nameInput, { color: colors.text }]}
            value={item.name}
            onChangeText={(text) => setTimers(prev => prev.map(t => t.id === item.id ? { ...t, name: text } : t))}
            placeholderTextColor={colors.subtext0}
          />
          <TouchableOpacity onPress={() => deleteTm(item.id)}>
            <Ionicons name="close" size={24} color={colors.subtext0} />
          </TouchableOpacity>
        </View>

        <View style={styles.timeContainer}>
          <ThemeText style={[styles.timeText, { opacity: item.isFinished ? 0.3 : 1 }]} colorKey={item.colorKey}>
            {formatTime(item.timeRemainingMs)}
          </ThemeText>
          {item.isFinished && (
            <ThemeText style={styles.finishedText} colorKey={item.colorKey} variant="h2">Times Up!</ThemeText>
          )}
        </View>

        {!item.isRunning && !item.isFinished && (
          <View style={styles.timeAdders}>
            <TouchableOpacity style={[styles.timeBtn, { backgroundColor: colors.surface1 }]} onPress={() => subTime(item.id, 1, 0)}>
              <ThemeText variant="caption">-1m</ThemeText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.timeBtn, { backgroundColor: colors.surface1 }]} onPress={() => addTime(item.id, 0, 15)}>
              <ThemeText variant="caption">+15s</ThemeText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.timeBtn, { backgroundColor: colors.surface1 }]} onPress={() => addTime(item.id, 1, 0)}>
              <ThemeText variant="caption">+1m</ThemeText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.timeBtn, { backgroundColor: colors.surface1 }]} onPress={() => addTime(item.id, 5, 0)}>
              <ThemeText variant="caption">+5m</ThemeText>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.controls}>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface1 }]} onPress={() => { setSelectedId(item.id); setPickerVisible(true); }}>
            <View style={[styles.colorDot, { backgroundColor: colors[item.colorKey] }]} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface1 }]} onPress={() => resetTm(item.id)}>
            <Ionicons name="refresh" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.playButton, { backgroundColor: colors[item.colorKey], shadowColor: colors.crust }]} onPress={() => toggleRun(item.id)}>
            <Ionicons name={item.isRunning ? "pause" : (item.isFinished ? "refresh" : "play")} size={24} color={colors.base} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <FlatList
        data={timers}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemeText variant="h2" colorKey="subtext0">No Timers</ThemeText>
            <ThemeText style={{ marginTop: 8 }} colorKey="subtext1">Tap the + button to add one.</ThemeText>
          </View>
        }
      />

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.mauve, shadowColor: colors.crust }]} 
        onPress={addTimer}
      >
        <Ionicons name="add" size={32} color={colors.base} />
      </TouchableOpacity>

      {selectedId && (
        <ThemeColorPicker
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          selectedColorKey={timers.find(t => t.id === selectedId)?.colorKey}
          onSelectColor={(colorKey) => {
            setTimers(prev => prev.map(t => t.id === selectedId ? { ...t, colorKey } : t));
          }}
        />
      )}
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
  }
});
