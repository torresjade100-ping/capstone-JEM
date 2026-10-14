import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, GradientButton, EmptyState } from '../components/ui/Primitives';
import PressableScale from '../components/ui/PressableScale';
import { PALETTE, GRADIENTS, RADIUS, SHADOWS, peso, getProductImageSource } from '../components/ui/theme';
import { DISPATCH_HUB, isWithinCDO } from '../config/deliveryConfig';
import { validateMobileCartStock } from '../api/mobileApi';

const PAYMENT_OPTIONS = [
  { id: 'gcash', title: 'GCash E-Wallet', desc: 'Instant mobile checkout', icon: 'phone-portrait-outline', tint: '#0EA5E9', bg: '#F0F9FF' },
  { id: 'maya', title: 'Maya E-Wallet', desc: 'Secure QR & digital payment', icon: 'wallet-outline', tint: '#10B981', bg: '#ECFDF5' },
  { id: 'bank_transfer', title: 'Bank Transfer', desc: 'BDO, BPI, UnionBank direct', icon: 'business-outline', tint: '#6366F1', bg: '#EEF2FF' },
  { id: 'cod', title: 'Cash on Delivery (COD)', desc: 'Pay driver upon site unloading', icon: 'cash-outline', tint: '#F97316', bg: '#FFF7ED' },
];

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
  deliveryType = 'delivery',
  setDeliveryType,
  deliveryFee = 200,
  onCheckout,
  onStartShopping,
  deliveryAddress = 'Zone 1, Mabasa, Brgy. Balulang, Cagayan de Oro City',
  onChangeAddress,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;

  const [referenceNumber, setReferenceNumber] = useState('');
  const [isValidatingStock, setIsValidatingStock] = useState(false);
  const [stockIssues, setStockIssues] = useState({}); // { [productId]: { current_stock, is_available } }
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const effectiveFreight = deliveryType === 'pickup' ? 0 : deliveryFee;
  const calculatedTotal = Math.max(cartSubtotal + effectiveFreight - discount, 0);
  const isAddressValid = deliveryType === 'pickup' || isWithinCDO(deliveryAddress);

  // Auto-adjust cart item quantities to match currently available physical stock
  const handleAutoAdjustStock = (issuesToFix = stockIssues) => {
    cart.forEach((item) => {
      const issue = issuesToFix[item.id];
      if (issue) {
        if (issue.current_stock <= 0) {
          // Out of stock: remove item
          updateQuantity(item.id, -item.quantity);
        } else if (issue.current_stock < item.quantity) {
          // Adjust down to physical available stock
          const delta = issue.current_stock - item.quantity;
          updateQuantity(item.id, delta);
        }
      }
    });
    setStockIssues({});
  };

  // Pre-Checkout Stock Guard: Validates against live physical stock before completing checkout
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    if (deliveryType === 'delivery' && !isWithinCDO(deliveryAddress)) {
      if (onChangeAddress) onChangeAddress();
      return;
    }

    setIsValidatingStock(true);
    try {
      const result = await validateMobileCartStock(cart);

      if (!result.is_valid || result.has_modifications) {
        const issues = {};
        (result.items || []).forEach((it) => {
          if (!it.is_available) {
            issues[it.product_id] = it;
          }
        });
        setStockIssues(issues);

        Alert.alert(
          'Warehouse Inventory Alert ⚠️',
          'Live stock levels have changed since these materials were added. We have highlighted the affected materials in your cart.',
          [
            {
              text: 'Auto-Fix Quantities',
              onPress: () => handleAutoAdjustStock(issues),
            },
            {
              text: 'Review Cart',
              style: 'cancel',
            },
          ]
        );
        return;
      }

      // Stock is completely valid: clear any prior issues and proceed
      setStockIssues({});
      if (onCheckout) {
        onCheckout({
          deliveryType,
          paymentMethod,
          referenceNumber,
          total: calculatedTotal,
          shipping_fee: effectiveFreight,
        });
      }
    } catch (err) {
      // In case of network timeout, give the user the option to proceed with server-side validation
      Alert.alert(
        'Stock Verification Notice',
        `Unable to reach warehouse stock verification (${err.message || 'Network latency'}). Do you wish to proceed to checkout?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Proceed to Checkout',
            onPress: () => {
              if (onCheckout) {
                onCheckout({
                  deliveryType,
                  paymentMethod,
                  referenceNumber,
                  total: calculatedTotal,
                  shipping_fee: effectiveFreight,
                });
              }
            },
          },
        ]
      );
    } finally {
      setIsValidatingStock(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* 1. Header */}
      <ScreenHeader
        eyebrow="Order Preparation"
        title="Shopping Cart"
        subtitle={
          cart.length > 0
            ? `${totalItemCount} ${totalItemCount === 1 ? 'material' : 'materials'} ready for checkout`
            : 'Review selected hardware supplies'
        }
        right={
          cart.length > 0 ? (
            <View style={s.countBadge}>
              <Text style={s.countBadgeText}>{totalItemCount}</Text>
            </View>
          ) : null
        }
      />

      {/* 2. Scrollable Body inside KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            s.scroll,
            { flexGrow: 1 },
            isTablet && { maxWidth: 760, width: '100%', alignSelf: 'center' },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
        >
        {cart.length === 0 ? (
          <EmptyState
            icon="cart-outline"
            title="Your cart is empty"
            message="Explore our hardware catalog to add cement, rebar, plywood, and electrical supplies."
            actionLabel="Explore Materials Catalog"
            onAction={onStartShopping}
          />
        ) : (
          <>
            {/* Fulfillment Mode Toggle */}
            <Text style={s.groupLabel}>Fulfillment Method</Text>
            <View style={s.fulfillmentRow}>
              <PressableScale
                onPress={() => setDeliveryType && setDeliveryType('delivery')}
                style={[
                  s.methodCard,
                  SHADOWS.card,
                  deliveryType === 'delivery' && s.methodCardActive,
                ]}
                scaleTo={0.97}
              >
                <View style={s.methodIconWrap}>
                  <Ionicons
                    name="car"
                    size={22}
                    color={deliveryType === 'delivery' ? PALETTE.orange600 : PALETTE.textMuted}
                  />
                </View>
                <Text
                  style={[
                    s.methodTitle,
                    deliveryType === 'delivery' && { color: PALETTE.orange700 },
                  ]}
                >
                  Truck Freight
                </Text>
                <Text style={s.methodSub}>₱200 Site Dispatch</Text>
                {deliveryType === 'delivery' && (
                  <View style={s.activeCheck}>
                    <Ionicons name="checkmark-circle" size={18} color={PALETTE.orange600} />
                  </View>
                )}
              </PressableScale>

              <PressableScale
                onPress={() => setDeliveryType && setDeliveryType('pickup')}
                style={[
                  s.methodCard,
                  SHADOWS.card,
                  deliveryType === 'pickup' && s.methodCardActive,
                ]}
                scaleTo={0.97}
              >
                <View style={s.methodIconWrap}>
                  <Ionicons
                    name="business"
                    size={22}
                    color={deliveryType === 'pickup' ? PALETTE.orange600 : PALETTE.textMuted}
                  />
                </View>
                <Text
                  style={[
                    s.methodTitle,
                    deliveryType === 'pickup' && { color: PALETTE.orange700 },
                  ]}
                >
                  Yard Pickup
                </Text>
                <Text style={[s.methodSub, { color: PALETTE.successDeep, fontWeight: '800' }]}>
                  FREE (₱0 Freight)
                </Text>
                {deliveryType === 'pickup' && (
                  <View style={s.activeCheck}>
                    <Ionicons name="checkmark-circle" size={18} color={PALETTE.orange600} />
                  </View>
                )}
              </PressableScale>
            </View>

            {/* Destination Address Card */}
            <PressableScale
              onPress={deliveryType === 'delivery' ? onChangeAddress : null}
              disabled={deliveryType !== 'delivery'}
              style={[s.addressCard, SHADOWS.card]}
              scaleTo={0.98}
            >
              <LinearGradient
                colors={deliveryType === 'delivery' ? GRADIENTS.orange : ['#64748B', '#334155']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.addressIconBox}
              >
                <Ionicons
                  name={deliveryType === 'delivery' ? 'location' : 'storefront'}
                  size={20}
                  color="#FFFFFF"
                />
              </LinearGradient>

              <View style={{ flex: 1, paddingRight: 6 }}>
                <Text style={s.addressTag}>
                  {deliveryType === 'delivery' ? 'Delivery Address' : 'Pickup Store Yard'}
                </Text>
                <Text style={s.addressText} numberOfLines={2}>
                  {deliveryType === 'delivery'
                    ? deliveryAddress
                    : `JEM Central Hub: ${DISPATCH_HUB}`}
                </Text>
              </View>

              {deliveryType === 'delivery' && (
                <View style={s.changeBtn}>
                  <Text style={s.changeBtnText}>Change</Text>
                  <Ionicons name="chevron-forward" size={14} color={PALETTE.orange600} />
                </View>
              )}
            </PressableScale>

            {/* Out-of-boundary Alert Banner */}
            {!isAddressValid && (
              <View
                style={{
                  backgroundColor: '#fef2f2',
                  borderColor: '#fca5a5',
                  borderWidth: 1.5,
                  borderRadius: 14,
                  padding: 12,
                  marginTop: 8,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 18 }}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#dc2626' }}>
                    Delivery Restricted to Cagayan de Oro
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#b91c1c', marginTop: 2, fontWeight: '500' }}>
                    Delivery is currently restricted to Cagayan de Oro City addresses only.
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#dc2626',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                  }}
                  onPress={onChangeAddress}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#ffffff', fontSize: 11.5, fontWeight: '800' }}>Fix</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Stock Discrepancy Alert Banner */}
            {Object.keys(stockIssues).length > 0 && (
              <View style={s.stockWarningBanner}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <Text style={s.stockWarningTitle}>Inventory Discrepancy Detected</Text>
                  <Text style={s.stockWarningText}>
                    Some quantities exceed current physical warehouse stock.
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleAutoAdjustStock()} style={s.autoAdjustBtn} activeOpacity={0.8}>
                  <Text style={s.autoAdjustBtnText}>Auto-Fix</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Cart Items List */}
            <View style={s.sectionHeaderRow}>
              <Text style={s.groupLabel}>Selected Materials ({cart.length})</Text>
              <Text style={s.sectionHeaderHelp}>Slide or tap to adjust qty</Text>
            </View>

            {cart.map((item) => {
              const itemPrice = Number(item.base_price || item.price || 0);
              const lineTotal = itemPrice * item.quantity;
              const cartKey =
                item.cart_key ||
                `${item.id}${item.product_variant_id ? `-${item.product_variant_id}` : ''}`;
              const stockIssue = stockIssues[item.id];

              return (
                <View key={cartKey} style={[s.itemCard, SHADOWS.card, stockIssue && s.itemCardAlert]}>
                  <LinearGradient colors={GRADIENTS.thumb} style={s.itemThumb}>
                    {getProductImageSource(item) ? (
                      <Image
                        source={getProductImageSource(item)}
                        style={s.itemImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={s.itemEmoji}>{item.emoji || '🧱'}</Text>
                    )}
                  </LinearGradient>

                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={s.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.variant_label ? (
                      <View style={s.variantPill}>
                        <Text style={s.variantText}>Spec: {item.variant_label}</Text>
                      </View>
                    ) : null}

                    {/* Stock Alert Badge on Item */}
                    {stockIssue && (
                      <View style={s.stockIssueBadge}>
                        <Ionicons name="warning" size={12} color="#DC2626" />
                        <Text style={s.stockIssueBadgeText}>
                          {stockIssue.current_stock > 0
                            ? `Only ${stockIssue.current_stock} in stock (requested: ${item.quantity})`
                            : 'Out of stock in warehouse'}
                        </Text>
                      </View>
                    )}

                    <Text style={s.itemUnitPrice}>
                      {peso(itemPrice)}{' '}
                      <Text style={s.itemUnit}>/ {item.unit || 'unit'}</Text>
                    </Text>
                    <Text style={s.itemLineTotal}>Line Total: {peso(lineTotal)}</Text>
                  </View>

                  {/* Actions & Stepper */}
                  <View style={s.itemRightCol}>
                    <TouchableOpacity
                      style={s.deleteBtn}
                      onPress={() => updateQuantity(item.id, -item.quantity)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityLabel="Remove item"
                    >
                      <Ionicons name="trash-outline" size={17} color={PALETTE.danger} />
                    </TouchableOpacity>

                    <View style={s.stepper}>
                      <PressableScale
                        onPress={() => updateQuantity(item.id, -1)}
                        style={s.stepBtn}
                        scaleTo={0.85}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Decrease quantity"
                      >
                        <Ionicons name="remove" size={15} color={PALETTE.text} />
                      </PressableScale>

                      <Text style={s.stepVal}>{item.quantity}</Text>

                      <PressableScale
                        onPress={() => updateQuantity(item.id, 1)}
                        style={[s.stepBtn, s.stepBtnAdd]}
                        scaleTo={0.85}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Increase quantity"
                      >
                        <Ionicons name="add" size={15} color="#FFFFFF" />
                      </PressableScale>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Voucher Box */}
            <Text style={[s.groupLabel, { marginTop: 18 }]}>Voucher Discount</Text>
            <View style={s.voucherRow}>
              <View style={s.voucherInputWrap}>
                <Ionicons name="ticket-outline" size={18} color="#94A3B8" />
                <TextInput
                  style={s.voucherInput}
                  placeholder="Enter promo code (e.g. BUILD10)"
                  placeholderTextColor="#94A3B8"
                  value={voucher}
                  onChangeText={setVoucher}
                  autoCapitalize="characters"
                />
              </View>

              <PressableScale onPress={onApplyVoucher} scaleTo={0.92}>
                <LinearGradient
                  colors={GRADIENTS.midnight}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.voucherBtn}
                >
                  <Text style={s.voucherBtnText}>Apply</Text>
                </LinearGradient>
              </PressableScale>
            </View>

            {discount > 0 && (
              <View style={s.discountAppliedBox}>
                <Ionicons name="sparkles" size={16} color={PALETTE.success} />
                <Text style={s.discountAppliedText}>
                  Voucher applied! Saved {peso(discount)} on this order
                </Text>
              </View>
            )}

            {/* Payment Method Selector */}
            <Text style={[s.groupLabel, { marginTop: 20 }]}>Select Payment Option</Text>
            <View style={s.paymentList}>
              {PAYMENT_OPTIONS.map((pm) => {
                const isSelected = paymentMethod === pm.id;
                return (
                  <PressableScale
                    key={pm.id}
                    onPress={() => setPaymentMethod(pm.id)}
                    style={[
                      s.paymentCard,
                      SHADOWS.card,
                      isSelected && s.paymentCardActive,
                    ]}
                    scaleTo={0.98}
                  >
                    <View style={[s.paymentIconBox, { backgroundColor: pm.bg }]}>
                      <Ionicons name={pm.icon} size={22} color={pm.tint} />
                    </View>

                    <View style={{ flex: 1, paddingHorizontal: 12 }}>
                      <Text style={[s.paymentTitle, isSelected && { color: PALETTE.orange700 }]}>
                        {pm.title}
                      </Text>
                      <Text style={s.paymentDesc}>{pm.desc}</Text>
                    </View>

                    <View style={[s.radioCircle, isSelected && s.radioCircleActive]}>
                      {isSelected ? <View style={s.radioDot} /> : null}
                    </View>
                  </PressableScale>
                );
              })}
            </View>

            {/* Reference input for digital payments */}
            {(paymentMethod === 'gcash' ||
              paymentMethod === 'maya' ||
              paymentMethod === 'bank_transfer') && (
              <View style={[s.refBox, SHADOWS.card]}>
                <Text style={s.refLabel}>Payment Reference / Trace No. (Optional)</Text>
                <TextInput
                  style={s.refInput}
                  placeholder="e.g. GCash Ref # 9018-2940-1284"
                  placeholderTextColor="#94A3B8"
                  value={referenceNumber}
                  onChangeText={setReferenceNumber}
                />
              </View>
            )}

            {/* Summary Breakdown */}
            <View style={[s.summaryCard, SHADOWS.card]}>
              <View style={s.summaryHead}>
                <Ionicons name="receipt-outline" size={17} color={PALETTE.orange600} />
                <Text style={s.summaryHeadTitle}>Order Breakdown</Text>
              </View>

              <View style={s.summaryLine}>
                <Text style={s.summaryLabel}>Materials Subtotal</Text>
                <Text style={s.summaryValue}>{peso(cartSubtotal)}</Text>
              </View>

              <View style={s.summaryLine}>
                <Text style={s.summaryLabel}>
                  {deliveryType === 'pickup' ? 'Yard Store Pickup' : 'Site Delivery Freight'}
                </Text>
                <Text
                  style={[
                    s.summaryValue,
                    deliveryType === 'pickup' && { color: PALETTE.success, fontWeight: '800' },
                  ]}
                >
                  {deliveryType === 'pickup' ? 'FREE (₱0)' : peso(effectiveFreight)}
                </Text>
              </View>

              {discount > 0 && (
                <View style={s.summaryLine}>
                  <Text style={[s.summaryLabel, { color: PALETTE.success }]}>Promo Discount</Text>
                  <Text style={[s.summaryValue, { color: PALETTE.success }]}>
                    -{peso(discount)}
                  </Text>
                </View>
              )}

              <View style={s.summaryTotalLine}>
                <View>
                  <Text style={s.totalTitle}>Total Due</Text>
                  <Text style={s.totalCaption}>VAT inclusive · Official invoice issued</Text>
                </View>
                <Text style={s.totalAmount}>{peso(calculatedTotal)}</Text>
              </View>
            </View>

            {/* Primary Action Button */}
            <GradientButton
              label={
                isValidatingStock
                  ? 'Verifying Warehouse Stock...'
                  : !isAddressValid
                  ? 'Fix Address (Cagayan de Oro Only)'
                  : Object.keys(stockIssues).length > 0
                  ? `Adjust Stock to Place Order`
                  : `Place Order · ${peso(calculatedTotal)}`
              }
              icon={
                isValidatingStock
                  ? 'time-outline'
                  : !isAddressValid
                  ? 'alert-circle'
                  : Object.keys(stockIssues).length > 0
                  ? 'warning-outline'
                  : 'checkmark-circle'
              }
              onPress={handlePlaceOrder}
              disabled={isValidatingStock}
              style={{
                marginTop: 14,
                marginBottom: 30,
                opacity: !isAddressValid || isValidatingStock ? 0.85 : 1,
              }}
            />
          </>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  countBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },

  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },

  groupLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: PALETTE.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },

  fulfillmentRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  methodCard: {
    flex: 1,
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1.5,
    borderColor: PALETTE.line,
    position: 'relative',
  },
  methodCardActive: {
    borderColor: PALETTE.orange400,
    backgroundColor: PALETTE.orange50,
  },
  methodIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PALETTE.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  methodTitle: { fontSize: 13, fontWeight: '800', color: PALETTE.text },
  methodSub: { fontSize: 11, color: PALETTE.textMuted, marginTop: 2, fontWeight: '600' },
  activeCheck: { position: 'absolute', top: 10, right: 10 },

  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.lineSoft,
    marginBottom: 18,
  },
  addressIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addressTag: {
    fontSize: 11,
    fontWeight: '800',
    color: PALETTE.orange600,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  addressText: { fontSize: 13, fontWeight: '700', color: PALETTE.text, marginTop: 2 },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  changeBtnText: { fontSize: 12, fontWeight: '800', color: PALETTE.orange600 },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderHelp: { fontSize: 11, color: PALETTE.textFaint, fontWeight: '600' },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: PALETTE.lineSoft,
    marginBottom: 10,
  },
  itemThumb: {
    width: 58,
    height: 58,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemEmoji: { fontSize: 32 },
  itemImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  itemName: { fontSize: 13.5, fontWeight: '800', color: PALETTE.text, lineHeight: 18 },
  variantPill: {
    alignSelf: 'flex-start',
    backgroundColor: PALETTE.orange50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  variantText: { fontSize: 10, fontWeight: '700', color: PALETTE.orange700 },
  itemUnitPrice: { fontSize: 12, color: PALETTE.orange600, fontWeight: '800', marginTop: 3 },
  itemUnit: { color: PALETTE.textMuted, fontWeight: '500' },
  itemLineTotal: { fontSize: 11.5, color: PALETTE.textMuted, fontWeight: '600', marginTop: 1 },

  itemRightCol: { alignItems: 'flex-end', justifyContent: 'space-between', height: 68 },
  deleteBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.surfaceAlt,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: PALETTE.line,
    padding: 2,
    gap: 4,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: PALETTE.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnAdd: { backgroundColor: PALETTE.orange500 },
  stepVal: { minWidth: 20, textAlign: 'center', fontSize: 12.5, fontWeight: '900', color: PALETTE.text },

  voucherRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  voucherInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: PALETTE.line,
    gap: 8,
  },
  voucherInput: { flex: 1, fontSize: 13, fontWeight: '700', color: PALETTE.text, paddingVertical: 0 },
  voucherBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  discountAppliedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PALETTE.successBg,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 8,
  },
  discountAppliedText: { fontSize: 12, fontWeight: '800', color: PALETTE.successDeep },

  paymentList: { gap: 8, marginBottom: 10 },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1.5,
    borderColor: PALETTE.lineSoft,
  },
  paymentCardActive: {
    borderColor: PALETTE.orange400,
    backgroundColor: PALETTE.orange50,
  },
  paymentIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTitle: { fontSize: 13.5, fontWeight: '800', color: PALETTE.text },
  paymentDesc: { fontSize: 11, color: PALETTE.textMuted, marginTop: 1 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: { borderColor: PALETTE.orange500 },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PALETTE.orange500 },

  refBox: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: PALETTE.lineSoft,
    marginBottom: 12,
  },
  refLabel: { fontSize: 11.5, fontWeight: '700', color: PALETTE.textMuted, marginBottom: 6 },
  refInput: {
    backgroundColor: PALETTE.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: PALETTE.text,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },

  summaryCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.lineSoft,
    marginVertical: 10,
  },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: PALETTE.lineSoft,
    marginBottom: 10,
  },
  summaryHeadTitle: { fontSize: 13, fontWeight: '900', color: PALETTE.text, letterSpacing: 0.2 },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  summaryLabel: { fontSize: 13, color: PALETTE.textMuted, fontWeight: '500' },
  summaryValue: { fontSize: 13, color: PALETTE.text, fontWeight: '700' },
  summaryTotalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1.5,
    borderColor: PALETTE.line,
    paddingTop: 12,
    marginTop: 10,
  },
  totalTitle: { fontSize: 15, fontWeight: '900', color: PALETTE.text },
  totalCaption: { fontSize: 10.5, color: PALETTE.textMuted, marginTop: 1 },
  totalAmount: { fontSize: 22, fontWeight: '900', color: PALETTE.orange600, letterSpacing: -0.4 },

  stockWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  stockWarningTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#991B1B',
  },
  stockWarningText: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
    marginTop: 2,
  },
  autoAdjustBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  autoAdjustBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  itemCardAlert: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
    backgroundColor: '#FFFBFB',
  },
  stockIssueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 4,
  },
  stockIssueBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#DC2626',
  },
});
