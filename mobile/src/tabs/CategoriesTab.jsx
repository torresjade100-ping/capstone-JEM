import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles/appStyles';

export default function CategoriesTab({
  categories,
  onSelectCategory,
}) {
  return (
    <View>
      <View style={styles.categoriesHeader}>
        <Text style={styles.categoriesHeaderTitle}>Shop by Category</Text>
        <Text style={styles.categoriesHeaderSubtitle}>Find what you need for your project</Text>
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        {categories.map((cat, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.categoryRowCard}
            onPress={() => onSelectCategory(cat.id, cat.title)}
          >
            <View style={[styles.categoryRowIconBox, { backgroundColor: cat.bg }]}>
              <Text style={{ fontSize: 26 }}>{cat.icon}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.categoryRowTitle}>{cat.title}</Text>
              <Text style={styles.categoryRowCount}>{cat.count} products available</Text>
            </View>
            <Text style={styles.categoryRowChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
