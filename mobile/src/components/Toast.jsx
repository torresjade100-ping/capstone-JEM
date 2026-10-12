import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PALETTE, SHADOWS } from './ui/theme';

const USE_NATIVE = Platform.OS !== 'web';

// Strip leading/trailing emoji from legacy toast messages; icon is rendered separately.
const EMOJI_EDGE = '[\\uD800-\\uDFFF\\u2600-\\u27BF\\u2B00-\\u2BFF\\uFE0F\\u200D\\s•]+';
const LEADING = new RegExp(`^${EMOJI_EDGE}`);
const TRAILING = new RegExp(`${EMOJI_EDGE}$`);
const cleanMessage = (msg = '') => String(msg).replace(LEADING, '').replace(TRAILING, '').trim();

const pickIcon = (msg = '') => {
  const m = msg.toLowerCase();
  if (m.includes('❌') || m.includes('invalid') || m.includes('error') || m.includes('fail') || m.includes('out of stock'))
    return { name: 'alert-circle', color: '#F87171' };
  if (m.includes('⚠️') || m.includes('max') || m.includes('cannot')) return { name: 'warning', color: '#FBBF24' };
  if (m.includes('wishlist')) return { name: 'heart', color: '#F87171' };
  if (m.includes('cart')) return { name: 'cart', color: PALETTE.orange400 };
  return { name: 'checkmark-circle', color: '#34D399' };
};

export default function Toast({ message }) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(message);

  useEffect(() => {
    if (message) {
      setShown(message);
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: USE_NATIVE, speed: 16, bounciness: 8 }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: USE_NATIVE }).start(() => setShown(''));
    }
  }, [message]);

  if (!shown) return null;
  const icon = pickIcon(shown);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.wrap,
        { top: insets.top + 10 },
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
          ],
        },
      ]}
    >
      <View style={[s.pill, SHADOWS.raised]}>
        <View style={[s.iconWrap, { backgroundColor: `${icon.color}22` }]}>
          <Ionicons name={icon.name} size={16} color={icon.color} />
        </View>
        <Text style={s.text} numberOfLines={2}>{cleanMessage(shown) || shown}</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 9999, elevation: 30, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 420,
    backgroundColor: 'rgba(14, 22, 40, 0.97)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 16,
    borderRadius: 18,
  },
  iconWrap: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  text: { flexShrink: 1, color: '#FFFFFF', fontSize: 13, fontWeight: '700', lineHeight: 18 },
});
