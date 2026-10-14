import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, EmptyState } from '../components/ui/Primitives';
import PressableScale from '../components/ui/PressableScale';
import { PALETTE, RADIUS, SHADOWS, peso, getOrderStatusVisual } from '../components/ui/theme';
import { getMobileOrders } from '../api/mobileApi';

const STATUS_FILTERS = ['To Pay', 'To Process', 'To Ship / To Receive', 'Completed', 'All'];

const TRACKING_STEPS = [
  { label: 'Placed', step: 1 },
  { label: 'Confirmed', step: 2 },
  { label: 'Warehouse', step: 3 },
  { label: 'Delivered', step: 4 },
];

export const getOrderStepperActiveCount = (status = '') => {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'completed' || s === 'delivered') {
    return 4; // All 4 steps active (Delivered)
  }
  if (
    s === 'processing' ||
    s === 'in_process' ||
    s === 'in process' ||
    s === 'out_for_delivery' ||
    s === 'out for delivery' ||
    s === 'ready' ||
    s === 'packed' ||
    s === 'shipped' ||
    s === 'in_transit' ||
    s === 'dispatched' ||
    s === 'backordered'
  ) {
    return 3; // Step 1, 2, & 3 active (Warehouse)
  }
  if (s === 'confirmed' || s === 'received') {
    return 2; // Step 1 & 2 active (Placed, Confirmed)
  }
  // Pending / Pending Review / Unpaid
  return 1; // Step 1 active (Placed)
};

