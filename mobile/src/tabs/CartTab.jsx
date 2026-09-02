import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { styles, COLORS } from '../styles/appStyles';

export default function CartTab({
  cart = [],
  updateQuantity,
  voucher = '',
  setVoucher,
  onApplyVoucher,
  discount = 0,
  paymentMethod = 'gcash',
  setPaymentMethod,
  cartSubtotal = 0,
  cartTotal = 0,
  onCheckout,
  onStartShopping,
  deliveryAddress = 'Block 12 Lot 8, Villa San Isidro, Santa Rosa, Laguna',
}) {
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View style={{ flex: 1 }}>
      {/* 1. Cart Header */}
      <View style={styles.cartTopHeader}>
        <View>
          <Text style={styles.cartTopTitle}>Shopping Cart</Text>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: '500', marginTop: 2 }}>
            Review hardware items before checkout
          </Text>
        </View>

        {cart.length > 0 && (
          <View style={styles.cartItemBadgeCount}>
            <Text style={styles.cartItemBadgeCountText}>
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
        )}
      </View>

      {/* 2. Empty State */}
      {cart.length === 0 ? (
        <View style={styles.cartEmptyContainer}>
          <View style={styles.cartEmptyIconCircle}>
            <Text style={{ fontSize: 54 }}>🛒</Text>
          </View>
          <Text style={styles.cartEmptyTitle}>Your cart is empty</Text>
          <Text style={styles.cartEmptySubtitle}>
            Browse our materials catalog and add cement, lumber, steel, and tools to your cart.
          </Text>
          <TouchableOpacity style={styles.startShoppingBtn} onPress={onStartShopping} activeOpacity={0.85}>
            <Text style={styles.startShoppingBtnText}>Browse Materials Catalog 🏗️</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          {/* 3. Delivery Destination Card */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 14,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 24, marginRight: 10 }}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primaryDark, textTransform: 'uppercase' }}>
                Job Site Delivery Address
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textMain, marginTop: 2 }}>
                {deliveryAddress}
              </Text>
            </View>
          </View>

          {/* 4. Cart Items List */}
          <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Selected Materials ({cart.length})
          </Text>

          {cart.map((item) => {
            const itemPrice = Number(item.base_price || item.price || 0);
            const lineTotal = itemPrice * item.quantity;

            return (
              <View key={item.id} style={styles.cartItemCard}>
                <View style={styles.cartItemThumb}>
                  <Text style={{ fontSize: 32 }}>{item.emoji || '🧱'}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.textMain }} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.primaryDark, fontWeight: '800', marginTop: 2 }}>
                    ₱{itemPrice.toLocaleString()} <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: '400' }}>/ {item.unit || 'unit'}</Text>
                  </Text>
                  <Text style={{ fontSize: 11.5, color: COLORS.textMuted, fontWeight: '600' }}>
                    Line Total: ₱{lineTotal.toLocaleString()}
                  </Text>
                </View>

                {/* Quantity Controls */}
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.cartItemDeleteBtn}
                    onPress={() => updateQuantity(item.id, -item.quantity)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14, color: COLORS.danger }}>🗑️</Text>
                  </TouchableOpacity>

                  <View style={styles.cartQtyControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.id, -1)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>

                    <Text style={styles.qtyValueText}>{item.quantity}</Text>

                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.id, 1)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}

          {/* 5. Voucher Code Input */}
          <View style={styles.voucherBox}>
            <TextInput
              style={styles.voucherInput}
              placeholder="Voucher Code (e.g. JEMBUILD10)"
              placeholderTextColor="#94a3b8"
              value={voucher}
              onChangeText={setVoucher}
              autoCapitalize="characters"
            />

            <TouchableOpacity style={styles.voucherBtn} onPress={onApplyVoucher} activeOpacity={0.8}>
              <Text style={styles.voucherBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>

          {discount > 0 && (
            <View
              style={{
                backgroundColor: COLORS.successBg,
                borderWidth: 1,
                borderColor: COLORS.successBorder,
                padding: 10,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 16 }}>🎉</Text>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: COLORS.success }}>
                Voucher applied: ₱{discount.toLocaleString()} savings deducted!
              </Text>
            </View>
          )}

          {/* 6. Payment Method Selector */}
          <View style={{ marginVertical: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', marginBottom: 8, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Select Payment Method
            </Text>

            {[
              { id: 'gcash', title: 'GCash E-Wallet', desc: 'Instant cashless verification', icon: '📱' },
              { id: 'maya', title: 'Maya E-Wallet', desc: 'Secure digital payment', icon: '💚' },
              { id: 'cod', title: 'Cash on Delivery (COD)', desc: 'Pay truck driver upon site arrival', icon: '💵' },
            ].map((pm) => {
              const isSelected = paymentMethod === pm.id;
              return (
                <TouchableOpacity
                  key={pm.id}
                  style={[styles.payOption, isSelected && styles.payOptionActive]}
                  onPress={() => setPaymentMethod(pm.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.payOptionLeft}>
                    <Text style={{ fontSize: 24 }}>{pm.icon}</Text>
                    <View>
                      <Text style={styles.payOptionLabel}>{pm.title}</Text>
                      <Text style={{ fontSize: 11.5, color: COLORS.textMuted }}>{pm.desc}</Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 16, color: isSelected ? COLORS.primary : '#cbd5e1', fontWeight: '900' }}>
                    {isSelected ? '●' : '○'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 7. Price Summary Breakdown */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryHeader}>Payment Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Materials Subtotal</Text>
              <Text style={styles.summaryVal}>₱{Number(cartSubtotal || 0).toLocaleString()}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Site Delivery Freight</Text>
              <Text style={styles.summaryVal}>₱200</Text>
            </View>

            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: COLORS.success }]}>Promo Discount</Text>
                <Text style={[styles.summaryVal, { color: COLORS.success }]}>
                  -₱{Number(discount).toLocaleString()}
                </Text>
              </View>
            )}

            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '900', color: COLORS.textMain }}>
                  Total Payment
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                  Includes all applicable taxes &amp; fees
                </Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.primaryDark }}>
                ₱{Number(cartTotal || 0).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* 8. Checkout Action Button */}
          <TouchableOpacity
            style={[styles.primaryAuthBtn, { marginBottom: 30 }]}
            onPress={onCheckout}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryAuthBtnText}>
              Place Order • ₱{Number(cartTotal || 0).toLocaleString()} →
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
