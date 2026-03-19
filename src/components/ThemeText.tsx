import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ThemeTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'body' | 'caption';
  colorKey?: keyof ReturnType<typeof useTheme>['colors'];
}

export const ThemeText = ({ style, variant = 'body', colorKey = 'text', ...props }: ThemeTextProps) => {
  const { colors } = useTheme();

  return (
    <Text
      style={[
        styles[variant],
        { color: colors[colorKey] },
        style,
      ]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: '600' },
  body: { fontSize: 16 },
  caption: { fontSize: 12 },
});
