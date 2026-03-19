import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeText } from './ThemeText';

interface ThemeButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const ThemeButton = ({ title, variant = 'primary', style, ...props }: ThemeButtonProps) => {
  const { colors } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary': return colors.mauve;
      case 'secondary': return colors.surface1;
      case 'danger': return colors.red;
      default: return colors.mauve;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary': return colors.base;
      case 'secondary': return colors.text;
      case 'danger': return colors.base;
      default: return colors.base;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        style as ViewStyle,
      ]}
      {...props}
    >
      <ThemeText
        style={[styles.text, { color: getTextColor() }]}
        variant="body"
      >
        {title}
      </ThemeText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: 'bold',
  },
});
