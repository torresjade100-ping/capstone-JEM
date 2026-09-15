import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { styles, COLORS } from '../styles/appStyles';
import {
  getCustomerAddresses,
  saveCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
} from '../api/mobileApi';

const DEFAULT_FALLBACK_ADDRESSES = [
  {
    id: 1,
    tag: 'Primary Job Site (Default)',
    address: 'Block 12 Lot 8, Villa San Isidro, Santa Rosa, Laguna',
    contact_person: 'Kuya Juan / Site Foreman',
    phone: '0917-123-4567',
    notes: 'Access via Gate 2 for heavy delivery trucks',
    is_default: true,
  },
  {
    id: 2,
    tag: 'Secondary Project Site',
    address: 'Lot 4 Phase 3, Greenbreeze Subdivision, Biñan, Laguna',
    contact_person: 'Engr. Ramos',
    phone: '0918-555-6789',
    notes: 'Unloading area ready near structural framing',
    is_default: false,
  },
];

export default function AddressModal({
  visible,
  onClose,
  customerEmail,
  onSelectAddress,
  selectedAddress,
  onShowToast,
}) {
  const [addresses, setAddresses] = useState(DEFAULT_FALLBACK_ADDRESSES);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // New Address Form State
  const [tag, setTag] = useState('Job Site');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (visible) {
      loadAddresses();
    }
  }, [visible, customerEmail]);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await getCustomerAddresses(customerEmail);
      if (Array.isArray(data) && data.length > 0) {
        setAddresses(data);
      } else {
        setAddresses(DEFAULT_FALLBACK_ADDRESSES);
      }
    } catch (e) {
      setAddresses(DEFAULT_FALLBACK_ADDRESSES);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewAddress = async () => {
    if (!address.trim()) {
      if (onShowToast) onShowToast('Please enter the delivery address.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tag: tag || 'Job Site',
        address: address.trim(),
        contact_person: contactPerson.trim() || 'Site Foreman',
        phone: phone.trim() || '0917-000-0000',
        notes: notes.trim() || 'Unloading area near gate',
        is_default: isDefault,
        customer_email: customerEmail || '',
      };

      const res = await saveCustomerAddress(payload, customerEmail);
      if (res) {
        setAddresses((prev) => (isDefault ? [res, ...prev.map((a) => ({ ...a, is_default: false }))] : [res, ...prev]));
      } else {
        const localNew = { ...payload, id: Date.now() };
        setAddresses((prev) => (isDefault ? [localNew, ...prev.map((a) => ({ ...a, is_default: false }))] : [localNew, ...prev]));
      }

      setShowAddForm(false);
      setAddress('');
      setContactPerson('');
      setPhone('');
      setNotes('');
      setIsDefault(false);
      if (onShowToast) onShowToast('Destination address added successfully! 📍');
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to save address.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (addr) => {
    try {
      if (addr.id && typeof addr.id === 'number' && addr.id < 10000) {
        await setDefaultCustomerAddress(addr.id);
      }
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === addr.id,
        }))
      );
      if (onShowToast) onShowToast(`"${addr.tag}" set as default address.`);
    } catch (e) {
      if (onShowToast) onShowToast('Default updated locally.');
    }
  };

  const handleDelete = async (addrId) => {
    try {
      if (addrId && typeof addrId === 'number' && addrId < 10000) {
        await deleteCustomerAddress(addrId);
      }
      setAddresses((prev) => prev.filter((a) => a.id !== addrId));
      if (onShowToast) onShowToast('Address deleted.');
    } catch (e) {
      setAddresses((prev) => prev.filter((a) => a.id !== addrId));
      if (onShowToast) onShowToast('Address removed.');
    }
  };

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
                Manage destinations for heavy freight truck dispatch
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }} bounces={false} overScrollMode="never">
            {showAddForm ? (
              /* Add New Address Form */
              <View style={{ paddingVertical: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: COLORS.textMain, marginBottom: 10 }}>
                  + Add New Job Site Destination
                </Text>

                <View style={styles.authFieldGroup}>
                  <Text style={styles.authFieldLabel}>Location Label / Site Tag</Text>
                  <TextInput
                    style={styles.authInput}
                    placeholder="e.g. Phase 2 Residential Site / Main Yard"
                    placeholderTextColor="#94a3b8"
                    value={tag}
                    onChangeText={setTag}
                  />
                </View>

                <View style={styles.authFieldGroup}>
                  <Text style={styles.authFieldLabel}>Exact Street / Barangay / City Address *</Text>
                  <TextInput
                    style={[styles.authInput, { minHeight: 60, textAlignVertical: 'top' }]}
                    placeholder="e.g. Block 15 Lot 22, Nuvali Blvd, Santa Rosa, Laguna"
                    placeholderTextColor="#94a3b8"
                    multiline
                    value={address}
                    onChangeText={setAddress}
                  />
                </View>

                <View style={styles.authFieldGroup}>
                  <Text style={styles.authFieldLabel}>Contact Receiver / Site Engineer</Text>
                  <TextInput
                    style={styles.authInput}
                    placeholder="e.g. Engr. Ramos / Foreman Ben"
                    placeholderTextColor="#94a3b8"
                    value={contactPerson}
                    onChangeText={setContactPerson}
                  />
                </View>

                <View style={styles.authFieldGroup}>
                  <Text style={styles.authFieldLabel}>Contact Phone Number</Text>
                  <TextInput
                    style={styles.authInput}
                    placeholder="e.g. 0917-123-4567"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                <View style={styles.authFieldGroup}>
                  <Text style={styles.authFieldLabel}>Unloading / Access Instructions</Text>
                  <TextInput
                    style={styles.authInput}
                    placeholder="e.g. Gate 2 access for 6-wheeler truck"
                    placeholderTextColor="#94a3b8"
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 14,
                    gap: 8,
                  }}
                  onPress={() => setIsDefault(!isDefault)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: isDefault ? COLORS.primary : COLORS.border,
                      backgroundColor: isDefault ? COLORS.primary : '#fff',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {isDefault && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textMain }}>
                    Set as default destination for orders
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 16 }}>
                  <TouchableOpacity
                    style={[styles.secondaryAuthBtn, { flex: 1 }]}
                    onPress={() => setShowAddForm(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.secondaryAuthBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryAuthBtn, { flex: 1.5 }]}
                    onPress={handleSaveNewAddress}
                    disabled={saving}
                    activeOpacity={0.88}
                  >
                    {saving ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.primaryAuthBtnText}>Save Address 📍</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Address List */
              <>
                {loading ? (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                ) : (
                  addresses.map((addr) => {
                    const isSelected = selectedAddress && (selectedAddress.id === addr.id || selectedAddress.address === addr.address);
                    const isDef = addr.is_default || addr.isDefault;

                    return (
                      <View
                        key={addr.id || addr.address}
                        style={{
                          padding: 14,
                          backgroundColor: isDef || isSelected ? COLORS.primaryLight : COLORS.surface,
                          borderRadius: 16,
                          borderWidth: 1.5,
                          borderColor: isSelected ? COLORS.primaryDark : (isDef ? COLORS.primaryBorder : COLORS.border),
                          marginBottom: 12,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontWeight: '900', color: isDef ? COLORS.primaryDark : COLORS.textMain, fontSize: 13.5 }}>
                            {addr.tag || 'Job Site Destination'}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            {isDef && (
                              <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '900' }}>DEFAULT</Text>
                              </View>
                            )}
                            {isSelected && (
                              <View style={{ backgroundColor: '#0284c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '900' }}>ACTIVE FOR CART</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <Text style={{ fontSize: 13.5, color: COLORS.textMain, marginTop: 6, fontWeight: '700' }}>
                          {addr.address}
                        </Text>
                        {(addr.contact_person || addr.contact) && (
                          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 3 }}>
                            📞 {addr.contact_person || addr.contact} {addr.phone ? `(${addr.phone})` : ''}
                          </Text>
                        )}
                        {addr.notes && (
                          <Text style={{ fontSize: 11.5, color: '#0369a1', marginTop: 2, fontWeight: '600' }}>
                            ℹ️ {addr.notes}
                          </Text>
                        )}

                        {/* Action Buttons Row */}
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10, borderTopWidth: 1, borderColor: isDef ? COLORS.primaryBorder : COLORS.borderLight, paddingTop: 8 }}>
                          {onSelectAddress && (
                            <TouchableOpacity
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                backgroundColor: COLORS.primary,
                                borderRadius: 8,
                              }}
                              onPress={() => {
                                onSelectAddress(addr);
                                onClose();
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#fff' }}>
                                Deliver Here ✓
                              </Text>
                            </TouchableOpacity>
                          )}

                          {!isDef && (
                            <TouchableOpacity
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                backgroundColor: '#f1f5f9',
                                borderWidth: 1,
                                borderColor: '#cbd5e1',
                                borderRadius: 8,
                              }}
                              onPress={() => handleSetDefault(addr)}
                              activeOpacity={0.8}
                            >
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: COLORS.textBody }}>
                                Set Default
                              </Text>
                            </TouchableOpacity>
                          )}

                          {addresses.length > 1 && (
                            <TouchableOpacity
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                backgroundColor: '#fee2e2',
                                borderWidth: 1,
                                borderColor: '#fca5a5',
                                borderRadius: 8,
                              }}
                              onPress={() => handleDelete(addr.id)}
                              activeOpacity={0.8}
                            >
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#dc2626' }}>
                                Delete
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}

                <TouchableOpacity
                  style={[styles.secondaryAuthBtn, { marginVertical: 10 }]}
                  onPress={() => setShowAddForm(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryAuthBtnText}>+ Add New Site Destination</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

