import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { useTheme } from '../theme/ThemeContext';
import { ThemeText } from '../components/ThemeText';
import { ThemeColorPicker } from '../components/ThemeColorPicker';

type CityData = {
  id: string;
  name: string;
  timezone: string;
  colorKey: keyof ReturnType<typeof useTheme>['colors'];
};

const initialCities: CityData[] = [
  { id: '1', name: 'San Francisco', timezone: 'America/Los_Angeles', colorKey: 'sapphire' },
  { id: '2', name: 'New York', timezone: 'America/New_York', colorKey: 'blue' },
  { id: '3', name: 'London', timezone: 'Europe/London', colorKey: 'mauve' },
  { id: '4', name: 'Tokyo', timezone: 'Asia/Tokyo', colorKey: 'peach' },
];

export const WorldClockScreen = () => {
  const { colors } = useTheme();
  const [cities, setCities] = useState<CityData[]>(initialCities);
  const [now, setNow] = useState(new Date());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const renderItem = ({ item, drag, isActive }: RenderItemParams<CityData>) => {
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
          setSelectedCityId(item.id);
          setPickerVisible(true);
        }}
        onLongPress={drag}
        activeOpacity={0.8}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface0,
            borderColor: isActive ? colors[item.colorKey] : 'transparent',
            borderWidth: isActive ? 2 : 0,
            shadowColor: colors.crust,
          },
        ]}
      >
        <View style={styles.cardInfo}>
          <ThemeText variant="h2" colorKey={item.colorKey}>{item.name}</ThemeText>
          <ThemeText style={styles.caption} variant="caption" colorKey="subtext0">{dateString}</ThemeText>
        </View>
        <ThemeText variant="h1" colorKey="text">{timeString}</ThemeText>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <DraggableFlatList
        data={cities}
        onDragEnd={({ data }) => setCities(data)}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
      {selectedCityId && (
        <ThemeColorPicker
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          selectedColorKey={cities.find(c => c.id === selectedCityId)?.colorKey}
          onSelectColor={(colorKey) => {
            setCities(prev => prev.map(c => c.id === selectedCityId ? { ...c, colorKey } : c));
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },
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
  caption: {
    marginTop: 6,
  }
});
