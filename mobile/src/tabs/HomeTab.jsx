import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, Platform, useWindowDimensions, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenHeader, GlassIconButton, SearchBar, SectionHeader } from '../components/ui/Primitives';
import PressableScale from '../components/ui/PressableScale';
import ProductCard from '../components/ui/ProductCard';
import { PALETTE, GRADIENTS, RADIUS, SHADOWS, getCategoryVisual } from '../components/ui/theme';

const PROMO_SLIDES = [
  {
    badge: 'FLASH PROMO',
    badgeIcon: 'flame',
    headline: 'Build Stronger,\nBuild Smarter',
    subheadline: 'Up to 25% off on cement & steel rebar this week',
    colors: ['#FF9A4D', '#F97316', '#C2410C'],
    art: 'wall',
  },
  {
    badge: 'CUSTOMER SPECIAL',
    badgeIcon: 'car',
    headline: 'Fast Truck Delivery\nAcross Cagayan de Oro City',
    subheadline: 'Free standard freight on qualifying orders ₱8,000+',
    colors: ['#1E2F52', '#14213A', '#0B1220'],
    art: 'truck-fast',
  },
  {
    badge: 'POWER TOOLS',
    badgeIcon: 'construct',
    headline: 'Bosch & DeWalt\nPower Tool Bundles',
    subheadline: 'Best retail pricing with official brand warranty',
    colors: ['#38BDF8', '#0369A1', '#0C4A6E'],
    art: 'hammer-wrench',
  },
];

const VALUE_PROPS = [
  { icon: 'truck-delivery', title: 'Site Delivery', caption: 'Truck dispatch', tint: PALETTE.orange500, bg: PALETTE.orange50 },
  { icon: 'shield-check', title: 'PNS / ASTM', caption: 'Certified grade', tint: PALETTE.success, bg: PALETTE.successBg },
  { icon: 'wallet', title: 'GCash · COD', caption: 'Flexible pay', tint: PALETTE.info, bg: PALETTE.infoBg },
];

const USE_NATIVE = Platform.OS !== 'web';

