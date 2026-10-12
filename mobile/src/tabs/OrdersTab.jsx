import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, EmptyState } from '../components/ui/Primitives';
import PressableScale from '../components/ui/PressableScale';
import { PALETTE, RADIUS, SHADOWS, peso, getOrderStatusVisual } from '../components/ui/theme';

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
  return (
    <View style={{ flex: 1 }}>
      {/* 1. Header */}
      <ScreenHeader
        eyebrow="Delivery Tracking"
        title="My Orders"
        subtitle="Real-time order tracking & site deliveries"
        right={
          orders.length > 0 ? (
            <View style={s.countBadge}>
              <Text style={s.countBadgeText}>{orders.length} total</Text>
            </View>
          ) : null
        }
      />

      {/* 2. Filter Bar (Fixed horizontal scroll) */}
      <View style={s.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterScroll}
        >
          {STATUS_FILTERS.map((tab) => {
            const isActive = ordersTabFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[s.filterTab, isActive && s.filterTabActive]}
                onPress={() => setOrdersTabFilter(tab)}
                activeOpacity={0.75}
              >
                <Text style={[s.filterTabText, isActive && s.filterTabTextActive]}>
                  {tab}
                </Text>
                {isActive && <View style={s.activePill} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Orders Scrollable List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No orders in this stage"
            message={`Your ${ordersTabFilter} orders will appear here automatically with live tracking.`}
            actionLabel="Browse Construction Materials"
            onAction={onStartShopping}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {filteredOrders.map((ord) => {
              const rawStatus = (ord.status || 'pending').toLowerCase();
              const isCompleted = rawStatus === 'completed' || rawStatus === 'delivered';
              const isPending =
                rawStatus === 'pending' ||
                rawStatus === 'unpaid' ||
                rawStatus === 'to pay' ||
                rawStatus === 'to_pay';
              const isCancelled = rawStatus === 'cancelled' || rawStatus === 'canceled';
              const visual = getOrderStatusVisual(ord.status);
              const items = ord.items || [];
              const orderId = ord.order_number || ord.id;

              return (
                <View key={ord.id || ord.order_number} style={[s.orderCard, SHADOWS.card]}>
                  {/* Card Header */}
                  <View style={s.orderHead}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={s.orderNumberRow}>
                        <Ionicons name="receipt-outline" size={15} color={PALETTE.textMuted} />
                        <Text style={s.orderNumber}>Order #{orderId}</Text>
                      </View>
                      <Text style={s.orderDate}>
                        {ord.date ||
                          (ord.created_at
                            ? new Date(ord.created_at).toLocaleDateString()
                            : 'Today')}{' '}
                        • {(ord.payment_method || 'COD').toUpperCase()}
                      </Text>
                    </View>

                    <View style={[s.statusBadge, { backgroundColor: visual.bg }]}>
                      <Ionicons name={visual.icon} size={13} color={visual.fg} />
                      <Text style={[s.statusBadgeText, { color: visual.fg }]}>
                        {visual.label}
                      </Text>
                    </View>
                  </View>

                  {/* Visual Progress Bar (4 steps) */}
                  {!isCancelled && visual.step >= 0 && (
                    <View style={s.stepperRow}>
                      {[
                        { label: 'Placed', idx: 0 },
                        { label: 'Confirmed', idx: 1 },
                        { label: 'Warehouse', idx: 2 },
                        { label: 'Delivered', idx: 3 },
                      ].map((st) => {
                        const isDone = visual.step >= st.idx;
                        return (
                          <View key={st.label} style={s.stepperCol}>
                            <View
                              style={[
                                s.stepperDot,
                                isDone && s.stepperDotActive,
                              ]}
                            >
                              {isDone && (
                                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                              )}
                            </View>
                            <Text
                              style={[
                                s.stepperLabel,
                                isDone && s.stepperLabelActive,
                              ]}
                            >
                              {st.label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Items Preview */}
                  <View style={s.itemsBox}>
                    {items.map((it, idx) => {
                      const price = Number(it.price || it.unit_price || 0);
                      const qty = Number(it.ordered_quantity || it.qty || it.quantity || 1);
                      const fulfilled = Number(
                        it.fulfilled_quantity !== undefined ? it.fulfilled_quantity : qty
                      );
                      const backordered = Number(it.backordered_quantity || 0);

                      return (
                        <View key={idx} style={s.itemRow}>
                          <View style={s.itemBullet} />
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={s.itemTitle} numberOfLines={1}>
                              {it.name}{' '}
                              <Text style={s.itemQty}>× {qty}</Text>
                            </Text>

                            {backordered > 0 && (
                              <View style={s.backorderAlert}>
                                <Ionicons name="hourglass-outline" size={11} color={PALETTE.orange700} />
                                <Text style={s.backorderAlertText}>
                                  {fulfilled > 0
                                    ? `Partially Ready: ${fulfilled} pcs ready, ${backordered} pcs queued`
                                    : `Backordered: ${backordered} pcs awaiting shipment`}
                                </Text>
                              </View>
                            )}
                          </View>

                          <Text style={s.itemPrice}>{peso(price * qty)}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Delivery destination preview */}
                  {ord.delivery_address && (
                    <View style={s.addressRow}>
                      <Ionicons name="location-outline" size={13} color={PALETTE.textMuted} />
                      <Text style={s.addressText} numberOfLines={1}>
                        {ord.delivery_address}
                      </Text>
                    </View>
                  )}

                  {/* Card Footer Actions */}
                  <View style={s.orderFoot}>
                    <View>
                      <Text style={s.footTotalLabel}>Total Amount</Text>
                      <Text style={s.footTotalVal}>{peso(ord.total)}</Text>
                    </View>

                    <View style={s.actionsRow}>
                      {/* Cancel button if pending */}
                      {(isPending || rawStatus === 'backordered') && onCancelOrder && (
                        <PressableScale
                          style={s.cancelBtn}
                          onPress={() => onCancelOrder(ord)}
                          scaleTo={0.92}
                        >
                          <Ionicons name="close-circle-outline" size={14} color={PALETTE.danger} />
                          <Text style={s.cancelBtnText}>Cancel</Text>
                        </PressableScale>
                      )}

                      {/* Reorder button */}
                      {onReorder && !isPending && (
                        <PressableScale
                          style={s.reorderBtn}
                          onPress={() => onReorder(ord)}
                          scaleTo={0.92}
                        >
                          <Ionicons name="repeat-outline" size={14} color={PALETTE.text} />
                          <Text style={s.reorderBtnText}>Reorder</Text>
                        </PressableScale>
                      )}

                      {/* Feedback button */}
                      {isCompleted && onLeaveFeedback && (
                        <PressableScale
                          style={[
                            s.rateBtn,
                            ord.has_feedback && s.rateBtnDone,
                          ]}
                          onPress={() => onLeaveFeedback(ord)}
                          disabled={ord.has_feedback}
                          scaleTo={0.92}
                        >
                          <Ionicons
                            name={ord.has_feedback ? 'star' : 'star-outline'}
                            size={14}
                            color={ord.has_feedback ? PALETTE.successDeep : '#FFFFFF'}
                          />
                          <Text
                            style={[
                              s.rateBtnText,
                              ord.has_feedback && s.rateBtnTextDone,
                            ]}
                          >
                            {ord.has_feedback ? 'Rated' : 'Rate Order'}
                          </Text>
                        </PressableScale>
                      )}

                      {/* Track button */}
                      {!isCancelled && (
                        <PressableScale
                          style={s.trackBtn}
                          onPress={() => onSelectOrder(ord)}
                          scaleTo={0.92}
                        >
                          <Ionicons name="compass-outline" size={15} color="#FFFFFF" />
                          <Text style={s.trackBtnText}>Track</Text>
                        </PressableScale>
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

const s = StyleSheet.create({
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  countBadgeText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },

  filterBar: {
    backgroundColor: PALETTE.surface,
    borderBottomWidth: 1,
    borderColor: PALETTE.line,
  },
  filterScroll: { paddingHorizontal: 12, paddingVertical: 4, gap: 6 },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  filterTabActive: {},
  filterTabText: { fontSize: 13, fontWeight: '700', color: PALETTE.textMuted },
  filterTabTextActive: { color: PALETTE.orange600, fontWeight: '900' },
  activePill: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: PALETTE.orange500,
    borderRadius: 2,
  },

  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },

  orderCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.lineSoft,
  },
  orderHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: PALETTE.lineSoft,
  },
  orderNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderNumber: { fontSize: 14.5, fontWeight: '900', color: PALETTE.text },
  orderDate: { fontSize: 11.5, color: PALETTE.textMuted, marginTop: 2, fontWeight: '600' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },

  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  stepperCol: { alignItems: 'center', flex: 1 },
  stepperDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PALETTE.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepperDotActive: { backgroundColor: PALETTE.orange500 },
  stepperLabel: { fontSize: 10, color: PALETTE.textFaint, fontWeight: '700' },
  stepperLabelActive: { color: PALETTE.text, fontWeight: '900' },

  itemsBox: { marginVertical: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: PALETTE.orange400,
    marginRight: 8,
  },
  itemTitle: { fontSize: 13, fontWeight: '700', color: PALETTE.textBody },
  itemQty: { color: PALETTE.textMuted, fontWeight: '600' },
  itemPrice: { fontSize: 12.5, fontWeight: '800', color: PALETTE.text },

  backorderAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE.orange50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  backorderAlertText: { fontSize: 10.5, fontWeight: '700', color: PALETTE.orange700 },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: PALETTE.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    marginTop: 6,
  },
  addressText: { fontSize: 11.5, color: PALETTE.textMuted, fontWeight: '600', flex: 1 },

  orderFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: PALETTE.lineSoft,
    paddingTop: 12,
    marginTop: 10,
  },
  footTotalLabel: {
    fontSize: 10.5,
    color: PALETTE.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footTotalVal: { fontSize: 18, fontWeight: '900', color: PALETTE.orange600, letterSpacing: -0.3 },

  actionsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE.dangerBg,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  cancelBtnText: { fontSize: 12, fontWeight: '800', color: PALETTE.dangerDeep },

  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE.surfaceAlt,
    borderWidth: 1,
    borderColor: PALETTE.line,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  reorderBtnText: { fontSize: 12, fontWeight: '800', color: PALETTE.textBody },

  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE.orange500,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  rateBtnDone: {
    backgroundColor: PALETTE.successBg,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rateBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  rateBtnTextDone: { color: PALETTE.successDeep },

  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE.navy800,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  trackBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
});
