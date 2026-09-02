import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { styles, COLORS } from '../styles/appStyles';

const SORT_OPTIONS = [
  { id: 'popular', label: '⭐ Popular' },
  { id: 'price_low', label: '💵 Price: Low to High' },
  { id: 'price_high', label: '💎 Price: High to Low' },
  { id: 'rating', label: '🏆 Top Rated' },
];

export default function CategoriesTab({
  categories = [],
  products = [],
  selectedCategory = 'all',
  onSelectCategory,
  onSelectProduct,
  addToCart,
  wishlist = [],
  toggleWishlist,
}) {
  const [activeCat, setActiveCat] = useState(selectedCategory || 'all');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [sortOption, setSortOption] = useState('popular');

  // Filter and sort products
  const filteredCatalog = useMemo(() => {
    let list = (products || []).filter((p) => {
      const q = catalogSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      const matchCat =
        activeCat === 'all' ||
        p.category_id === activeCat ||
        (p.category && p.category.toLowerCase().includes(activeCat.toLowerCase()));

      return matchSearch && matchCat;
    });

    if (sortOption === 'price_low') {
      list.sort((a, b) => Number(a.base_price || 0) - Number(b.base_price || 0));
    } else if (sortOption === 'price_high') {
      list.sort((a, b) => Number(b.base_price || 0) - Number(a.base_price || 0));
    } else if (sortOption === 'rating') {
      list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    }

    return list;
  }, [products, activeCat, catalogSearch, sortOption]);

  const handleSelectCategory = (catId, catTitle) => {
    setActiveCat(catId);
    if (onSelectCategory) {
      onSelectCategory(catId, catTitle);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* 1. Header with Catalog Title & Search Bar */}
      <View style={styles.categoriesHeader}>
        <Text style={styles.categoriesHeaderTitle}>Materials Catalog</Text>
        <Text style={styles.categoriesHeaderSubtitle}>
          Browse high-grade construction & hardware supplies
        </Text>

        <View style={[styles.homeSearchBox, { marginTop: 14 }]}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={styles.homeSearchInput}
            placeholder="Search within catalog..."
            placeholderTextColor="#94a3b8"
            value={catalogSearch}
            onChangeText={setCatalogSearch}
            autoCapitalize="none"
          />
          {catalogSearch ? (
            <TouchableOpacity onPress={() => setCatalogSearch('')} style={styles.homeSearchClear}>
              <Text style={{ color: '#94a3b8', fontSize: 16, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 2. Horizontal Category Filter Pills */}
      <View style={{ backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: COLORS.border }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillScroll}
        >
          <TouchableOpacity
            style={[styles.filterPill, activeCat === 'all' && styles.filterPillActive]}
            onPress={() => handleSelectCategory('all', 'All Materials')}
          >
            <Text style={[styles.filterPillText, activeCat === 'all' && styles.filterPillTextActive]}>
              🧱 All ({products.length})
            </Text>
          </TouchableOpacity>

          {categories.map((cat, idx) => {
            const isActive = activeCat === cat.id;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => handleSelectCategory(cat.id, cat.name || cat.title)}
              >
                <Text style={{ fontSize: 14 }}>{cat.icon || '📦'}</Text>
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {cat.name || cat.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Sort & Results Summary Bar */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textMuted }}>
          Showing {filteredCatalog.length} {filteredCatalog.length === 1 ? 'item' : 'items'}
        </Text>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {SORT_OPTIONS.slice(0, 2).map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: sortOption === opt.id ? COLORS.primaryLight : '#ffffff',
                borderWidth: 1,
                borderColor: sortOption === opt.id ? COLORS.primary : COLORS.border,
              }}
              onPress={() => setSortOption(opt.id)}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: sortOption === opt.id ? COLORS.primaryDark : COLORS.textMuted,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 4. Product Grid or Empty State */}
      {filteredCatalog.length === 0 ? (
        <View style={styles.ordersEmptyContainer}>
          <View style={styles.ordersEmptyIconCircle}>
            <Text style={{ fontSize: 48 }}>🔍</Text>
          </View>
          <Text style={styles.ordersEmptyTitle}>No materials found</Text>
          <Text style={styles.ordersEmptySubtitle}>
            We couldn't find any products matching "{catalogSearch || activeCat}".
          </Text>
          <TouchableOpacity
            style={styles.startShoppingBtn}
            onPress={() => {
              setActiveCat('all');
              setCatalogSearch('');
            }}
          >
            <Text style={styles.startShoppingBtnText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16 }}>
          <View style={styles.featuredProductGrid}>
            {filteredCatalog.map((product) => {
              const isWish = wishlist.includes(product.id);
              const isLowStock = Number(product.stock_quantity || 0) <= 30;
              const isOutOfStock = Number(product.stock_quantity || 0) === 0;

              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.featuredCard}
                  onPress={() => onSelectProduct && onSelectProduct(product)}
                  activeOpacity={0.88}
                >
                  <View style={styles.featuredThumbBox}>
                    {product.discount_pct ? (
                      <View style={styles.discountTagBadge}>
                        <Text style={styles.discountTagText}>{product.discount_pct}</Text>
                      </View>
                    ) : null}

                    {toggleWishlist && (
                      <TouchableOpacity
                        style={styles.heartBtn}
                        onPress={() => toggleWishlist(product.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 16 }}>{isWish ? '❤️' : '🤍'}</Text>
                      </TouchableOpacity>
                    )}

                    <Text style={{ fontSize: 50 }}>{product.emoji || '🧱'}</Text>

                    <View
                      style={[
                        styles.stockPillBadge,
                        isOutOfStock && { backgroundColor: COLORS.danger },
                        isLowStock && !isOutOfStock && { backgroundColor: '#d97706' },
                      ]}
                    >
                      <Text style={styles.stockPillText}>
                        {isOutOfStock
                          ? 'Out of Stock'
                          : isLowStock
                          ? `Only ${product.stock_quantity} left`
                          : `${product.stock_quantity} in stock`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featuredCardBody}>
                    <View style={styles.featuredBrandRow}>
                      <Text style={styles.featuredBrandName} numberOfLines={1}>
                        {product.brand}
                      </Text>
                      <Text style={{ fontSize: 10, color: COLORS.textMuted }}>
                        {product.unit || 'unit'}
                      </Text>
                    </View>

                    <Text style={styles.featuredProductName} numberOfLines={2}>
                      {product.name}
                    </Text>

                    <View style={styles.featuredRatingRow}>
                      <Text style={{ fontSize: 12, color: '#f59e0b', fontWeight: '800' }}>
                        ★ {product.rating || '4.9'}
                      </Text>
                      <Text style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 4 }}>
                        ({product.reviews || 128})
                      </Text>
                    </View>

                    <View style={styles.featuredPriceRow}>
                      <Text style={styles.featuredProductPrice}>
                        ₱{Number(product.base_price || 0).toLocaleString()}
                      </Text>

                      {addToCart && (
                        <TouchableOpacity
                          style={[
                            styles.featuredAddBtn,
                            isOutOfStock && { backgroundColor: '#cbd5e1' },
                          ]}
                          onPress={() => addToCart(product, 1)}
                          disabled={isOutOfStock}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.featuredAddBtnText}>+</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
