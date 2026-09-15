import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { styles, COLORS } from '../styles/appStyles';

export default function ProductDetailsModal({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  if (!product) return null;

  const variants = product.variants || [];
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) || (variants.length > 0 ? variants[0] : null);

  const currentPrice = selectedVariant ? Number(selectedVariant.price || product.base_price || 0) : Number(product.base_price || 0);
  const maxStock = selectedVariant ? Number(selectedVariant.stock_quantity ?? product.stock_quantity ?? 100) : Number(product.stock_quantity ?? 100);
  const isOutOfStock = maxStock === 0;

  const handleIncrement = () => {
    if (quantity < maxStock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const itemTotal = currentPrice * quantity;

  const buildCartPayload = () => ({
    ...product,
    id: product.id,
    product_id: product.id,
    product_variant_id: selectedVariant?.id || null,
    base_price: currentPrice,
    price: currentPrice,
    stock_quantity: maxStock,
    variant_label: selectedVariant ? (selectedVariant.label || selectedVariant.size || selectedVariant.thickness) : null,
    name: selectedVariant ? `${product.name} (${selectedVariant.label || selectedVariant.size || selectedVariant.thickness})` : product.name,
  });

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheetContainer}>
          {/* Drag Handle */}
          <View style={styles.sheetDragHandle} />

          {/* Modal Header */}
          <View style={styles.modalNav}>
            <View>
              <Text style={styles.modalNavTitle}>Material Details</Text>
              <Text style={{ fontSize: 11.5, color: COLORS.textMuted, fontWeight: '600' }}>
                Item Code: #{product.id || 'JEM-MAT'}
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
            {/* Hero Image Container */}
            <View style={styles.detailThumb}>
              <Text style={{ fontSize: 76 }}>{product.emoji || '🧱'}</Text>
            </View>

            {/* Brand & Category Tags */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <View
                style={{
                  backgroundColor: COLORS.primaryLight,
                  borderWidth: 1,
                  borderColor: COLORS.primaryBorder,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: COLORS.primaryDark, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                  {product.brand || 'JEM Brand'}
                </Text>
              </View>

              <Text style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: '600' }}>
                {product.category || 'Construction Materials'}
              </Text>
            </View>

            {/* Product Title */}
            <Text style={{ fontSize: 19, fontWeight: '900', color: COLORS.textMain, marginTop: 8 }}>
              {product.name}
            </Text>

            {/* Rating & Reviews */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
              <Text style={{ fontSize: 13, color: '#f59e0b', fontWeight: '800' }}>
                ★ {product.rating || '4.9'}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                ({product.reviews || 128} verified contractor reviews)
              </Text>
              <Text style={{ color: COLORS.border }}>•</Text>
              <Text style={{ fontSize: 12, color: COLORS.success, fontWeight: '700' }}>
                ✓ PNS Certified
              </Text>
            </View>

            {/* Pricing Section */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginVertical: 14,
                backgroundColor: '#ffffff',
                padding: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <View>
                <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase' }}>
                  Unit Contractor Price
                </Text>
                <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.primaryDark, marginTop: 2 }}>
                  ₱{Number(currentPrice || 0).toLocaleString()}{' '}
                  <Text style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: '500' }}>
                    / {product.unit || 'piece'}
                  </Text>
                </Text>
              </View>

              {/* Stock Status Badge */}
              <View
                style={{
                  backgroundColor: isOutOfStock ? COLORS.dangerBg : COLORS.successBg,
                  borderWidth: 1,
                  borderColor: isOutOfStock ? COLORS.dangerBorder : COLORS.successBorder,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color: isOutOfStock ? COLORS.danger : COLORS.success,
                    fontWeight: '800',
                    fontSize: 11.5,
                  }}
                >
                  {isOutOfStock ? 'Out of Stock' : `✓ ${maxStock} in Warehouse`}
                </Text>
              </View>
            </View>

            {/* Product Variants Selector (Size / Grade / Thickness / Unit) */}
            {variants.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.textMain, marginBottom: 8 }}>
                  Available Specifications / Dimensions:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    const vLabel = v.label || [v.size, v.thickness, v.grade].filter(Boolean).join(' - ') || `Option #${v.id}`;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 10,
                          backgroundColor: isSelected ? COLORS.primaryLight : COLORS.surface,
                          borderWidth: 1.5,
                          borderColor: isSelected ? COLORS.primary : COLORS.border,
                        }}
                        onPress={() => setSelectedVariantId(v.id)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: isSelected ? '800' : '600',
                            color: isSelected ? COLORS.primaryDark : COLORS.textMain,
                          }}
                        >
                          {vLabel} • ₱{Number(v.price).toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Description */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.textMain, marginBottom: 6 }}>
                Description &amp; Specifications:
              </Text>
              <Text style={{ fontSize: 13.5, color: COLORS.textBody, lineHeight: 21 }}>
                {product.description ||
                  'Industrial and contractor-grade building material manufactured strictly according to Philippine National Standards (PNS) and ASTM specifications for structural safety.'}
              </Text>
            </View>

            {/* Quantity Selector Card */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: COLORS.surfaceSubtle,
                borderRadius: 16,
                padding: 14,
                marginVertical: 10,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.textMain }}>
                  Select Quantity:
                </Text>
                <Text style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 }}>
                  Subtotal: ₱{itemTotal.toLocaleString()}
                </Text>
              </View>

              <View style={styles.cartQtyControls}>
                <TouchableOpacity
                  style={[styles.qtyBtn, quantity <= 1 && { opacity: 0.5 }]}
                  onPress={handleDecrement}
                  disabled={quantity <= 1}
                >
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>

                <Text style={[styles.qtyValueText, { fontSize: 15, marginHorizontal: 14 }]}>
                  {quantity}
                </Text>

                <TouchableOpacity
                  style={[styles.qtyBtn, quantity >= maxStock && { opacity: 0.5 }]}
                  onPress={handleIncrement}
                  disabled={quantity >= maxStock}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Dual Action Buttons (Add to Cart & Buy Now) */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 10 }}>
              <TouchableOpacity
                style={[
                  styles.secondaryAuthBtn,
                  { flex: 1 },
                  isOutOfStock && { opacity: 0.5 },
                ]}
                onPress={() => {
                  onAddToCart(buildCartPayload(), quantity);
                  onClose();
                }}
                disabled={isOutOfStock}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryAuthBtnText}>+ Add to Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryAuthBtn,
                  { flex: 1.2 },
                  isOutOfStock && { backgroundColor: '#cbd5e1' },
                ]}
                onPress={() => {
                  if (onBuyNow) {
                    onBuyNow(buildCartPayload(), quantity);
                  } else {
                    onAddToCart(buildCartPayload(), quantity);
                  }
                  onClose();
                }}
                disabled={isOutOfStock}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryAuthBtnText}>
                  ⚡ Buy Now (₱{itemTotal.toLocaleString()})
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
