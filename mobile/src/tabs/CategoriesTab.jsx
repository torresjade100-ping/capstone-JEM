import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenHeader, SearchBar, EmptyState } from '../components/ui/Primitives';
import ProductCard from '../components/ui/ProductCard';
import { PALETTE, GRADIENTS, RADIUS, SHADOWS, getCategoryVisual } from '../components/ui/theme';

const SORT_OPTIONS = [
  { id: 'popular', label: 'Popular', icon: 'flame-outline' },
  { id: 'price_low', label: 'Price ↑', icon: 'trending-up-outline' },
  { id: 'price_high', label: 'Price ↓', icon: 'trending-down-outline' },
  { id: 'rating', label: 'Top Rated', icon: 'star-outline' },
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
  refreshing = false,
  onRefresh = null,
  isOffline = false,
}) {
  const [activeCat, setActiveCat] = useState(selectedCategory || 'all');
  const [activeBrand, setActiveBrand] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [sortOption, setSortOption] = useState('popular');

  // Extract unique brands dynamically from products
  const brandsList = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand.trim());
    });
    return Array.from(set);
  }, [products]);

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
        String(p.category_id || '').toLowerCase().trim() === String(activeCat || '').toLowerCase().trim() ||
        (p.category_slug && p.category_slug.toLowerCase() === String(activeCat).toLowerCase()) ||
        (p.category && p.category.toLowerCase().trim() === String(activeCat).toLowerCase().trim()) ||
        (p.category && p.category.toLowerCase().includes(String(activeCat).toLowerCase()));

      const matchBrand =
        activeBrand === 'all' ||
        (p.brand && p.brand.toLowerCase().trim() === activeBrand.toLowerCase().trim());

      const matchStock = !inStockOnly || Number(p.stock_quantity || 0) > 0;

      return matchSearch && matchCat && matchBrand && matchStock;
    });

    if (sortOption === 'price_low') {
      list.sort((a, b) => Number(a.base_price || 0) - Number(b.base_price || 0));
    } else if (sortOption === 'price_high') {
      list.sort((a, b) => Number(b.base_price || 0) - Number(a.base_price || 0));
    } else if (sortOption === 'rating') {
      list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    }

    return list;
  }, [products, activeCat, activeBrand, inStockOnly, catalogSearch, sortOption]);

  const handleSelectCategory = (catId, catTitle) => {
    setActiveCat(catId);
    if (onSelectCategory) {
      onSelectCategory(catId, catTitle);
    }
  };

  const resetFilters = () => {
    setActiveCat('all');
    setActiveBrand('all');
    setInStockOnly(false);
    setCatalogSearch('');
    setSortOption('popular');
  };

  const activeFilterCount =
    (activeCat !== 'all' ? 1 : 0) + (activeBrand !== 'all' ? 1 : 0) + (inStockOnly ? 1 : 0);

  const renderCatChip = (id, label, icon, colors, keyIndex) => {
    const isActive = activeCat === id;
    const content = (
      <>
        <View style={[s.chipIcon, { backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : `${colors[1]}18` }]}>
          <MaterialCommunityIcons name={icon} size={14} color={isActive ? '#FFFFFF' : colors[1]} />
        </View>
        <Text style={[s.chipText, isActive && s.chipTextActive]} numberOfLines={1}>{label}</Text>
      </>
    );
    return (
      <TouchableOpacity
        key={`cat-chip-${id}-${keyIndex ?? id}`}
        onPress={() => handleSelectCategory(id, label)}
        activeOpacity={0.8}
      >
        {isActive ? (
          <LinearGradient colors={GRADIENTS.orange} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.chip, s.chipActive, SHADOWS.orange]}>
            {content}
          </LinearGradient>
        ) : (
          <View style={s.chip}>{content}</View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* 1. Header */}
      <ScreenHeader
        eyebrow="JEM Catalog"
        title="Materials Catalog"
        subtitle={`${products.length} construction & hardware supplies`}
      >
        <SearchBar
          value={catalogSearch}
          onChangeText={setCatalogSearch}
          placeholder="Search Holcim, Boysen, 12mm..."
        />
      </ScreenHeader>

      {/* 2. Category chips (fixed) */}
      <View style={s.chipBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipScroll}>
          {renderCatChip('all', `All (${products.length})`, 'view-grid', ['#FB923C', '#EA580C'], 'all')}
          {categories.map((cat, idx) => {
            const v = getCategoryVisual(cat);
            return renderCatChip(cat.id, cat.name || cat.title, v.icon, v.colors, idx);
          })}
        </ScrollView>
      </View>

      {/* 3. Scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
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
            <Text style={s.offlineBannerText}>Offline Mode · Showing local catalog</Text>
            {onRefresh && (
              <TouchableOpacity onPress={onRefresh} style={s.offlineRetryBtn} activeOpacity={0.8}>
                <Text style={s.offlineRetryText}>Sync</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Sort segmented control */}
        <View style={[s.segment, SHADOWS.card]}>
          {SORT_OPTIONS.map((opt) => {
            const isActive = sortOption === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[s.segmentItem, isActive && s.segmentItemActive]}
                onPress={() => setSortOption(opt.id)}
                activeOpacity={0.8}
              >
                <Ionicons name={opt.icon} size={13} color={isActive ? '#FFFFFF' : PALETTE.textMuted} />
                <Text style={[s.segmentText, isActive && s.segmentTextActive]} numberOfLines={1}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Brand + availability filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.brandScroll}>
          <TouchableOpacity
            style={[s.toggleChip, inStockOnly && s.toggleChipOn]}
            onPress={() => setInStockOnly(!inStockOnly)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={inStockOnly ? 'checkmark-circle' : 'ellipse-outline'}
              size={15}
              color={inStockOnly ? PALETTE.success : PALETTE.textFaint}
            />
            <Text style={[s.brandText, inStockOnly && { color: PALETTE.successDeep }]}>In stock</Text>
          </TouchableOpacity>

          <View style={s.vDivider} />

          {['all', ...brandsList].map((br) => {
            const isActive = activeBrand === br;
            return (
              <TouchableOpacity
                key={br}
                style={[s.brandChip, isActive && s.brandChipActive]}
                onPress={() => setActiveBrand(isActive && br !== 'all' ? 'all' : br)}
                activeOpacity={0.8}
              >
                <Text style={[s.brandText, isActive && s.brandTextActive]}>{br === 'all' ? 'All brands' : br}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Results summary */}
        <View style={s.resultsRow}>
          <Text style={s.resultsText}>
            <Text style={s.resultsCount}>{filteredCatalog.length}</Text> {filteredCatalog.length === 1 ? 'item' : 'items'} found
          </Text>
          {activeFilterCount > 0 || catalogSearch ? (
            <TouchableOpacity onPress={resetFilters} style={s.clearBtn} activeOpacity={0.7}>
              <Ionicons name="refresh" size={13} color={PALETTE.orange600} />
              <Text style={s.clearText}>Clear filters</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {filteredCatalog.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No materials found"
            message="We couldn't find products matching your filters. Try another category or brand."
            actionLabel="Reset Filters"
            onAction={resetFilters}
          />
        ) : (
          <View style={s.grid}>
            {filteredCatalog.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWished={wishlist.includes(product.id)}
                onPress={() => onSelectProduct && onSelectProduct(product)}
                onToggleWish={toggleWishlist ? () => toggleWishlist(product.id) : null}
                onAdd={addToCart ? () => addToCart(product, 1) : null}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  chipBar: { backgroundColor: PALETTE.canvas },
  chipScroll: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 6,
    paddingRight: 14,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.surface,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  chipActive: { borderWidth: 0 },
  chipIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 12.5, fontWeight: '700', color: PALETTE.textBody, maxWidth: 150 },
  chipTextActive: { color: '#FFFFFF', fontWeight: '900' },

  scroll: { paddingHorizontal: 16, paddingBottom: 120 },

  segment: {
    flexDirection: 'row',
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.md,
    padding: 4,
    borderWidth: 1,
    borderColor: PALETTE.lineSoft,
    marginBottom: 12,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 11,
  },
  segmentItemActive: { backgroundColor: PALETTE.navy800 },
  segmentText: { fontSize: 11.5, fontWeight: '700', color: PALETTE.textMuted },
  segmentTextActive: { color: '#FFFFFF', fontWeight: '900' },

  brandScroll: { gap: 6, alignItems: 'center', paddingBottom: 4 },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.surface,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  toggleChipOn: { backgroundColor: PALETTE.successBg, borderColor: '#A7F3D0' },
  vDivider: { width: 1, height: 18, backgroundColor: PALETTE.line, marginHorizontal: 4 },
  brandChip: {
    paddingHorizontal: 13,
    height: 34,
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.surface,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  brandChipActive: { backgroundColor: PALETTE.orange50, borderColor: PALETTE.orange400 },
  brandText: { fontSize: 12, fontWeight: '700', color: PALETTE.textBody },
  brandTextActive: { color: PALETTE.orange700, fontWeight: '900' },

  resultsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 14 },
  resultsText: { fontSize: 13, color: PALETTE.textMuted, fontWeight: '600' },
  resultsCount: { color: PALETTE.text, fontWeight: '900' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearText: { fontSize: 12, fontWeight: '800', color: PALETTE.orange600 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
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
    marginBottom: 12,
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
