import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { ThemeText } from '../components/ThemeText';
import { ThemeColorPicker } from '../components/ThemeColorPicker';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useSync } from '../context/SyncContext';
import { useSyncedClock } from '../hooks/useSyncedClock';
import { Doc, Id } from '../../convex/_generated/dataModel';

const COLOR_OPTIONS: (keyof ThemeColors)[] = ['blue', 'lavender', 'sapphire', 'sky', 'teal', 'green', 'yellow', 'peach', 'maroon', 'red', 'mauve', 'pink', 'flamingo', 'rosewater'];

const formatTime = (ms: number) => {
  const date = new Date(ms);
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  const centiseconds = Math.floor(date.getUTCMilliseconds() / 10).toString().padStart(2, '0');
  return `${minutes}:${seconds}.${centiseconds}`;
};

const StopwatchCard = ({ 
  sw, 
  onDelete, 
  onToggle, 
  onReset, 
  onUpdate, 
  onPickColor,
  onAddLap
}: { 
  sw: Doc<"stopwatches">;
  onDelete: (id: Id<"stopwatches">) => void;
  onToggle: (id: Id<"stopwatches">, isRunning: boolean) => void;
  onReset: (id: Id<"stopwatches">) => void;
  onUpdate: (id: Id<"stopwatches">, patch: any) => void;
  onPickColor: (id: Id<"stopwatches">) => void;
  onAddLap: (id: Id<"stopwatches">, timeMs: number) => void;
}) => {
  const { colors } = useTheme();
  const laps = useQuery(api.db.getStopwatchLaps, { stopwatchId: sw._id }) || [];
  const displayTime = useSyncedClock({
    startTimeMs: sw.startTimeMs,
    baseTimeMs: sw.baseTimeMs,
    isRunning: sw.isRunning,
    type: 'stopwatch'
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface0, shadowColor: colors.crust }]}>
      <View style={styles.cardHeader}>
        <TextInput
          style={[styles.nameInput, { color: colors.text }]}
          value={sw.name}
          onChangeText={(text) => onUpdate(sw._id, { name: text })}
          placeholderTextColor={colors.subtext0}
        />
        <TouchableOpacity onPress={() => onDelete(sw._id)}>
          <Ionicons name="close" size={24} color={colors.subtext0} />
        </TouchableOpacity>
      </View>

      <View style={styles.timeContainer}>
        <ThemeText style={styles.timeText} colorKey={sw.colorKey as keyof ThemeColors}>{formatTime(displayTime)}</ThemeText>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface1 }]} onPress={() => onPickColor(sw._id)}>
          <View style={[styles.colorDot, { backgroundColor: colors[sw.colorKey as keyof ThemeColors] }]} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface1 }]} onPress={() => sw.isRunning ? onAddLap(sw._id, displayTime) : onReset(sw._id)}>
          <Ionicons name={sw.isRunning ? "flag" : "refresh"} size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.playButton, { backgroundColor: colors[sw.colorKey as keyof ThemeColors], shadowColor: colors.crust }]} onPress={() => onToggle(sw._id, !sw.isRunning)}>
          <Ionicons name={sw.isRunning ? "pause" : "play"} size={24} color={colors.base} />
        </TouchableOpacity>
      </View>

      {laps.length > 0 && (
        <View style={styles.lapsContainer}>
          {laps.slice(0, 3).map((lap, index) => (
            <View key={lap._id} style={[styles.lapRow, { borderBottomColor: colors.surface1 }]}>
              <ThemeText variant="caption" colorKey="subtext0">Lap {laps.length - index}</ThemeText>
              <ThemeText variant="body" colorKey="text">{formatTime(lap.timeMs)}</ThemeText>
            </View>
          ))}
          {laps.length > 3 && (
            <ThemeText variant="caption" colorKey="subtext0" style={styles.moreLaps}>+{laps.length - 3} more</ThemeText>
          )}
        </View>
      )}
    </View>
  );
};

export const StopwatchScreen = () => {
  const { colors } = useTheme();
  const { syncCode } = useSync();
  
  const stopwatches = useQuery(api.db.getStopwatches, { deviceId: syncCode }) || [];
  const createStopwatchMutable = useMutation(api.db.createStopwatch);
  const deleteStopwatchMutable = useMutation(api.db.deleteStopwatch);
  const toggleStopwatchMutable = useMutation(api.db.toggleStopwatch);
  const resetStopwatchMutable = useMutation(api.db.resetStopwatch);
  const addStopwatchLapMutable = useMutation(api.db.addStopwatchLap);
  // We'll use a generic update mutation if available or just update color/name
  // @ts-ignore - we'll handle this in the card
  const updateStopwatchMutable = useMutation(api.db.updateStopwatch);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"stopwatches"> | null>(null);

  const addStopwatch = () => {
    const randomColor = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)];
    createStopwatchMutable({
      deviceId: syncCode,
      name: `Stopwatch ${stopwatches.length + 1}`,
      colorKey: randomColor,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <FlatList
        data={stopwatches}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <StopwatchCard 
            sw={item} 
            onDelete={(id) => deleteStopwatchMutable({ id })}
            onToggle={(id, isRunning) => toggleStopwatchMutable({ id, isRunning, now: Date.now() })}
            onReset={(id) => resetStopwatchMutable({ id })}
            onUpdate={(id, patch) => updateStopwatchMutable ? updateStopwatchMutable({ id, ...patch }) : null}
            onPickColor={(id) => { setSelectedId(id); setPickerVisible(true); }}
            onAddLap={(id, timeMs) => addStopwatchLapMutable({ stopwatchId: id, timeMs })}
          />
        )}
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
          selectedColorKey={stopwatches.find(s => s._id === selectedId)?.colorKey as keyof ThemeColors}
          onSelectColor={(colorKey) => {
            if (updateStopwatchMutable) updateStopwatchMutable({ id: selectedId, colorKey });
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
