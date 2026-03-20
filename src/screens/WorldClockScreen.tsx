import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { useTheme } from '../theme/ThemeContext';
import { ThemeText } from '../components/ThemeText';
import { ThemeColorPicker } from '../components/ThemeColorPicker';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useSync } from '../context/SyncContext';
import { Doc, Id } from '../../convex/_generated/dataModel';
import { WORLD_CITIES as TIMEZONES } from '../data/cities';

export const WorldClockScreen = () => {
  const { colors } = useTheme();
  const { syncCode } = useSync();
  const [now, setNow] = useState(new Date());
  
  const cloudCities = useQuery(api.db.getWorldClocks, { deviceId: syncCode }) || [];
  const sortedCities = useMemo(() => [...cloudCities].sort((a, b) => a.order - b.order), [cloudCities]);

  const createCityMutable = useMutation(api.db.createWorldClock);
  const deleteCityMutable = useMutation(api.db.deleteWorldClock);
  const updateCityMutable = useMutation(api.db.updateWorldClock);
  const reorderCitiesMutable = useMutation(api.db.reorderWorldClocks);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState<Id<"worldClocks"> | null>(null);
  
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const addCity = (city: typeof TIMEZONES[0]) => {
    createCityMutable({
      deviceId: syncCode,
      name: city.name,
      timezone: city.zone,
      colorKey: 'blue',
      order: cloudCities.length,
    });
    setAddModalVisible(false);
    setSearch('');
  };

  const filteredTimezones = TIMEZONES.filter((t: { name: string; zone: string }) => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.zone.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Doc<"worldClocks">>) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: item.timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const timeString = formatter.format(now);
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: item.timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const dateString = dayFormatter.format(now);

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedCityId(item._id);
          setPickerVisible(true);
        }}
        onLongPress={drag}
        activeOpacity={0.8}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface0,
            borderColor: isActive ? colors[item.colorKey as keyof typeof colors] : 'transparent',
            borderWidth: isActive ? 2 : 0,
            shadowColor: colors.crust,
          },
        ]}
      >
        <View style={styles.cardInfo}>
          <ThemeText variant="h2" colorKey={item.colorKey as keyof typeof colors}>{item.name}</ThemeText>
          <ThemeText style={styles.caption} variant="caption" colorKey="subtext0">{dateString}</ThemeText>
        </View>
        <View style={styles.timeSection}>
          <ThemeText variant="h1" colorKey="text">{timeString}</ThemeText>
          <TouchableOpacity 
            style={styles.deleteBtn}
            onPress={() => deleteCityMutable({ id: item._id })}
          >
            <Ionicons name="trash-outline" size={20} color={colors.red} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const handleDragEnd = ({ data }: { data: Doc<"worldClocks">[] }) => {
    const shifts = data.map((c, i) => ({ id: c._id, order: i }));
    reorderCitiesMutable({ shifts });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <DraggableFlatList
        data={sortedCities}
        onDragEnd={handleDragEnd}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemeText variant="h2" colorKey="subtext0">No Cities</ThemeText>
            <ThemeText style={{ marginTop: 8 }} colorKey="subtext1">Tap the + button to add one.</ThemeText>
          </View>
        }
      />

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.mauve, shadowColor: colors.crust }]} 
        onPress={() => setAddModalVisible(true)}
      >
        <Ionicons name="add" size={32} color={colors.base} />
      </TouchableOpacity>

      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.base }]}>
            <View style={styles.modalHeader}>
              <ThemeText variant="h2">Add City</ThemeText>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.surface0, color: colors.text }]}
              placeholder="Search city or timezone..."
              placeholderTextColor={colors.subtext0}
              value={search}
              onChangeText={setSearch}
            />
            <FlatList
              data={filteredTimezones}
              keyExtractor={item => item.zone}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.timezoneRow, { borderBottomColor: colors.surface1 }]}
                  onPress={() => addCity(item)}
                >
                  <ThemeText variant="body">{item.name}</ThemeText>
                  <ThemeText variant="caption" colorKey="subtext0">{item.zone}</ThemeText>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {selectedCityId && (
        <ThemeColorPicker
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          selectedColorKey={cloudCities.find(c => c._id === selectedCityId)?.colorKey as any}
          onSelectColor={(colorKey) => {
            updateCityMutable({ id: selectedCityId, colorKey });
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  cardInfo: {
    flex: 1,
  },
  timeSection: {
    alignItems: 'flex-end',
  },
  deleteBtn: {
    marginTop: 8,
    padding: 4,
  },
  caption: {
    marginTop: 6,
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
    height: '80%',
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  searchInput: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  timezoneRow: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  }
});
