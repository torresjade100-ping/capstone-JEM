import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../styles/appStyles';

export default function HomeTab({
  searchQuery,
  setSearchQuery,
  categories,
  products,
  wishlist,
  toggleWishlist,
  addToCart,
  onSelectProduct,
  onSelectCategory,
  onOpenNotifications,
  onNavigateToCategories,
}) {
  return (
    <View>
      {/* Header with Search and Bell */}
      <View style={styles.homeHeader}>
        <View style={styles.homeHeaderTop}>
          <View>
            <Text style={styles.homeHeaderGreeting}>Good day! 👋</Text>
            <Text style={styles.homeHeaderBrand}>JEM Hardware</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={onOpenNotifications}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
            <View style={styles.bellBadgeDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.homeSearchBox}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={styles.homeSearchInput}
            placeholder="Search cement, drill, paint..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ color: '#94a3b8', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        {/* Hero Banner with Worker Background Gradient */}
        <View style={styles.heroBanner}>
          <View style={styles.heroOverlay}>
            <Text style={styles.heroHeadline}>Build Stronger, Build Smarter</Text>
            <Text style={styles.heroSubheadline}>Up to 25% off on cement & steel this week</Text>
          </View>
          <View style={styles.heroDotsRow}>
            <View style={styles.heroPillActive} />
            <View style={styles.heroDot} />
            <View style={styles.heroDot} />
          </View>
        </View>

        {/* Shop by Category Section */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionHeaderTitle}>Shop by Category</Text>
          <TouchableOpacity onPress={onNavigateToCategories}>
            <Text style={styles.seeAllOrangeLink}>See all ›</Text>
          </TouchableOpacity>
        </View>

        {/* 4x2 Category Grid (8 Items) */}
        <View style={styles.categoryGrid4x2}>
          {categories.map((cat, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.categoryCardItem}
              onPress={() => onSelectCategory(cat.id)}
            >
              <View style={[styles.categoryIconBadge, { backgroundColor: cat.bg }]}>
                <Text style={{ fontSize: 26 }}>{cat.icon}</Text>
              </View>
              <Text style={styles.categoryCardLabel} numberOfLines={1}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ⭐ Featured Products Section */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionHeaderTitle}>⭐ Featured</Text>
          <TouchableOpacity onPress={onNavigateToCategories}>
            <Text style={styles.seeAllOrangeLink}>See all ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuredProductGrid}>
          {products.map((product) => {
            const isWish = wishlist.includes(product.id);
            return (
              <TouchableOpacity
                key={product.id}
                style={styles.featuredCard}
                onPress={() => onSelectProduct(product)}
                activeOpacity={0.88}
              >
                <View style={styles.featuredThumbBox}>
                  <View style={styles.discountTagBadge}>
                    <Text style={styles.discountTagText}>{product.discount_pct || '-10%'}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.heartBtn}
                    onPress={() => toggleWishlist(product.id)}
                  >
                    <Text style={{ fontSize: 16 }}>{isWish ? '❤️' : '🤍'}</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 44 }}>{product.emoji}</Text>
                </View>
                <View style={styles.featuredCardBody}>
                  <Text style={styles.featuredBrandName}>{product.brand}</Text>
                  <Text style={styles.featuredProductName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <View style={styles.featuredRatingRow}>
                    <Text style={{ fontSize: 11.5, color: '#f59e0b', fontWeight: '700' }}>
                      ★ {product.rating}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>
                      ({product.reviews})
                    </Text>
                  </View>
                  <View style={styles.featuredPriceRow}>
                    <Text style={styles.featuredProductPrice}>
                      ₱{product.base_price.toLocaleString()}
                    </Text>
                    <TouchableOpacity
                      style={styles.featuredAddBtn}
                      onPress={() => addToCart(product, 1)}
                    >
                      <Text style={styles.featuredAddBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}
