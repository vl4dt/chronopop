import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { ThemeText } from '../components/ThemeText';
import { ThemeColorPicker } from '../components/ThemeColorPicker';
import { Ionicons } from '@expo/vector-icons';
import { useSync } from '../context/SyncContext';
import { usePersistentStopwatches } from '../hooks/usePersistentData';
import { useSyncedClock } from '../hooks/useSyncedClock';
import { ProUpgradeModal } from '../components/ProUpgradeModal';
import { AdBanner } from '../components/AdBanner';
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';

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
  sw: any;
  onDelete: (id: string) => void;
  onToggle: (id: string, isRunning: boolean) => void;
  onReset: (id: string) => void;
  onUpdate: (id: string, patch: any) => void;
  onPickColor: (id: string) => void;
  onAddLap: (id: string, timeMs: number) => void;
}) => {
  const { colors } = useTheme();
  
  // Always use embedded laps in local-only mode
  const laps = sw.laps || [];

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
          {laps.slice(0, 3).map((lap: { _id: string, timeMs: number }, index: number) => (
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
  const { syncCode, isPro } = useSync();
  
  const { stopwatches, create, remove, toggle, reset, addLap, update } = usePersistentStopwatches();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [proModalVisible, setProModalVisible] = useState(false);

  const addStopwatch = () => {
    if (!isPro && stopwatches.length >= 1) {
      setProModalVisible(true);
      return;
    }
    const randomColor = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)];
    create({
      deviceId: syncCode,
      name: `Stopwatch ${stopwatches.length + 1}`,
      colorKey: randomColor,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <SyncStatusIndicator />
      <FlatList
        data={stopwatches}
        ListHeaderComponent={<AdBanner onPress={() => setProModalVisible(true)} />}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <StopwatchCard 
            sw={item} 
            onDelete={(id) => remove({ id })}
            onToggle={(id, isRunning) => toggle({ id, isRunning })}
            onReset={(id) => reset({ id })}
            onUpdate={(id, patch) => update({ id, ...patch })}
            onPickColor={(id) => { setSelectedId(id); setPickerVisible(true); }}
            onAddLap={(id, timeMs) => addLap({ stopwatchId: id, timeMs })}
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
  listContent: { padding: 16, paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
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
