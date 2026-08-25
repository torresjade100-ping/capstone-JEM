import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../styles/appStyles';

export default function CartTab({
  cart,
  updateQuantity,
  voucher,
  setVoucher,
  onApplyVoucher,
  discount,
  paymentMethod,
  setPaymentMethod,
  cartSubtotal,
  cartTotal,
  onCheckout,
  onStartShopping,
}) {
  return (
    <View>
      <View style={styles.cartTopHeader}>
        <Text style={styles.cartTopTitle}>My Cart</Text>
      </View>

      {cart.length === 0 ? (
        <View style={styles.cartEmptyContainer}>
          <View style={styles.cartEmptyIconCircle}>
            <Text style={{ fontSize: 64 }}>🛒</Text>
          </View>
          <Text style={styles.cartEmptyTitle}>Your cart is empty</Text>
          <Text style={styles.cartEmptySubtitle}>
            Browse our products and add items to your cart.
          </Text>
          <TouchableOpacity style={styles.startShoppingBtn} onPress={onStartShopping}>
            <Text style={styles.startShoppingBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ padding: 16 }}>
          {cart.map((item) => (
            <View key={item.id} style={styles.cartItemCard}>
              <Text style={{ fontSize: 36, marginRight: 12 }}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>{item.name}</Text>
                <Text style={{ fontSize: 13, color: '#f97316', fontWeight: '800', marginTop: 2 }}>
                  ₱{item.base_price.toLocaleString()} / {item.unit}
                </Text>
              </View>
              <View style={styles.cartQtyControls}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, -1)}>
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValueText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, 1)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Voucher Input */}
          <View style={styles.voucherBox}>
            <TextInput
              style={styles.voucherInput}
              placeholder="Enter Voucher Code (JEMBUILD10)"
              placeholderTextColor="#94a3b8"
              value={voucher}
              onChangeText={setVoucher}
            />

            <TouchableOpacity style={styles.voucherBtn} onPress={onApplyVoucher}>
              <Text style={styles.voucherBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>

          {/* Payment Method Selector */}
          <View style={{ marginVertical: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 8, color: '#0f172a' }}>
              Payment Method:
            </Text>
            {['gcash', 'maya', 'cod'].map((pm) => (
              <TouchableOpacity
                key={pm}
                style={[styles.payOption, paymentMethod === pm && styles.payOptionActive]}
                onPress={() => setPaymentMethod(pm)}
              >
                <Text style={{ fontWeight: '700', fontSize: 13, textTransform: 'uppercase' }}>
                  {pm === 'cod'
                    ? '💵 Cash on Delivery'
                    : pm === 'gcash'
                    ? '💳 GCash E-Wallet'
                    : '💚 Maya E-Wallet'}
                </Text>
                <Text style={{ color: paymentMethod === pm ? '#f97316' : '#94a3b8' }}>
                  {paymentMethod === pm ? '●' : '○'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Price Breakdown */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryVal}>₱{cartSubtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryVal}>₱200</Text>
            </View>
            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#10b981' }]}>Voucher Discount</Text>
                <Text style={[styles.summaryVal, { color: '#10b981' }]}>
                  -₱{discount.toLocaleString()}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.summaryRow,
                { borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 8, marginTop: 4 },
              ]}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>Total Payment</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#f97316' }}>
                ₱{cartTotal.toLocaleString()}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryAuthBtn} onPress={onCheckout}>
            <Text style={styles.primaryAuthBtnText}>
              Place Order (₱{cartTotal.toLocaleString()}) →
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