const greetingForNow = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

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
  refreshing = false,
  onRefresh = null,
  isOffline = false,
  loading = false,
  lastSyncedAt = null,
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isTablet = windowWidth > 768;

  const [promoIndex, setPromoIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  // Auto rotate promo slides with a soft cross-fade
  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: USE_NATIVE }).start(() => {
        setPromoIndex((prev) => (prev + 1) % PROMO_SLIDES.length);
        Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: USE_NATIVE }).start();
      });
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const promo = PROMO_SLIDES[promoIndex];
  const firstName = userName ? userName.split(' ')[0] : '';
  const initial = (firstName || 'J').charAt(0).toUpperCase();

  return (
    <View style={{ flex: 1 }}>
      {/* 1. Header */}
      <ScreenHeader>
        <View style={s.topRow}>
          <View style={s.userRow}>
            <LinearGradient colors={GRADIENTS.orange} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatar}>
              <Text style={s.avatarText}>{initial}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.greeting}>{greetingForNow()}{firstName ? ',' : ''}</Text>
              <Text style={s.userName} numberOfLines={1}>{firstName || 'Builder'} 👷</Text>
            </View>
          </View>
          <GlassIconButton icon="notifications-outline" onPress={onOpenNotifications} badge />
        </View>

        <View style={s.locationRow}>
          <Ionicons name="location" size={13} color={PALETTE.orange400} />
          <Text style={s.locationText}>Delivering across Cagayan de Oro City only</Text>
        </View>

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search cement, lumber, steel, paint..."
        />
      </ScreenHeader>

      {/* 2. Body */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scroll, isTablet && { maxWidth: 1100, alignSelf: 'center', width: '100%', paddingHorizontal: 28 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              colors={[PALETTE.orange500, '#EA580C']}
              tintColor={PALETTE.orange500}
              title="Syncing live inventory..."
              titleColor={PALETTE.textMuted}
            />
          ) : undefined
        }
      >
        {/* Offline Warning Banner */}
        {isOffline && (
          <View style={s.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color="#DC2626" />
            <Text style={s.offlineBannerText}>Offline Mode · Displaying local inventory snapshot</Text>
            {onRefresh && (
              <TouchableOpacity onPress={onRefresh} style={s.offlineRetryBtn} activeOpacity={0.8}>
                <Text style={s.offlineRetryText}>Sync</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!searchQuery ? (
          <>
            {/* Hero promo */}
            <PressableScale onPress={onNavigateToCategories} scaleTo={0.98} style={[s.heroShell, SHADOWS.raised]}>
              <Animated.View style={{ opacity: fade }}>
                <LinearGradient colors={promo.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
                  <View style={s.heroRing} />
                  <View style={s.heroRingSmall} />
                  <MaterialCommunityIcons name={promo.art} size={118} color="rgba(255,255,255,0.14)" style={s.heroArt} />

                  <View style={s.heroBadge}>
                    <Ionicons name={promo.badgeIcon} size={12} color="#FFFFFF" />
                    <Text style={s.heroBadgeText}>{promo.badge}</Text>
                  </View>
                  <Text style={s.heroHeadline}>{promo.headline}</Text>
                  <Text style={s.heroSub}>{promo.subheadline}</Text>

                  <View style={s.heroFooter}>
                    <View style={s.heroCta}>
                      <Text style={s.heroCtaText}>Shop now</Text>
                      <Ionicons name="arrow-forward" size={14} color={PALETTE.text} />
                    </View>
                    <View style={s.dots}>
                      {PROMO_SLIDES.map((_, idx) => (
                        <View key={idx} style={[s.dot, idx === promoIndex && s.dotActive]} />
                      ))}
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
            </PressableScale>

            {/* Value props */}
            <View style={s.valueRow}>
              {VALUE_PROPS.map((vp) => (
                <View key={vp.title} style={[s.valueCard, SHADOWS.card]}>
                  <View style={[s.valueIcon, { backgroundColor: vp.bg }]}>
                    <MaterialCommunityIcons name={vp.icon} size={18} color={vp.tint} />
                  </View>
                  <Text style={s.valueTitle} numberOfLines={1}>{vp.title}</Text>
                  <Text style={s.valueCaption} numberOfLines={1}>{vp.caption}</Text>
                </View>
              ))}
            </View>

            {/* Categories */}
            <SectionHeader
              title="Shop by Category"
              caption="Find the right material fast"
              actionLabel={`All ${categories.length}`}
              onAction={onNavigateToCategories}
            />
            <View style={s.catGrid}>
              {categories.map((cat, idx) => {
                const v = getCategoryVisual(cat);
                return (
                  <PressableScale
                    key={`home-cat-${cat.id ?? idx}-${idx}`}
                    onPress={() => onSelectCategory(cat.id, cat.name || cat.title)}
                    style={s.catItem}
                    containerStyle={s.catCell}
                    scaleTo={0.92}
                  >
                    <LinearGradient colors={v.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.catIcon, SHADOWS.card]}>
                      <MaterialCommunityIcons name={v.icon} size={24} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={s.catLabel} numberOfLines={2}>{cat.name || cat.title}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </>
        ) : null}

        {/* Products */}
        <SectionHeader
          title={searchQuery ? 'Search Results' : 'Featured Materials'}
          caption={
            searchQuery
              ? `${products.length} ${products.length === 1 ? 'match' : 'matches'} for “${searchQuery}”`
              : 'Top picks from customers this week'
          }
          actionLabel={searchQuery ? null : 'Catalog'}
          onAction={onNavigateToCategories}
        />

        {loading && products.length === 0 ? (
          <View style={[s.noResults, SHADOWS.card, { paddingVertical: 40 }]}>
            <ActivityIndicator size="large" color={PALETTE.orange500} />
            <Text style={s.noResultsTitle}>Connecting to live warehouse...</Text>
            <Text style={s.noResultsText}>Fetching real-time inventory and pricing</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={[s.noResults, SHADOWS.card]}>
            <Ionicons name="search-outline" size={28} color={PALETTE.textFaint} />
            <Text style={s.noResultsTitle}>No materials found</Text>
            <Text style={s.noResultsText}>Try a different keyword or brand name.</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWished={wishlist.includes(product.id)}
                onPress={() => onSelectProduct(product)}
                onToggleWish={() => toggleWishlist(product.id)}
                onAdd={() => addToCart(product, 1)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 12 },
  avatar: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...SHADOWS.orange },
  avatarText: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  greeting: { fontSize: 12.5, color: '#9AA8BF', fontWeight: '600' },
  userName: { fontSize: 21, color: '#FFFFFF', fontWeight: '900', letterSpacing: -0.4, marginTop: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  locationText: { fontSize: 12, color: '#CBD5E1', fontWeight: '600' },

  scroll: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 120 },

  heroShell: { borderRadius: RADIUS.xl, marginBottom: 16 },
  hero: { borderRadius: RADIUS.xl, padding: 20, minHeight: 186, overflow: 'hidden' },
  heroRing: {
    position: 'absolute',
    right: -50,
    top: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 26,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  heroRingSmall: {
    position: 'absolute',
    right: 70,
    bottom: -40,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroArt: { position: 'absolute', right: -6, bottom: 8 },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    marginBottom: 12,
  },
  heroBadgeText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '900', letterSpacing: 1 },
  heroHeadline: { fontSize: 23, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.6, lineHeight: 28 },
  heroSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.86)', marginTop: 6, fontWeight: '600', maxWidth: '78%' },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  heroCtaText: { fontSize: 12.5, fontWeight: '900', color: PALETTE.text },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 20, backgroundColor: '#FFFFFF' },

  valueRow: { flexDirection: 'row', gap: 10, marginBottom: 26 },
  valueCard: {
    flex: 1,
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: PALETTE.lineSoft,
  },
  valueIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  valueTitle: { fontSize: 12, fontWeight: '900', color: PALETTE.text },
  valueCaption: { fontSize: 10.5, color: PALETTE.textMuted, fontWeight: '600', marginTop: 1 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 22 },
  catCell: { width: '25%', paddingHorizontal: 4, marginBottom: 14 },
  catItem: { alignItems: 'center' },
  catIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  catLabel: { fontSize: 11, fontWeight: '700', color: PALETTE.textBody, textAlign: 'center', lineHeight: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  noResults: {
    alignItems: 'center',
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: PALETTE.lineSoft,
  },
  noResultsTitle: { fontSize: 15, fontWeight: '900', color: PALETTE.text, marginTop: 10 },
  noResultsText: { fontSize: 12.5, color: PALETTE.textMuted, marginTop: 4 },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#991B1B',
  },
  offlineRetryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  offlineRetryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
