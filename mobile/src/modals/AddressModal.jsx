import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { styles } from '../styles/appStyles';

export default function AddressModal({ visible, onClose, onShowToast }) {
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
            maxHeight: '75%',
          }}
        >
          <View style={styles.modalNav}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>
              📍 Delivery Addresses
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 20, color: '#94a3b8' }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ paddingVertical: 10 }}>
            <View
              style={{
                padding: 14,
                backgroundColor: '#fff7ed',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#fed7aa',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontWeight: '800', color: '#ea580c' }}>
                Primary Job Site (Default)
              </Text>
              <Text style={{ fontSize: 13, color: '#0f172a', marginTop: 4 }}>
                Block 12 Lot 8, Villa San Isidro, Santa Rosa, Laguna
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Contact: 0917-123-4567
              </Text>
            </View>
            <TouchableOpacity
              style={styles.secondaryAuthBtn}
              onPress={() => onShowToast('Address Manager')}
            >
              <Text style={styles.secondaryAuthBtnText}>+ Add New Site Address</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
