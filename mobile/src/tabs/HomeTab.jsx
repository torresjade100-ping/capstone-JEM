import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { styles, COLORS } from '../styles/appStyles';

const PROMO_SLIDES = [
  {
    badge: '🔥 FLASH PROMO',
    headline: 'Build Stronger,\nBuild Smarter',
    subheadline: 'Up to 25% off on cement & steel rebar this week',
    bg: '#ea580c',
  },
  {
    badge: '🚚 JOB SITE SPECIAL',
    headline: 'Fast Truck Delivery\nAcross Laguna & Cavite',
    subheadline: 'Free standard freight on contractor orders ₱8,000+',
    bg: '#0f172a',
  },
  {
    badge: '🛠️ POWER TOOLS',
    headline: 'Bosch & DeWalt\nContractor Bundles',
    subheadline: 'Special trade pricing with official brand warranty',
    bg: '#0369a1',
  },
];

export default function HomeTab({
  searchQuery,
  setSearchQuery,
  categories,
  products,
  wishlist = [],
  toggleWishlist,
  addToCart,
  onSelectProduct,
  onSelectCategory,
  onOpenNotifications,
  onNavigateToCategories,
  userName = '',
}) {
  const [promoIndex, setPromoIndex] = useState(0);

  // Auto rotate promo slides
  useEffect(() => {
    const timer = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const currentPromo = PROMO_SLIDES[promoIndex];

  return (
    <View style={{ flex: 1 }}>
      {/* 1. Header with Brand, Search & Action Icons */}
      <View style={styles.homeHeader}>
        <View style={styles.homeHeaderTop}>
          <View style={styles.homeHeaderGreetingRow}>
            <View style={styles.homeHeaderAvatarBox}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>J</Text>
            </View>
            <View>
              <Text style={styles.homeHeaderGreeting}>
                {userName ? `Hello, ${userName.split(' ')[0]}! 👋` : 'Good day! 👋'}
              </Text>
              <Text style={styles.homeHeaderBrand}>JEM Hardware</Text>
            </View>
          </View>

          <View style={styles.homeHeaderActions}>
            <TouchableOpacity style={styles.bellBtn} onPress={onOpenNotifications}>
              <Text style={{ fontSize: 18 }}>🔔</Text>
              <View style={styles.bellBadgeDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar with Instant Clear */}
        <View style={styles.homeSearchBox}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={styles.homeSearchInput}
            placeholder="Search cement, lumber, steel, paint, tools..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity style={styles.homeSearchClear} onPress={() => setSearchQuery('')}>
              <Text style={{ color: '#94a3b8', fontSize: 16, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        {/* 2. Hero Banner Promo Carousel */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.heroBanner, { backgroundColor: currentPromo.bg }]}
          onPress={onNavigateToCategories}
        >
          <View style={styles.heroBannerDeco1} />
          <View style={styles.heroBannerDeco2} />

          <View>
            <View style={styles.heroBadgeTag}>
              <Text style={styles.heroBadgeTagText}>{currentPromo.badge}</Text>
            </View>
            <Text style={styles.heroHeadline}>{currentPromo.headline}</Text>
            <Text style={styles.heroSubheadline}>{currentPromo.subheadline}</Text>
          </View>

          <View style={styles.heroDotsRow}>
            {PROMO_SLIDES.map((_, idx) => (
              <View
                key={idx}
                style={idx === promoIndex ? styles.heroPillActive : styles.heroDot}
              />
            ))}
          </View>
        </TouchableOpacity>

        {/* 3. Value Props Row */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 12,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>🚚</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textBody }}>
              Site Truck Delivery
            </Text>
          </View>
          <View style={{ width: 1, height: 16, backgroundColor: COLORS.border }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>🛡️</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textBody }}>
              PNS / ASTM Quality
            </Text>
          </View>
          <View style={{ width: 1, height: 16, backgroundColor: COLORS.border }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>💳</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textBody }}>
              GCash / Maya / COD
            </Text>
          </View>
        </View>

        {/* 4. Shop by Category Section */}
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleWithIcon}>
            <Text style={{ fontSize: 18 }}>🏗️</Text>
            <Text style={styles.sectionHeaderTitle}>Shop by Category</Text>
          </View>
          <TouchableOpacity onPress={onNavigateToCategories}>
            <Text style={styles.seeAllOrangeLink}>View All ({categories.length}) ›</Text>
          </TouchableOpacity>
        </View>

        {/* Category Grid (4x2) */}
        <View style={styles.categoryGrid4x2}>
          {categories.map((cat, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.categoryCardItem}
              onPress={() => onSelectCategory(cat.id, cat.name || cat.title)}
              activeOpacity={0.75}
            >
              <View style={[styles.categoryIconBadge, { backgroundColor: cat.bg || '#f1f5f9' }]}>
                <Text style={{ fontSize: 24 }}>{cat.icon || '🧱'}</Text>
              </View>
              <Text style={styles.categoryCardLabel} numberOfLines={1}>
                {cat.name || cat.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 5. Featured / Best Seller Construction Supplies */}
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleWithIcon}>
            <Text style={{ fontSize: 18 }}>⭐</Text>
            <Text style={styles.sectionHeaderTitle}>Featured Materials</Text>
          </View>
          <TouchableOpacity onPress={onNavigateToCategories}>
            <Text style={styles.seeAllOrangeLink}>Catalog ›</Text>
          </TouchableOpacity>
        </View>

        {/* 2-Column Product Grid */}
        <View style={styles.featuredProductGrid}>
          {products.map((product) => {
            const isWish = wishlist.includes(product.id);
            const isLowStock = Number(product.stock_quantity || 0) <= 30;
            const isOutOfStock = Number(product.stock_quantity || 0) === 0;

            return (
              <TouchableOpacity
                key={product.id}
                style={styles.featuredCard}
                onPress={() => onSelectProduct(product)}
                activeOpacity={0.88}
              >
                <View style={styles.featuredThumbBox}>
                  {product.discount_pct ? (
                    <View style={styles.discountTagBadge}>
                      <Text style={styles.discountTagText}>{product.discount_pct}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={styles.heartBtn}
                    onPress={() => toggleWishlist(product.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 16 }}>{isWish ? '❤️' : '🤍'}</Text>
                  </TouchableOpacity>

                  <Text style={{ fontSize: 50 }}>{product.emoji || '🧱'}</Text>

                  {/* Stock pill */}
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
                    <View>
                      <Text style={styles.featuredProductPrice}>
                        ₱{Number(product.base_price || 0).toLocaleString()}
                      </Text>
                    </View>

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
