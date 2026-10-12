import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PALETTE, GRADIENTS, SHADOWS } from './ui/theme';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'categories', label: 'Shop', icon: 'grid' },
  { id: 'cart', label: 'Cart', icon: 'cart' },
  { id: 'orders', label: 'Orders', icon: 'receipt' },
  { id: 'profile', label: 'Profile', icon: 'person' },
];

const USE_NATIVE = Platform.OS !== 'web';

export default function BottomNavBar({ activeTab, onTabSelect, cartCount = 0, isDarkMode = false }) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const activeIndex = Math.max(0, NAV_ITEMS.findIndex((t) => t.id === activeTab));
  const slide = useRef(new Animated.Value(activeIndex)).current;
  const badgePop = useRef(new Animated.Value(1)).current;

  const itemWidth = barWidth > 0 ? (barWidth - 12) / NAV_ITEMS.length : 0;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: activeIndex,
      useNativeDriver: USE_NATIVE,
      speed: 18,
      bounciness: 7,
    }).start();
  }, [activeIndex]);

  // Pop the cart badge whenever the count changes
  useEffect(() => {
    if (cartCount <= 0) return;
    badgePop.setValue(0.6);
    Animated.spring(badgePop, { toValue: 1, useNativeDriver: USE_NATIVE, speed: 20, bounciness: 14 }).start();
  }, [cartCount]);

  const bg = isDarkMode ? 'rgba(21, 25, 34, 0.96)' : 'rgba(255, 255, 255, 0.97)';
  const border = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.06)';
  const idle = isDarkMode ? '#7C8597' : PALETTE.textFaint;

  return (
    <View pointerEvents="box-none" style={[s.wrap, { bottom: Math.max(insets.bottom, 10) }]}>
      <View
        style={[s.bar, SHADOWS.nav, { backgroundColor: bg, borderColor: border }]}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {itemWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              s.indicator,
              {
                width: itemWidth,
                transform: [{ translateX: Animated.multiply(slide, itemWidth) }],
              },
            ]}
          >
            <LinearGradient colors={GRADIENTS.orange} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.indicatorFill} />
          </Animated.View>
        )}

        {NAV_ITEMS.map((tab) => {
          const isActive = activeTab === tab.id;
          const badge = tab.id === 'cart' ? cartCount : 0;

          return (
            <Pressable key={tab.id} style={s.item} onPress={() => onTabSelect(tab.id)} hitSlop={4}>
              <View>
                <Ionicons
                  name={isActive ? tab.icon : `${tab.icon}-outline`}
                  size={22}
                  color={isActive ? '#FFFFFF' : idle}
                />
                {badge > 0 && (
                  <Animated.View style={[s.badge, { borderColor: isActive ? PALETTE.orange600 : bg, transform: [{ scale: badgePop }] }]}>
                    <Text style={s.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                  </Animated.View>
                )}
              </View>
              <Text style={[s.label, { color: isActive ? '#FFFFFF' : idle }, isActive && s.labelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14 },
  bar: {
    height: 68,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  indicator: { position: 'absolute', left: 6, top: 6, bottom: 6, paddingHorizontal: 3 },
  indicatorFill: { flex: 1, borderRadius: 20 },
  item: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.1 },
  labelActive: { fontWeight: '900' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: PALETTE.danger,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '900' },
});
