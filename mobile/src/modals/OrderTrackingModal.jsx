import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { styles } from '../styles/appStyles';

export default function OrderTrackingModal({ order, onClose, onLeaveFeedback }) {
  if (!order) return null;


  const rawStatus = (order.status || 'pending').toLowerCase();

  // Determine active stage index:
  // 0 = pending, 1 = confirmed, 2 = processing/ready, 3 = out_for_delivery, 4 = completed
  let currentStageIndex = 0;
  if (rawStatus === 'confirmed') currentStageIndex = 1;
  else if (rawStatus === 'processing' || rawStatus === 'received') currentStageIndex = 2;
  else if (rawStatus === 'ready' || rawStatus === 'packed') currentStageIndex = 2;
  else if (rawStatus === 'out_for_delivery' || rawStatus === 'in_transit' || rawStatus === 'shipped') currentStageIndex = 3;
  else if (rawStatus === 'completed' || rawStatus === 'delivered') currentStageIndex = 4;

  const stages = [
    {
      title: 'Order Placed & Queued',
      subtitle: 'Order submitted, awaiting staff confirmation',
      stageIdx: 0,
    },
    {
      title: 'Order Confirmed by Store',
      subtitle: 'Staff confirmed materials and scheduled delivery',
      stageIdx: 1,
    },
    {
      title: 'Warehouse Picking & Preparation',
      subtitle: 'Materials quality-checked, bundled, and staged',
      stageIdx: 2,
    },
    {
      title: 'Out for Delivery (In Transit)',
      subtitle: 'Delivery truck en route to your destination',
      stageIdx: 3,
    },
    {
      title: 'Delivered & Received',
      subtitle: 'Materials safely unloaded and settled',
      stageIdx: 4,
    },
  ];

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '85%',
          }}
        >
          {/* Header */}
          <View style={styles.modalNav}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>
                Live Delivery Tracker 🚚
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
                Order #{order.order_number || order.id}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 20, color: '#94a3b8' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Driver & Truck Info */}
            <View style={styles.driverCard}>
              <Text style={{ fontSize: 32, marginRight: 12 }}>🚛</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>
                  {order.driver || 'Kuya Mark (Isuzu Elf Plate NCI-8921)'}
                </Text>
                <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                  JEM Logistics Truck #4 • Dispatch Laguna
                </Text>
                <Text style={{ fontSize: 11, color: '#38bdf8', marginTop: 2, fontWeight: '700' }}>
                  Destination: {order.delivery_address || 'Santa Rosa, Laguna'}
                </Text>
              </View>
            </View>

            {/* Dynamic Delivery Stages */}
            <View
              style={{
                marginVertical: 16,
                backgroundColor: '#f8fafc',
                padding: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#e2e8f0',
              }}
            >
              <Text style={{ fontWeight: '800', color: '#0f172a', marginBottom: 12, fontSize: 14 }}>
                Delivery Progress &amp; Timeline:
              </Text>

              {stages.map((st, i) => {
                const isPassed = currentStageIndex > st.stageIdx;
                const isCurrent = currentStageIndex === st.stageIdx;

                let icon = '○';
                let textColor = '#94a3b8';
                let dotColor = '#cbd5e1';

                if (isPassed) {
                  icon = '✓';
                  textColor = '#059669';
                  dotColor = '#10b981';
                } else if (isCurrent) {
                  icon = '●';
                  textColor = '#ea580c';
                  dotColor = '#f97316';
                }

                return (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      marginBottom: i === stages.length - 1 ? 0 : 12,
                    }}
                  >
                    <View style={{ width: 22, alignItems: 'center', marginRight: 8, marginTop: 1 }}>
                      <Text style={{ color: dotColor, fontWeight: '900', fontSize: 14 }}>
                        {icon}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: isCurrent || isPassed ? '800' : '600', color: textColor, fontSize: 13 }}>
                        {st.title} {isCurrent && '(Current Stage)'}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                        {st.subtitle}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {currentStageIndex === 4 && onLeaveFeedback && (

              <TouchableOpacity
                style={[styles.primaryAuthBtn, { backgroundColor: '#ea580c', marginBottom: 10 }]}
                onPress={() => {
                  onClose();
                  onLeaveFeedback(order);
                }}
              >
                <Text style={styles.primaryAuthBtnText}>⭐ Rate Delivery &amp; Leave Feedback</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.primaryAuthBtn, { backgroundColor: '#f1f5f9' }]}
              onPress={onClose}
            >
              <Text style={[styles.primaryAuthBtnText, { color: '#334155' }]}>Close Tracking</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

