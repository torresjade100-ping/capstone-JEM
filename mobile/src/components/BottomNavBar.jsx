import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles/appStyles';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'categories', label: 'Categories', icon: '⊞' },
  { id: 'cart', label: 'Cart', icon: '👜' },
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
            style={styles.navItem}
            onPress={() => onTabSelect(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 22 }}>{tab.icon}</Text>
            <Text style={[styles.navText, isActive && styles.navTextActive]}>
              {tab.label}
            </Text>
            {badge > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
