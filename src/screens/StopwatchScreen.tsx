import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { ThemeText } from '../components/ThemeText';
import { ThemeColorPicker } from '../components/ThemeColorPicker';
import { Ionicons } from '@expo/vector-icons';

type Lap = {
  id: string;
  timeMs: number;
};

type Stopwatch = {
  id: string;
  name: string;
  colorKey: keyof ThemeColors;
  isRunning: boolean;
  timeMs: number;
  lastTickTime: number;
  laps: Lap[];
};

const COLOR_OPTIONS: (keyof ThemeColors)[] = ['blue', 'lavender', 'sapphire', 'sky', 'teal', 'green', 'yellow', 'peach', 'maroon', 'red', 'mauve', 'pink', 'flamingo', 'rosewater'];

const formatTime = (ms: number) => {
  const date = new Date(ms);
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  const centiseconds = Math.floor(date.getUTCMilliseconds() / 10).toString().padStart(2, '0');
  return `${minutes}:${seconds}.${centiseconds}`;
};

export const StopwatchScreen = () => {
  const { colors } = useTheme();
  const [stopwatches, setStopwatches] = useState<Stopwatch[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setStopwatches(prev => prev.map(sw => {
        if (!sw.isRunning) return sw;
        const now = Date.now();
        const delta = now - sw.lastTickTime;
        return { ...sw, timeMs: sw.timeMs + delta, lastTickTime: now };
      }));
    }, 10);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const addStopwatch = () => {
    const randomColor = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)];
    const newSw: Stopwatch = {
      id: Date.now().toString(),
      name: `Stopwatch ${stopwatches.length + 1}`,
      colorKey: randomColor,
      isRunning: false,
      timeMs: 0,
      lastTickTime: Date.now(),
      laps: [],
    };
    setStopwatches(prev => [...prev, newSw]);
  };

  const deleteSw = (id: string) => {
    setStopwatches(prev => prev.filter(sw => sw.id !== id));
  };

  const toggleRun = (id: string) => {
    setStopwatches(prev => prev.map(sw => {
      if (sw.id !== id) return sw;
      return { 
        ...sw, 
        isRunning: !sw.isRunning, 
        lastTickTime: !sw.isRunning ? Date.now() : sw.lastTickTime 
      };
    }));
  };

  const resetSw = (id: string) => {
    setStopwatches(prev => prev.map(sw => {
      if (sw.id !== id) return sw;
      return { ...sw, isRunning: false, timeMs: 0, laps: [] };
    }));
  };

  const addLap = (id: string) => {
    setStopwatches(prev => prev.map(sw => {
      if (sw.id !== id) return sw;
      const newLap = { id: Date.now().toString(), timeMs: sw.timeMs };
      return { ...sw, laps: [newLap, ...sw.laps] };
    }));
  };

  const renderItem = ({ item }: { item: Stopwatch }) => {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface0, shadowColor: colors.crust }]}>
        <View style={styles.cardHeader}>
          <TextInput
            style={[styles.nameInput, { color: colors.text }]}
            value={item.name}
            onChangeText={(text) => setStopwatches(prev => prev.map(s => s.id === item.id ? { ...s, name: text } : s))}
            placeholderTextColor={colors.subtext0}
          />
          <TouchableOpacity onPress={() => deleteSw(item.id)}>
            <Ionicons name="close" size={24} color={colors.subtext0} />
          </TouchableOpacity>
        </View>

        <View style={styles.timeContainer}>
          <ThemeText style={styles.timeText} colorKey={item.colorKey}>{formatTime(item.timeMs)}</ThemeText>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface1 }]} onPress={() => { setSelectedId(item.id); setPickerVisible(true); }}>
            <View style={[styles.colorDot, { backgroundColor: colors[item.colorKey] }]} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface1 }]} onPress={() => item.isRunning ? addLap(item.id) : resetSw(item.id)}>
            <Ionicons name={item.isRunning ? "flag" : "refresh"} size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.playButton, { backgroundColor: colors[item.colorKey], shadowColor: colors.crust }]} onPress={() => toggleRun(item.id)}>
            <Ionicons name={item.isRunning ? "pause" : "play"} size={24} color={colors.base} />
          </TouchableOpacity>
        </View>

        {item.laps.length > 0 && (
          <View style={styles.lapsContainer}>
            {item.laps.slice(0, 3).map((lap, index) => (
              <View key={lap.id} style={[styles.lapRow, { borderBottomColor: colors.surface1 }]}>
                <ThemeText variant="caption" colorKey="subtext0">Lap {item.laps.length - index}</ThemeText>
                <ThemeText variant="body" colorKey="text">{formatTime(lap.timeMs)}</ThemeText>
              </View>
            ))}
            {item.laps.length > 3 && (
              <ThemeText variant="caption" colorKey="subtext0" style={styles.moreLaps}>+{item.laps.length - 3} more</ThemeText>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <FlatList
        data={stopwatches}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemeText variant="h2" colorKey="subtext0">No Stopwatches</ThemeText>
            <ThemeText style={{ marginTop: 8 }} colorKey="subtext1">Tap the + button to add one.</ThemeText>
          </View>
        }
      />

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.mauve, shadowColor: colors.crust }]} 
        onPress={addStopwatch}
      >
        <Ionicons name="add" size={32} color={colors.base} />
      </TouchableOpacity>

      {selectedId && (
        <ThemeColorPicker
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          selectedColorKey={stopwatches.find(s => s.id === selectedId)?.colorKey}
          onSelectColor={(colorKey) => {
            setStopwatches(prev => prev.map(s => s.id === selectedId ? { ...s, colorKey } : s));
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
    marginBottom: 16,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  timeContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timeText: {
    fontVariant: ['tabular-nums'],
    fontSize: 48,
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
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
  lapsContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  lapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  moreLaps: {
    textAlign: 'center',
    marginTop: 8,
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
