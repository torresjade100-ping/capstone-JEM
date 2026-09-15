import React from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { styles, COLORS } from '../styles/appStyles';

const STATUS_FILTERS = ['To Pay', 'To Process', 'To Ship', 'To Receive', 'Completed', 'All'];

export default function OrdersTab({
  orders = [],
  filteredOrders = [],
  ordersTabFilter = 'To Pay',
  setOrdersTabFilter,
  onSelectOrder,
  onLeaveFeedback,
  onStartShopping,
  onReorder,
  onCancelOrder,
}) {
  const getStatusBadge = (status = '') => {
    const s = status.toLowerCase();
    if (s === 'cancelled' || s === 'canceled') {
      return { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626', label: 'Cancelled ✕' };
    }
    if (s === 'completed' || s === 'delivered') {
      return { bg: COLORS.successBg, border: COLORS.successBorder, text: '#059669', label: 'Delivered ✅' };
    }
    if (s === 'out_for_delivery' || s === 'in_transit' || s === 'shipped') {
      return { bg: '#e0f2fe', border: '#bae6fd', text: '#0284c7', label: 'Out for Delivery 🚚' };
    }
    if (s === 'processing' || s === 'ready' || s === 'packed') {
      return { bg: '#e0e7ff', border: '#c7d2fe', text: '#4338ca', label: 'Warehouse Staging 📦' };
    }
    if (s === 'backordered') {
      return { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', label: 'Backordered ⏳' };
    }
    if (s === 'confirmed' || s === 'received') {
      return { bg: '#fef3c7', border: '#fde68a', text: '#d97706', label: 'Store Confirmed ✓' };
    }
    return { bg: COLORS.primaryLight, border: COLORS.primaryBorder, text: COLORS.primaryDark, label: 'Awaiting Confirmation' };
  };

  return (
    <View style={{ flex: 1 }}>
      {/* 1. Header */}
      <View style={styles.ordersTopHeader}>
        <Text style={styles.ordersTopTitle}>My Orders</Text>
        <Text style={styles.ordersTopSubtitle}>
          Real-time tracking of hardware orders &amp; jobsite deliveries
        </Text>
      </View>

      {/* 2. Filter Tabs */}
      <View style={styles.ordersFilterBar}>
        {STATUS_FILTERS.map((tab) => {
          const isActive = ordersTabFilter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.ordersFilterTab}
              onPress={() => setOrdersTabFilter(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.ordersFilterTabText,
                  isActive && styles.ordersFilterTabTextActive,
                ]}
              >
                {tab}
              </Text>
              {isActive && <View style={styles.ordersActiveIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. Scrollable Orders List or Empty State */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {filteredOrders.length === 0 ? (
        <View style={styles.ordersEmptyContainer}>
          <View style={styles.ordersEmptyIconCircle}>
            <Text style={{ fontSize: 50 }}>📦</Text>
          </View>
          <Text style={styles.ordersEmptyTitle}>No orders in this stage</Text>
          <Text style={styles.ordersEmptySubtitle}>
            Your {ordersTabFilter} orders will appear here automatically with live tracking.
          </Text>
          <TouchableOpacity style={styles.startShoppingBtn} onPress={onStartShopping} activeOpacity={0.85}>
            <Text style={styles.startShoppingBtnText}>Browse Construction Materials 🧱</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          {filteredOrders.map((ord) => {
            const rawStatus = (ord.status || 'pending').toLowerCase();
            const isCompleted = rawStatus === 'completed' || rawStatus === 'delivered';
            const isPending = rawStatus === 'pending' || rawStatus === 'unpaid' || rawStatus === 'to pay' || rawStatus === 'to_pay';
            const isCancelled = rawStatus === 'cancelled' || rawStatus === 'canceled';
            const badge = getStatusBadge(ord.status);
            const items = ord.items || [];

            return (
              <View key={ord.id || ord.order_number} style={styles.orderCard}>
                {/* Card Header */}
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderNumberTag}>
                      Order #{ord.order_number || ord.id}
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                      {ord.date || (ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Today')} • {(ord.payment_method || 'COD').toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: badge.bg,
                      borderWidth: 1,
                      borderColor: badge.border,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: badge.text }}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                {/* Items Preview */}
                <View style={{ marginVertical: 6 }}>
                  {items.map((it, idx) => {
                    const price = Number(it.price || it.unit_price || 0);
                    const qty = Number(it.ordered_quantity || it.qty || it.quantity || 1);
                    const fulfilled = Number(it.fulfilled_quantity !== undefined ? it.fulfilled_quantity : qty);
                    const backordered = Number(it.backordered_quantity || 0);

                    return (
                      <View key={idx} style={{ paddingVertical: 3 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 13, color: COLORS.textBody, flex: 1 }} numberOfLines={1}>
                            • {it.name} <Text style={{ color: COLORS.textMuted }}>× {qty}</Text>
                          </Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.textMain }}>
                            ₱{(price * qty).toLocaleString()}
                          </Text>
                        </View>
                        {backordered > 0 && (
                          <Text style={{ fontSize: 11, color: '#c2410c', fontWeight: '700', marginTop: 1, paddingLeft: 8 }}>
                            {fulfilled > 0
                              ? `⏳ Partially Available: ${fulfilled} pcs ready, ${backordered} pcs on backorder`
                              : `⏳ Backordered: ${backordered} pcs on backorder`}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Delivery Address Preview */}
                {ord.delivery_address && (
                  <Text style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 }} numberOfLines={1}>
                    📍 {ord.delivery_address}
                  </Text>
                )}

                {/* Card Footer */}
                <View style={styles.orderFooter}>
                  <View>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', fontWeight: '600' }}>
                      Total Amount
                    </Text>
                    <Text style={{ fontWeight: '900', fontSize: 16, color: COLORS.primaryDark }}>
                      ₱{Number(ord.total || 0).toLocaleString()}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {/* Cancel button if pending or backordered */}
                    {(isPending || rawStatus === 'backordered') && onCancelOrder && (
                      <TouchableOpacity
                        style={[
                          styles.trackBtn,
                          {
                            backgroundColor: '#fee2e2',
                            borderColor: '#fca5a5',
                            borderWidth: 1,
                          },
                        ]}
                        onPress={() => onCancelOrder(ord)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.trackBtnText, { color: '#dc2626' }]}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Reorder button */}
                    {onReorder && !isPending && (
                      <TouchableOpacity
                        style={[
                          styles.trackBtn,
                          {
                            backgroundColor: '#f1f5f9',
                            borderColor: '#cbd5e1',
                            borderWidth: 1,
                          },
                        ]}
                        onPress={() => onReorder(ord)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.trackBtnText, { color: COLORS.textMain }]}>
                          🔄 Reorder
                        </Text>
                      </TouchableOpacity>
                    )}

                    {isCompleted && onLeaveFeedback && (
                      <TouchableOpacity
                        style={[
                          styles.trackBtn,
                          {
                            backgroundColor: ord.has_feedback ? COLORS.successBg : COLORS.primary,
                            borderWidth: ord.has_feedback ? 1 : 0,
                            borderColor: COLORS.successBorder,
                          },
                        ]}
                        onPress={() => onLeaveFeedback(ord)}
                        disabled={ord.has_feedback}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.trackBtnText,
                            { color: ord.has_feedback ? COLORS.success : '#fff' },
                          ]}
                        >
                          {ord.has_feedback ? '✓ Rated ⭐' : '⭐ Rate'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {!isCancelled && (
                      <TouchableOpacity
                        style={styles.trackBtn}
                        onPress={() => onSelectOrder(ord)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.trackBtnText}>Track 📍</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
      </ScrollView>
    </View>
  );
}

