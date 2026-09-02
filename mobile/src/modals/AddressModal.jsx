import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { styles, COLORS } from '../styles/appStyles';

const SAVED_ADDRESSES = [
  {
    id: 1,
    tag: 'Primary Job Site (Default)',
    address: 'Block 12 Lot 8, Villa San Isidro, Santa Rosa, Laguna',
    contact: 'Kuya Juan / Site Foreman (0917-123-4567)',
    notes: 'Access via Gate 2 for heavy delivery trucks',
    isDefault: true,
  },
  {
    id: 2,
    tag: 'Secondary Project Site',
    address: 'Lot 4 Phase 3, Greenbreeze Subdivision, Biñan, Laguna',
    contact: 'Engr. Ramos (0918-555-6789)',
    notes: 'Unloading area ready near structural framing',
    isDefault: false,
  },
];

export default function AddressModal({ visible, onClose, onShowToast }) {
  if (!visible) return null;

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheetContainer}>
          <View style={styles.sheetDragHandle} />

          <View style={styles.modalNav}>
            <View>
              <Text style={styles.modalNavTitle}>Job Site Delivery Addresses 📍</Text>
              <Text style={{ fontSize: 11.5, color: COLORS.textMuted, fontWeight: '500' }}>
                Manage destinations for heavy truck dispatch
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            {SAVED_ADDRESSES.map((addr) => (
              <View
                key={addr.id}
                style={{
                  padding: 14,
                  backgroundColor: addr.isDefault ? COLORS.primaryLight : COLORS.surface,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: addr.isDefault ? COLORS.primaryBorder : COLORS.border,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '900', color: addr.isDefault ? COLORS.primaryDark : COLORS.textMain, fontSize: 13 }}>
                    {addr.tag}
                  </Text>
                  {addr.isDefault && (
                    <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '900' }}>DEFAULT</Text>
                    </View>
                  )}
                </View>

                <Text style={{ fontSize: 13.5, color: COLORS.textMain, marginTop: 6, fontWeight: '700' }}>
                  {addr.address}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 3 }}>
                  📞 {addr.contact}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#0369a1', marginTop: 2, fontWeight: '600' }}>
                  ℹ️ {addr.notes}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.secondaryAuthBtn, { marginVertical: 10 }]}
              onPress={() => onShowToast('New Job Site Address Form')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryAuthBtnText}>+ Add New Site Destination</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
