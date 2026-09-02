import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { styles, COLORS } from '../styles/appStyles';

export default function OrderTrackingModal({ order, onClose, onLeaveFeedback }) {
  if (!order) return null;

  const rawStatus = (order.status || 'pending').toLowerCase();

  // Determine active stage index:
  // 0 = pending, 1 = confirmed, 2 = processing/ready, 3 = out_for_delivery, 4 = completed
  let currentStageIndex = 0;
  if (rawStatus === 'confirmed' || rawStatus === 'received') currentStageIndex = 1;
  else if (rawStatus === 'processing' || rawStatus === 'ready' || rawStatus === 'packed') currentStageIndex = 2;
  else if (rawStatus === 'out_for_delivery' || rawStatus === 'in_transit' || rawStatus === 'shipped') currentStageIndex = 3;
  else if (rawStatus === 'completed' || rawStatus === 'delivered') currentStageIndex = 4;

  const stages = [
    {
      title: 'Order Placed & Queued',
      subtitle: 'Order submitted to JEM Hardware, awaiting staff confirmation',
      icon: '🛒',
      stageIdx: 0,
    },
    {
      title: 'Confirmed by Store Staff',
      subtitle: 'Staff confirmed stock allocation & scheduled delivery route',
      icon: '📋',
      stageIdx: 1,
    },
    {
      title: 'Warehouse Staging & Quality Inspection',
      subtitle: 'Materials quality-checked, bundled, and loaded to freight truck',
      icon: '📦',
      stageIdx: 2,
    },
    {
      title: 'Out for Delivery (In Transit)',
      subtitle: 'Isuzu Elf heavy freight truck en route to your construction site',
      icon: '🚚',
      stageIdx: 3,
    },
    {
      title: 'Delivered & Completed',
      subtitle: 'Materials safely unloaded at jobsite and signed by receiver',
      icon: '✅',
      stageIdx: 4,
    },
  ];

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheetContainer}>
          {/* Drag Handle */}
          <View style={styles.sheetDragHandle} />

          {/* Modal Header */}
          <View style={styles.modalNav}>
            <View>
              <Text style={styles.modalNavTitle}>Live Delivery Tracker 📍</Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 }}>
                Order #{order.order_number || order.id} • {(order.payment_method || 'COD').toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Driver & Logistics Truck Card */}
            <View style={styles.driverCard}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <Text style={{ fontSize: 26 }}>🚛</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#ffffff' }}>
                  {order.driver || 'Kuya Mark (Isuzu Elf Plate NCI-8921)'}
                </Text>
                <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  JEM Logistics Fleet • Dispatch Station Laguna
                </Text>
                <Text style={{ fontSize: 11.5, color: '#38bdf8', marginTop: 4, fontWeight: '700' }}>
                  📍 Destination: {order.delivery_address || 'Job Site, Santa Rosa, Laguna'}
                </Text>
              </View>
            </View>

            {/* Vertical Progress Stepper */}
            <View
              style={{
                marginVertical: 16,
                backgroundColor: '#ffffff',
                padding: 16,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ fontWeight: '900', color: COLORS.textMain, marginBottom: 14, fontSize: 14 }}>
                Delivery Progress &amp; Milestone Timeline:
              </Text>

              {stages.map((st, i) => {
                const isPassed = currentStageIndex > st.stageIdx;
                const isCurrent = currentStageIndex === st.stageIdx;
                const isUpcoming = currentStageIndex < st.stageIdx;

                let iconBg = '#e2e8f0';
                let iconColor = '#64748b';
                let titleColor = COLORS.textMuted;
                let circleBorder = '#cbd5e1';

                if (isPassed) {
                  iconBg = COLORS.successBg;
                  iconColor = COLORS.success;
                  titleColor = COLORS.textMain;
                  circleBorder = COLORS.success;
                } else if (isCurrent) {
                  iconBg = COLORS.primaryLight;
                  iconColor = COLORS.primary;
                  titleColor = COLORS.primaryDark;
                  circleBorder = COLORS.primary;
                }

                return (
                  <View key={i} style={{ position: 'relative' }}>
                    {/* Connecting Line */}
                    {i < stages.length - 1 && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 28,
                          left: 17,
                          width: 2,
                          height: 38,
                          backgroundColor: isPassed ? COLORS.success : '#e2e8f0',
                          zIndex: 1,
                        }}
                      />
                    )}

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        marginBottom: i === stages.length - 1 ? 0 : 20,
                        zIndex: 2,
                      }}
                    >
                      {/* Step Circle Indicator */}
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: iconBg,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 12,
                          borderWidth: 2,
                          borderColor: circleBorder,
                        }}
                      >
                        <Text style={{ fontSize: isPassed ? 14 : isCurrent ? 14 : 12, fontWeight: '900', color: iconColor }}>
                          {isPassed ? '✓' : st.icon}
                        </Text>
                      </View>

                      {/* Step Text Info */}
                      <View style={{ flex: 1, paddingTop: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontWeight: isCurrent || isPassed ? '800' : '600', color: titleColor, fontSize: 13.5 }}>
                            {st.title}
                          </Text>
                          {isCurrent && (
                            <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '900' }}>CURRENT</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 }}>
                          {st.subtitle}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Order Items Preview */}
            <View
              style={{
                backgroundColor: COLORS.surfaceSubtle,
                borderRadius: 16,
                padding: 14,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.textMain, marginBottom: 8 }}>
                Ordered Materials ({(order.items || []).length} items):
              </Text>
              {(order.items || []).map((it, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                  <Text style={{ fontSize: 12.5, color: COLORS.textBody, flex: 1 }} numberOfLines={1}>
                    • {it.name} <Text style={{ color: COLORS.textMuted }}>× {it.qty || it.quantity || 1}</Text>
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.textMain }}>
                    ₱{((it.price || it.unit_price || 0) * (it.qty || it.quantity || 1)).toLocaleString()}
                  </Text>
                </View>
              ))}

              <View style={{ borderTopWidth: 1, borderColor: COLORS.border, marginTop: 8, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.textMain }}>Order Total:</Text>
                <Text style={{ fontSize: 15, fontWeight: '900', color: COLORS.primaryDark }}>
                  ₱{Number(order.total || 0).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* If Delivered -> Leave Review Button */}
            {currentStageIndex === 4 && onLeaveFeedback && (
              <TouchableOpacity
                style={[styles.primaryAuthBtn, { backgroundColor: COLORS.primary, marginBottom: 10 }]}
                onPress={() => {
                  onClose();
                  onLeaveFeedback(order);
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryAuthBtnText}>⭐ Rate Delivery &amp; Leave Review</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.secondaryAuthBtn, { marginBottom: 10 }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryAuthBtnText}>Close Tracking</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
