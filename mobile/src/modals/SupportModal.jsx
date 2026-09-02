import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { styles, COLORS } from '../styles/appStyles';

export default function SupportModal({ visible, onClose, onStartLiveChat }) {
  if (!visible) return null;

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheetContainer}>
          <View style={styles.sheetDragHandle} />

          <View style={styles.modalNav}>
            <View>
              <Text style={styles.modalNavTitle}>Help &amp; Contractor Support ❓</Text>
              <Text style={{ fontSize: 11.5, color: COLORS.textMuted, fontWeight: '500' }}>
                Direct assistance for hardware orders &amp; site deliveries
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            <View style={{ gap: 10, marginVertical: 6 }}>
              <View
                style={{
                  padding: 14,
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ fontWeight: '900', color: COLORS.textMain, fontSize: 14 }}>
                  📞 Contractor Dispatch Hotline
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.primaryDark, marginTop: 4, fontWeight: '800' }}>
                  (049) 562-8899 / +63 917 888 5364
                </Text>
                <Text style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 }}>
                  Direct line to warehouse staging &amp; freight trucks (Mon-Sat 7:00 AM - 5:30 PM)
                </Text>
              </View>

              <View
                style={{
                  padding: 14,
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ fontWeight: '900', color: COLORS.textMain, fontSize: 14 }}>
                  ✉️ Customer &amp; Billing Email
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textBody, marginTop: 4, fontWeight: '700' }}>
                  support@jemhardware.com
                </Text>
                <Text style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 }}>
                  Official quotation requests, VAT receipts &amp; enterprise accounts
                </Text>
              </View>

              <View
                style={{
                  padding: 14,
                  backgroundColor: COLORS.primaryLight,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: COLORS.primaryBorder,
                }}
              >
                <Text style={{ fontWeight: '900', color: COLORS.primaryDark, fontSize: 13.5 }}>
                  📍 Physical Store &amp; Main Yard
                </Text>
                <Text style={{ fontSize: 12.5, color: COLORS.textBody, marginTop: 3, fontWeight: '600' }}>
                  National Highway, Santa Rosa, Laguna, Philippines
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryAuthBtn, { marginTop: 14, marginBottom: 20 }]}
              onPress={onStartLiveChat}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryAuthBtnText}>Start Live Dispatch Chat 💬</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
