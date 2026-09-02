import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles/appStyles';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'categories', label: 'Products', icon: '⊞' },
  { id: 'cart', label: 'Cart', icon: '🛒' },
  { id: 'orders', label: 'Orders', icon: '📦' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function BottomNavBar({ activeTab, onTabSelect, cartCount = 0 }) {
  return (
    <View style={styles.bottomNav}>
      {NAV_ITEMS.map((tab) => {
        const badge = tab.id === 'cart' ? cartCount : 0;
        const isActive = activeTab === tab.id;

        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.navItem, isActive && styles.navPillActive]}
            onPress={() => onTabSelect(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: isActive ? 22 : 20 }}>{tab.icon}</Text>
            <Text style={[styles.navText, isActive && styles.navTextActive]}>
              {tab.label}
            </Text>
            {badge > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{badge > 99 ? '99+' : badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
