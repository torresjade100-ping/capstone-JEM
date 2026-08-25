import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles/appStyles';

const STATUS_FILTERS = ['To Pay', 'To Process', 'To Ship', 'To Receive', 'Completed'];

export default function OrdersTab({
  orders,
  filteredOrders,
  ordersTabFilter,
  setOrdersTabFilter,
  onSelectOrder,
  onLeaveFeedback,
  onStartShopping,
}) {
  return (
    <View>
      <View style={styles.ordersTopHeader}>
        <Text style={styles.ordersTopTitle}>My Orders</Text>
        <Text style={styles.ordersTopSubtitle}>Track and manage your orders</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.ordersFilterBar}>
        {STATUS_FILTERS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.ordersFilterTab,
              ordersTabFilter === tab && styles.ordersFilterTabActive,
            ]}
            onPress={() => setOrdersTabFilter(tab)}
          >
            <Text
              style={[
                styles.ordersFilterTabText,
                ordersTabFilter === tab && styles.ordersFilterTabTextActive,
              ]}
            >
              {tab}
            </Text>
            {ordersTabFilter === tab && <View style={styles.ordersActiveIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.ordersEmptyContainer}>
          <View style={styles.ordersEmptyIconCircle}>
            <Text style={{ fontSize: 56 }}>📦</Text>
          </View>
          <Text style={styles.ordersEmptyTitle}>No orders here</Text>
          <Text style={styles.ordersEmptySubtitle}>
            Orders in this status will appear here.
          </Text>
          <TouchableOpacity style={styles.startShoppingBtn} onPress={onStartShopping}>
            <Text style={styles.startShoppingBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ padding: 16 }}>
          {filteredOrders.map((ord) => {
            const isCompleted = (ord.status || '').toLowerCase() === 'completed' || (ord.status || '').toLowerCase() === 'delivered';
            return (
              <View key={ord.id || ord.order_number} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={{ fontWeight: '800', fontSize: 14, color: '#0f172a' }}>
                    {ord.order_number || ord.id}
                  </Text>
                  <Text style={{ fontWeight: '700', fontSize: 12, color: isCompleted ? '#059669' : '#f97316' }}>
                    {ord.status}
                  </Text>
                </View>

                {(ord.items || []).map((it, idx) => (
                  <Text key={idx} style={{ fontSize: 13, color: '#475569', marginVertical: 2 }}>
                    • {it.name} (x{it.qty || it.quantity}) - ₱{((it.price || it.unit_price) * (it.qty || it.quantity)).toLocaleString()}
                  </Text>
                ))}

                <View style={styles.orderFooter}>
                  <Text style={{ fontWeight: '800', fontSize: 15, color: '#0f172a' }}>
                    Total: ₱{Number(ord.total || 0).toLocaleString()}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {isCompleted && (
                      <TouchableOpacity
                        style={[
                          styles.trackBtn,
                          {
                            backgroundColor: ord.has_feedback ? '#ecfdf5' : '#ea580c',
                            borderWidth: ord.has_feedback ? 1 : 0,
                            borderColor: '#a7f3d0',
                          },
                        ]}
                        onPress={() => onLeaveFeedback && onLeaveFeedback(ord)}
                        disabled={ord.has_feedback}
                      >
                        <Text
                          style={[
                            styles.trackBtnText,
                            { color: ord.has_feedback ? '#059669' : '#fff' },
                          ]}
                        >
                          {ord.has_feedback ? '✓ Rated ⭐' : '⭐ Feedback'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.trackBtn}
                      onPress={() => onSelectOrder(ord)}
                    >
                      <Text style={styles.trackBtnText}>Live Tracker 📍</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
