import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles/appStyles';

export default function SupportModal({ visible, onClose, onStartLiveChat }) {
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
            maxHeight: '70%',
          }}
        >
          <View style={styles.modalNav}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>
              ❓ Help &amp; Support
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 20, color: '#94a3b8' }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingVertical: 14, gap: 12 }}>
            <View style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 12 }}>
              <Text style={{ fontWeight: '800', color: '#0f172a' }}>📞 Contractor Hotline</Text>
              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                (049) 562-8899 / 0917-888-JEM
              </Text>
            </View>
            <View style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 12 }}>
              <Text style={{ fontWeight: '800', color: '#0f172a' }}>✉️ Customer Care Email</Text>
              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                support@jemhardware.com
              </Text>
            </View>
            <TouchableOpacity style={styles.primaryAuthBtn} onPress={onStartLiveChat}>
              <Text style={styles.primaryAuthBtnText}>Start Live Chat 💬</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
