import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { PALETTE, GRADIENTS, RADIUS, SHADOWS, peso } from './theme';

const { width: SCREEN_W } = Dimensions.get('window');
export const CARD_WIDTH = (SCREEN_W - 16 * 2 - 12) / 2;

export default function ProductCard({ product, isWished, onPress, onToggleWish, onAdd }) {
  const stock = Number(product.stock_quantity || 0);
  const isOut = stock === 0;
  const isLow = !isOut && stock <= 30;
  const stockColor = isOut ? PALETTE.danger : isLow ? PALETTE.warning : PALETTE.success;
  const stockLabel = isOut ? 'Out of stock' : isLow ? `Only ${stock} left` : `${stock} in stock`;

  return (
    <PressableScale onPress={onPress} style={[s.card, SHADOWS.card]} scaleTo={0.97}>
      <LinearGradient colors={GRADIENTS.thumb} style={s.thumb}>
        <View style={s.thumbGlow} />
        <Text style={s.emoji}>{product.emoji || '🧱'}</Text>

        {product.discount_pct ? (
          <LinearGradient colors={GRADIENTS.ember} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.discount}>
            <Text style={s.discountText}>{product.discount_pct}</Text>
          </LinearGradient>
        ) : null}

        {onToggleWish ? (
          <TouchableOpacity style={s.heart} onPress={onToggleWish} activeOpacity={0.7} hitSlop={6}>
            <Ionicons name={isWished ? 'heart' : 'heart-outline'} size={17} color={isWished ? PALETTE.danger : PALETTE.textMuted} />
          </TouchableOpacity>
        ) : null}

        <View style={s.stockChip}>
          <View style={[s.stockDot, { backgroundColor: stockColor }]} />
          <Text style={s.stockText}>{stockLabel}</Text>
        </View>
      </LinearGradient>

      <View style={s.body}>
        <View style={s.metaRow}>
          <Text style={s.brand} numberOfLines={1}>{product.brand || 'JEM'}</Text>
          <View style={s.rating}>
            <Ionicons name="star" size={11} color={PALETTE.warning} />
            <Text style={s.ratingText}>{product.rating || '4.9'}</Text>
          </View>
        </View>

        <Text style={s.name} numberOfLines={2}>{product.name}</Text>

        <View style={s.priceRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.price}>{peso(product.base_price)}</Text>
            <Text style={s.unit}>per {product.unit || 'unit'}</Text>
          </View>
          {onAdd ? (
            <PressableScale onPress={onAdd} disabled={isOut} scaleTo={0.85} style={!isOut && SHADOWS.orange}>
              <LinearGradient
                colors={isOut ? ['#E2E8F0', '#CBD5E1'] : GRADIENTS.orange}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.addBtn}
              >
                <Ionicons name={isOut ? 'close' : 'add'} size={20} color="#FFFFFF" />
              </LinearGradient>
            </PressableScale>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: PALETTE.lineSoft,
    overflow: 'hidden',
    marginBottom: 12,
  },
  thumb: { height: 138, alignItems: 'center', justifyContent: 'center' },
  thumbGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
  },
  emoji: { fontSize: 56 },
  discount: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  discountText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '900', letterSpacing: 0.2 },
  heart: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  stockChip: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: PALETTE.lineSoft,
  },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockText: { fontSize: 10, fontWeight: '800', color: PALETTE.textBody },

  body: { padding: 12, paddingTop: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '800',
    color: PALETTE.orange600,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 11, fontWeight: '800', color: PALETTE.textBody },
  name: {
    fontSize: 13.5,
    fontWeight: '800',
    color: PALETTE.text,
    marginTop: 5,
    lineHeight: 18,
    height: 36,
    letterSpacing: -0.1,
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 10 },
  price: { fontSize: 17, fontWeight: '900', color: PALETTE.text, letterSpacing: -0.4 },
  unit: { fontSize: 10.5, color: PALETTE.textFaint, fontWeight: '600', marginTop: 1 },
  addBtn: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
