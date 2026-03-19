import React from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { ThemeText } from './ThemeText';

interface ThemeColorPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectColor: (colorKey: keyof ThemeColors) => void;
  selectedColorKey?: keyof ThemeColors;
}

const COLOR_KEYS: (keyof ThemeColors)[] = [
  'blue', 'lavender', 'sapphire', 'sky', 'teal', 'green', 'yellow', 
  'peach', 'maroon', 'red', 'mauve', 'pink', 'flamingo', 'rosewater'
];

export const ThemeColorPicker = ({ visible, onClose, onSelectColor, selectedColorKey }: ThemeColorPickerProps) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: colors.base, borderColor: colors.crust }]}>
          <ThemeText variant="h2" style={styles.title}>Pick a Color</ThemeText>
          <FlatList
            data={COLOR_KEYS}
            numColumns={4}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.colorCircle,
                  { 
                    backgroundColor: colors[item],
                    borderWidth: selectedColorKey === item ? 3 : 0,
                    borderColor: colors.text
                  }
                ]}
                onPress={() => {
                  onSelectColor(item);
                  onClose();
                }}
              />
            )}
            contentContainerStyle={styles.listContainer}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    minHeight: 300,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center'
  },
  listContainer: {
    alignItems: 'center',
  },
  colorCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    margin: 10,
  }
});
