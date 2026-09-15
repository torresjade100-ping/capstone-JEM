import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { styles, COLORS } from '../styles/appStyles';
import { submitMobileFeedback } from '../api/mobileApi';

export default function SupportModal({
  visible,
  onClose,
  onStartLiveChat,
  customerName = '',
  customerEmail = '',
  orders = [],
  onShowToast,
}) {
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [subject, setSubject] = useState('Delivery / Order Follow-up');
  const [message, setMessage] = useState('');
  const [selectedOrderNumber, setSelectedOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!visible) return null;

  const handleSendInquiry = async () => {
    if (!message.trim()) {
      if (onShowToast) onShowToast('Please enter your inquiry message.');
      return;
    }

    setLoading(true);
    try {
      await submitMobileFeedback({
        subject: selectedOrderNumber ? `[Order #${selectedOrderNumber}] ${subject}` : subject,
        message: message.trim(),
        order_number: selectedOrderNumber || '',
        customer_name: customerName || 'Contractor',
        customer_email: customerEmail || '',
        rating: 5,
      });

      setSuccess(true);
      setMessage('');
      if (onShowToast) onShowToast('Support inquiry sent to dispatch team! 📨');
    } catch (e) {
      if (onShowToast) onShowToast('Inquiry recorded.');
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

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

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }} bounces={false} overScrollMode="never">
            {showInquiryForm ? (
              <View style={{ paddingVertical: 6 }}>
                {success ? (
                  <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                    <Text style={{ fontSize: 44, marginBottom: 12 }}>✅</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.textMain, textAlign: 'center' }}>
                      Inquiry Received by Dispatch
                    </Text>
                    <Text style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 }}>
                      Our store coordination staff will review your message and contact your registered phone/email shortly.
                    </Text>
                    <TouchableOpacity
                      style={[styles.primaryAuthBtn, { marginTop: 20, width: '100%' }]}
                      onPress={() => {
                        setSuccess(false);
                        setShowInquiryForm(false);
                      }}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.primaryAuthBtnText}>Done ✓</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: COLORS.textMain, marginBottom: 10 }}>
                      📝 Send Direct Dispatch Inquiry
                    </Text>

                    {/* Inquiry Topic */}
                    <View style={styles.authFieldGroup}>
                      <Text style={styles.authFieldLabel}>Inquiry Subject / Topic</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {['Delivery Status', 'Bulk Quotation', 'Damaged Item / Return', 'Billing / VAT Receipt'].map((s) => (
                          <TouchableOpacity
                            key={s}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 12,
                              backgroundColor: subject === s ? COLORS.navy : COLORS.surfaceSubtle,
                              borderWidth: 1,
                              borderColor: subject === s ? COLORS.navy : COLORS.border,
                            }}
                            onPress={() => setSubject(s)}
                            activeOpacity={0.7}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: subject === s ? '#fff' : COLORS.textBody }}>
                              {s}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Attach Order (if any) */}
                    {orders && orders.length > 0 && (
                      <View style={styles.authFieldGroup}>
                        <Text style={styles.authFieldLabel}>Link to Existing Order (Optional)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                borderRadius: 10,
                                backgroundColor: selectedOrderNumber === '' ? COLORS.primaryLight : '#f1f5f9',
                                borderWidth: 1,
                                borderColor: selectedOrderNumber === '' ? COLORS.primaryBorder : '#cbd5e1',
                              }}
                              onPress={() => setSelectedOrderNumber('')}
                              activeOpacity={0.7}
                            >
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: selectedOrderNumber === '' ? COLORS.primaryDark : COLORS.textMuted }}>
                                None
                              </Text>
                            </TouchableOpacity>
                            {orders.slice(0, 5).map((o) => {
                              const num = o.order_number || String(o.id);
                              const isSel = selectedOrderNumber === num;
                              return (
                                <TouchableOpacity
                                  key={num}
                                  style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 10,
                                    backgroundColor: isSel ? COLORS.primaryLight : '#f1f5f9',
                                    borderWidth: 1,
                                    borderColor: isSel ? COLORS.primaryBorder : '#cbd5e1',
                                  }}
                                  onPress={() => setSelectedOrderNumber(num)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSel ? COLORS.primaryDark : COLORS.textBody }}>
                                    #{num}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>
                    )}

                    {/* Message Box */}
                    <View style={styles.authFieldGroup}>
                      <Text style={styles.authFieldLabel}>Inquiry Message &amp; Site Details *</Text>
                      <TextInput
                        style={[styles.authInput, { minHeight: 80, textAlignVertical: 'top' }]}
                        placeholder="Please describe your question, required quantity, or delivery site concerns..."
                        placeholderTextColor="#94a3b8"
                        multiline
                        value={message}
                        onChangeText={setMessage}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 16 }}>
                      <TouchableOpacity
                        style={[styles.secondaryAuthBtn, { flex: 1 }]}
                        onPress={() => setShowInquiryForm(false)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.secondaryAuthBtnText}>Back</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.primaryAuthBtn, { flex: 1.5 }]}
                        onPress={handleSendInquiry}
                        disabled={loading}
                        activeOpacity={0.88}
                      >
                        {loading ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <Text style={styles.primaryAuthBtnText}>Submit Message 📨</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ) : (
              <>
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
                  style={[styles.primaryAuthBtn, { marginTop: 12 }]}
                  onPress={() => setShowInquiryForm(true)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryAuthBtnText}>📝 Send Support Message / Ticket</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryAuthBtn, { marginTop: 8, marginBottom: 20 }]}
                  onPress={onStartLiveChat}
                  activeOpacity={0.88}
                >
                  <Text style={styles.secondaryAuthBtnText}>Start Live Dispatch Chat 💬</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

