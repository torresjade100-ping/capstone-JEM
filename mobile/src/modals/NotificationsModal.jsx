import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { styles } from '../styles/appStyles';

const SAMPLE_NOTIFICATIONS = [
  {
    title: 'Promo: 25% Off Cement',
    desc: 'Holcim & Republic cement bags on flash sale today!',
    time: '10m ago',
    icon: '🏷️',
  },
  {
    title: 'Order Out for Delivery',
    desc: 'Your Isuzu delivery truck is en route to site.',
    time: '1h ago',
    icon: '🚚',
  },
  {
    title: 'Welcome to JEM Hardware',
    desc: 'Thank you for joining our contractor network!',
    time: '1d ago',
    icon: '🎉',
  },
];

export default function NotificationsModal({ visible, onClose }) {
  if (!visible) return null;

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '80%',
          }}
        >
          <View style={styles.modalNav}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>
              🔔 Notifications
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 20, color: '#94a3b8' }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ paddingVertical: 10 }}>
            {SAMPLE_NOTIFICATIONS.map((n, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderColor: '#f1f5f9',
                }}
              >
                <Text style={{ fontSize: 24, marginRight: 12 }}>{n.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                    {n.title}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>{n.desc}</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{n.time}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
