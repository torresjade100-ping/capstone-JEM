import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * JemHexBadge - Renders the iconic orange hexagon badge with bold "JEM" text.
 */
export function JemHexBadge({ size = 36, color = '#f97316' }) {
  const width = size;
  const height = Math.round(size * 1.12);

  return (
    <View style={[styles.badgeContainer, { width, height }]}>
      <Svg width={width} height={height} viewBox="0 0 100 112" style={StyleSheet.absoluteFill}>
        <Path
          d="M50 10 L88 32 L88 80 L50 102 L12 80 L12 32 Z"
          fill={color}
          stroke={color}
          strokeWidth="10"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
      <Text
        style={[
          styles.badgeText,
          {
            fontSize: Math.round(size * 0.31),
          },
        ]}
        accessibilityRole="text"
      >
        JEM
      </Text>
    </View>
  );
}

/**
 * JemBrandLogo - Hexagon badge + "JEM Hardware" & "& Construction Supply"
 */
export function JemBrandLogo({
  size = 36,
  theme = 'dark', // 'dark' (for navy headers) or 'light' (for white backgrounds)
  style,
  subtitleColor,
}) {
  const isDark = theme === 'dark';

  return (
    <View style={[styles.brandContainer, style]}>
      <JemHexBadge size={size} />
      <View style={styles.brandTextBox}>
        <Text style={[styles.brandTitle, { color: isDark ? '#ffffff' : '#242A4E' }]}>
          JEM Hardware
        </Text>
        <Text
          style={[
            styles.brandSubtitle,
            { color: subtitleColor || '#f97316' },
          ]}
        >
          & Construction Supply
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
    includeFontPadding: false,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTextBox: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 19,
  },
  brandSubtitle: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: -0.1,
    lineHeight: 15,
    marginTop: 1,
  },
});

export default JemBrandLogo;
