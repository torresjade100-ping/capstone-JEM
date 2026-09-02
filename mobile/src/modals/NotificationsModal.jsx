import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { styles, COLORS } from '../styles/appStyles';

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    title: '🚚 Order Out for Delivery',
    desc: 'Your Isuzu freight truck is en route to site (Block 12 Lot 8, Santa Rosa, Laguna).',
    time: '15m ago',
    type: 'order',
    isUnread: true,
  },
  {
    id: 2,
    title: '🏷️ Flash Sale: 25% Off Cement',
    desc: 'Holcim & Republic Portland cement bags on special contractor promo today!',
    time: '2h ago',
    type: 'promo',
    isUnread: true,
  },
  {
    id: 3,
    title: '🧱 Restock Alert: 12mm Steel Rebar',
    desc: 'SteelAsia Grade 40 12mm reinforcement bars restocked in Laguna warehouse.',
    time: '1d ago',
    type: 'promo',
    isUnread: false,
  },
  {
    id: 4,
    title: '🎉 Welcome to JEM Hardware',
    desc: 'Thank you for joining our contractor network. Enjoy fast trade dispatch!',
    time: '3d ago',
    type: 'general',
    isUnread: false,
  },
];

export default function NotificationsModal({ visible, onClose }) {
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  if (!visible) return null;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  };

  const filteredList = notifications.filter((n) => {
    if (filter === 'orders') return n.type === 'order';
    if (filter === 'promos') return n.type === 'promo';
    return true;
  });

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheetContainer}>
          <View style={styles.sheetDragHandle} />

          {/* Modal Header */}
          <View style={styles.modalNav}>
            <View>
              <Text style={styles.modalNavTitle}>Notifications &amp; Alerts 🔔</Text>
              <Text style={{ fontSize: 11.5, color: COLORS.textMuted, fontWeight: '500' }}>
                Stay updated on deliveries &amp; trade discounts
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Segmented Filter Pills & Mark Read Action */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginVertical: 10,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'orders', label: '🚚 Orders' },
                { id: 'promos', label: '🏷️ Promos' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: filter === tab.id ? COLORS.navy : COLORS.surfaceSubtle,
                  }}
                  onPress={() => setFilter(tab.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: filter === tab.id ? '#ffffff' : COLORS.textBody,
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={markAllAsRead} activeOpacity={0.7}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: COLORS.primaryDark }}>
                Mark all read
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            {filteredList.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>📭</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.textMain }}>
                  No notifications in this category
                </Text>
              </View>
            ) : (
              filteredList.map((n) => (
                <View
                  key={n.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    backgroundColor: n.isUnread ? COLORS.primaryLight : COLORS.surface,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: n.isUnread ? COLORS.primaryBorder : COLORS.borderLight,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.textMain }}>
                        {n.title}
                      </Text>
                      <Text style={{ fontSize: 11, color: COLORS.textLight, fontWeight: '600' }}>
                        {n.time}
                      </Text>
                    </View>

                    <Text style={{ fontSize: 12.5, color: COLORS.textBody, marginTop: 4, lineHeight: 18 }}>
                      {n.desc}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