export default function OrdersTab({
  orders = [],
  setOrders,
  filteredOrders = [],
  ordersTabFilter = 'To Pay',
  setOrdersTabFilter,
  onSelectOrder,
  onLeaveFeedback,
  onStartShopping,
  onReorder,
  onCancelOrder,
  onRefreshOrders,
}) {
  const [initialLoading, setInitialLoading] = useState(orders.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const onRefreshOrdersRef = useRef(onRefreshOrders);
  onRefreshOrdersRef.current = onRefreshOrders;
  const setOrdersRef = useRef(setOrders);
  setOrdersRef.current = setOrders;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Core order fetch execution (strictly isolated with zero external state dependencies)
  const executeOrderFetch = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isInitial && (!ordersRef.current || ordersRef.current.length === 0)) {
      setInitialLoading(true);
    }
    setFetchError(null);

    try {
      if (onRefreshOrdersRef.current) {
        await onRefreshOrdersRef.current();
      } else {
        const latest = await getMobileOrders();
        if (isMountedRef.current && setOrdersRef.current && Array.isArray(latest)) {
          setOrdersRef.current(latest);
        }
      }
      if (isMountedRef.current) {
        setFetchError(null);
      }
    } catch (err) {
      console.warn('[OrdersTab] Orders fetch failed:', err?.message || err);
      if (isMountedRef.current) {
        setFetchError(err?.message || 'Unable to connect to orders service');
      }
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Dedicated pull-to-refresh handler (only user gesture triggers refreshing = true)
  const handlePullRefresh = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setRefreshing(true);
    setFetchError(null);

    try {
      if (onRefreshOrdersRef.current) {
        await onRefreshOrdersRef.current();
      } else {
        const latest = await getMobileOrders();
        if (isMountedRef.current && setOrdersRef.current && Array.isArray(latest)) {
          setOrdersRef.current(latest);
        }
      }
      if (isMountedRef.current) {
        setFetchError(null);
      }
    } catch (err) {
      console.warn('[OrdersTab] Pull-to-refresh failed:', err?.message || err);
      if (isMountedRef.current) {
        setFetchError(err?.message || 'Unable to refresh orders. Check network connection.');
      }
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setRefreshing(false);
        setInitialLoading(false);
      }
    }
  }, []);

  // 1. Strictly run once on component mount (empty dependency array [])
  useEffect(() => {
    executeOrderFetch(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Strictly run when user switches active order tabs / memoized status filter
  const activeTabRef = useRef(ordersTabFilter);
  useEffect(() => {
    if (activeTabRef.current !== ordersTabFilter) {
      activeTabRef.current = ordersTabFilter;
      setFetchError(null);
      executeOrderFetch(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersTabFilter]);

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

      {/* 3. Orders Scrollable List with Pull-to-Refresh */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          s.scroll,
          (initialLoading || (fetchError && orders.length === 0) || (!initialLoading && filteredOrders.length === 0)) && s.centerScrollContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            colors={[PALETTE.primary || '#f97316']}
            tintColor={PALETTE.primary || '#f97316'}
          />
        }
      >
        {initialLoading && orders.length === 0 ? (
          /* Dedicated Centered Initial Loading Indicator */
          <View style={s.loadingContainer}>
            <View style={s.loadingSpinnerWrapper}>
              <ActivityIndicator size="large" color={PALETTE.primary || '#f97316'} />
            </View>
            <Text style={s.loadingTitle}>Loading your orders...</Text>
            <Text style={s.loadingSubtitle}>
              Checking live delivery & stage tracking status
            </Text>
          </View>
        ) : fetchError && orders.length === 0 ? (
          /* Dedicated Error & Network Retry UI */
          <View style={s.errorContainer}>
            <View style={s.errorIconCircle}>
              <Ionicons name="cloud-offline-outline" size={42} color="#EF4444" />
            </View>
            <Text style={s.errorTitle}>Unable to Load Orders</Text>
            <Text style={s.errorMessage}>
              {fetchError || 'Could not connect to the orders service. Please verify your connection.'}
            </Text>
            <TouchableOpacity
              style={s.retryBtn}
              onPress={() => executeOrderFetch(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="reload-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={s.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : filteredOrders.length === 0 ? (
          /* Empty State: ONLY renders after data fetching is completely finished and orders list is verified empty */
          <EmptyState
            icon="receipt-outline"
            title="No orders in this stage"
            message={`Your ${ordersTabFilter} orders will appear here automatically with live tracking.`}
            actionLabel="Browse Construction Materials"
            onAction={onStartShopping}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {/* If pull-to-refresh had an error while existing orders are shown, render a subtle warning banner */}
            {fetchError ? (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
                <Text style={s.errorBannerText} numberOfLines={1}>{fetchError}</Text>
                <TouchableOpacity onPress={handlePullRefresh}>
                  <Text style={s.errorBannerRetry}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {filteredOrders.map((ord) => {
              const rawStatus = (ord.status || 'pending').toLowerCase().trim();
              const isCompleted = rawStatus === 'completed' || rawStatus === 'delivered';
              const isPending =
                rawStatus === 'pending' ||
                rawStatus === 'pending review' ||
                rawStatus === 'pending_review' ||
                rawStatus === 'awaiting_confirmation' ||
                rawStatus === 'unpaid' ||
                rawStatus === 'to pay' ||
                rawStatus === 'to_pay';
              const isCancelled = rawStatus === 'cancelled' || rawStatus === 'canceled';

              // Hide Cancel button when order has already progressed past confirmation (Confirmed, Processing, Out for Delivery, Completed)
              const canCancel =
                isPending &&
                !['confirmed', 'received', 'processing', 'in process', 'in_process', 'ready', 'packed', 'out_for_delivery', 'out for delivery', 'dispatched', 'shipped', 'in_transit', 'delivered', 'completed'].includes(rawStatus);

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

                  {/* Dynamic Status Stepper Progression (Placed, Confirmed, Warehouse, Delivered) */}
                  {!isCancelled && (
                    <View style={s.stepperRow}>
                      {TRACKING_STEPS.map((st) => {
                        const activeCount = getOrderStepperActiveCount(ord.status);
                        const isDone = activeCount >= st.step;
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
                      {/* Cancel button: strictly hidden once order progressed past confirmation */}
                      {canCancel && onCancelOrder && (
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
  centerScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  loadingSpinnerWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PALETTE.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 13,
    color: PALETTE.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 28,
  },
  errorIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 6,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 13,
    color: PALETTE.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 300,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.primary || '#f97316',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    shadowColor: PALETTE.primary || '#f97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  retryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
  },
  errorBannerRetry: {
    fontSize: 12,
    fontWeight: '800',
    color: PALETTE.primary || '#f97316',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },

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
