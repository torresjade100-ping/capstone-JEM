import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { styles, COLORS } from '../styles/appStyles';
import {
  getCustomerAddresses,
  saveCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
} from '../api/mobileApi';
import {
  DISPATCH_HUB,
  DELIVERY_CITY,
  DELIVERY_PROVINCE,
  DELIVERY_POSTAL_CODE,
  CDO_BARANGAYS,
  isWithinCDO,
  isValidCDOBarangay,
} from '../config/deliveryConfig';

const POPULAR_CDO_BARANGAYS = [
  'Balulang',
  'Carmen',
  'Kauswagan',
  'Nazareth',
  'Lapasan',
  'Macasandig',
  'Bulua',
  'Puerto',
  'Gusa',
  'Camaman-an',
  'Patag',
  'Iponan',
];

const DEFAULT_FALLBACK_ADDRESSES = [
  {
    id: 1,
    label: 'Home',
    tag: 'Home',
    recipient_name: 'Juan Dela Cruz',
    contact_person: 'Juan Dela Cruz',
    phone_number: '09171234567',
    phone: '09171234567',
    address_line1: 'Zone 1, Mabasa',
    barangay: 'Balulang',
    city: 'Cagayan de Oro City',
    province: 'Misamis Oriental',
    postal_code: '9000',
    formatted_address: 'Zone 1, Mabasa, Brgy. Balulang, Cagayan de Oro City, Misamis Oriental, 9000',
    address: 'Zone 1, Mabasa, Brgy. Balulang, Cagayan de Oro City, Misamis Oriental, 9000',
    delivery_instructions: 'Near Balulang Elementary School, call upon arrival',
    notes: 'Near Balulang Elementary School, call upon arrival',
    is_default: true,
  },
  {
    id: 2,
    label: 'Home',
    tag: 'Home',
    recipient_name: 'Maria Santos',
    contact_person: 'Maria Santos',
    phone_number: '09181234567',
    phone: '09181234567',
    address_line1: 'Block 4 Lot 12, Golden Glow North',
    barangay: 'Carmen',
    city: 'Cagayan de Oro City',
    province: 'Misamis Oriental',
    postal_code: '9000',
    formatted_address: 'Block 4 Lot 12, Golden Glow North, Brgy. Carmen, Cagayan de Oro City, Misamis Oriental, 9000',
    address: 'Block 4 Lot 12, Golden Glow North, Brgy. Carmen, Cagayan de Oro City, Misamis Oriental, 9000',
    delivery_instructions: 'Gate 1 entrance, leave with subdivision guard',
    notes: 'Gate 1 entrance, leave with subdivision guard',
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isTablet = windowWidth > 768;

  const [addresses, setAddresses] = useState(DEFAULT_FALLBACK_ADDRESSES);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState(null);

  // Address Form State (Strictly Restricted to CDO)
  const [recipientName, setRecipientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [barangay, setBarangay] = useState('');
  const [city] = useState(DELIVERY_CITY); // Fixed read-only
  const [province] = useState(DELIVERY_PROVINCE); // Fixed read-only
  const [postalCode, setPostalCode] = useState(DELIVERY_POSTAL_CODE);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Barangay Picker Modal State
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState('');

  const isPhoneComplete = phoneNumber.length === 11;

  useEffect(() => {
    if (visible) {
      loadAddresses();
      resetForm();
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

  const resetForm = () => {
    setEditingId(null);
    setRecipientName('');
    setPhoneNumber('');
    setAddressLine1('');
    setBarangay('');
    setPostalCode(DELIVERY_POSTAL_CODE);
    setDeliveryInstructions('');
    setIsDefault(false);
    setFormError(null);
    setShowAddForm(false);
    setShowBarangayModal(false);
    setBarangaySearch('');
  };

  const handleStartEdit = (addr) => {
    setEditingId(addr.id);
    setRecipientName(addr.recipient_name || addr.contact_person || addr.contact_name || '');
    const rawPhone = (addr.phone_number || addr.phone || addr.contact_phone || '')
      .replace(/[^0-9]/g, '')
      .slice(0, 11);
    setPhoneNumber(rawPhone);
    setAddressLine1(addr.address_line1 || addr.address || '');
    setBarangay(addr.barangay || '');
    setPostalCode(addr.postal_code || DELIVERY_POSTAL_CODE);
    setDeliveryInstructions(addr.delivery_instructions || addr.notes || '');
    setIsDefault(Boolean(addr.is_default || addr.isDefault));
    setFormError(null);
    setShowAddForm(true);
  };

  const handlePhoneChange = (text) => {
    const sanitized = text.replace(/[^0-9]/g, '').slice(0, 11);
    setPhoneNumber(sanitized);
    if (formError) setFormError(null);
  };

  const formatDisplayAddress = (addr) => {
    if (addr.formatted_address) return addr.formatted_address;
    const parts = [
      addr.address_line1 || addr.address,
      addr.barangay ? `Brgy. ${addr.barangay}` : null,
      addr.city || DELIVERY_CITY,
      addr.province || DELIVERY_PROVINCE,
      addr.postal_code || DELIVERY_POSTAL_CODE,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : (addr.address || '');
  };

  const validateForm = () => {
    if (!recipientName.trim()) {
      return 'Please enter the recipient full name / contact person.';
    }
    if (recipientName.trim().length > 100) {
      return 'Recipient name cannot exceed 100 characters.';
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length !== 11) {
      return 'Contact number must be exactly 11 digits.';
    }

    if (!addressLine1.trim()) {
      return 'House / Unit No., Street, and Building details are required.';
    }

    if (!barangay.trim()) {
      return 'Please select an official Cagayan de Oro City barangay.';
    }

    if (!isValidCDOBarangay(barangay.trim())) {
      return `"${barangay}" is not a recognized CDO barangay. Delivery is currently restricted to Cagayan de Oro City addresses only.`;
    }

    if (!isWithinCDO(city)) {
      return 'Delivery is currently restricted to Cagayan de Oro City addresses only.';
    }

    return null;
  };

  const handleSaveAddress = async () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      setFormError(errorMsg);
      if (onShowToast) onShowToast(errorMsg);
      return;
    }

    setFormError(null);
    setSaving(true);

    const payload = {
      label: 'Home',
      recipient_name: recipientName.trim(),
      phone_number: phoneNumber.trim(),
      address_line1: addressLine1.trim(),
      barangay: barangay.trim(),
      city: DELIVERY_CITY,
      province: DELIVERY_PROVINCE,
      postal_code: postalCode.trim() || DELIVERY_POSTAL_CODE,
      delivery_instructions: deliveryInstructions.trim() || null,
      is_default: isDefault,
      customer_email: customerEmail || '',
      // Legacy backward compatibility fields
      tag: 'Home',
      address: addressLine1.trim(),
      contact_person: recipientName.trim(),
      phone: phoneNumber.trim(),
      notes: deliveryInstructions.trim() || null,
    };

    try {
      if (editingId) {
        const res = await updateCustomerAddress(editingId, payload);
        const updatedObj = res || { ...payload, id: editingId };

        setAddresses((prev) =>
          prev.map((a) => {
            if (a.id === editingId) {
              return updatedObj;
            }
            return isDefault ? { ...a, is_default: false } : a;
          })
        );

        if (onShowToast) onShowToast('Cagayan de Oro delivery address updated! 📍');
      } else {
        const res = await saveCustomerAddress(payload, customerEmail);
        const newObj = res || { ...payload, id: Date.now() };

        setAddresses((prev) =>
          isDefault
            ? [newObj, ...prev.map((a) => ({ ...a, is_default: false }))]
            : [newObj, ...prev]
        );

        if (onShowToast) onShowToast('Cagayan de Oro delivery address added! 📍');
      }

      resetForm();
    } catch (err) {
      const serverMessage = err.message || 'Failed to save delivery address.';
      setFormError(serverMessage);
      if (onShowToast) onShowToast(serverMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (addr) => {
    try {
      if (addr.id && typeof addr.id === 'number' && addr.id < 100000) {
        await setDefaultCustomerAddress(addr.id);
      }
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === addr.id,
        }))
      );
      if (onShowToast) onShowToast(`"${addr.recipient_name || addr.contact_person || 'Address'}" set as default delivery location.`);
    } catch (e) {
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === addr.id,
        }))
      );
      if (onShowToast) onShowToast('Default updated.');
    }
  };

  const handleDelete = async (addrId) => {
    try {
      if (addrId && typeof addrId === 'number' && addrId < 100000) {
        await deleteCustomerAddress(addrId);
      }
      setAddresses((prev) => {
        const remaining = prev.filter((a) => a.id !== addrId);
        if (remaining.length > 0 && !remaining.some((a) => a.is_default)) {
          remaining[0] = { ...remaining[0], is_default: true };
        }
        return remaining;
      });
      if (onShowToast) onShowToast('Delivery address deleted.');
    } catch (e) {
      setAddresses((prev) => prev.filter((a) => a.id !== addrId));
      if (onShowToast) onShowToast('Address removed.');
    }
  };

  const filteredBarangays = CDO_BARANGAYS.filter((b) =>
    b.toLowerCase().includes(barangaySearch.toLowerCase().trim())
  );

  if (!visible) return null;

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalBackdrop}
      >
        <View style={[styles.modalSheetContainer, isTablet && { maxWidth: 680, width: '100%', alignSelf: 'center' }]}>
          <View style={styles.sheetDragHandle} />

          {/* Modal Header */}
          <View style={styles.modalNav}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.modalNavTitle}>Delivery Addresses 📍</Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: '500', marginTop: 2 }}>
                Delivering across Cagayan de Oro City only
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={showAddForm ? resetForm : onClose}
              activeOpacity={0.8}
              accessibilityLabel="Close delivery addresses modal"
            >
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Operational Hub Notice Banner */}
          <View
            style={{
              backgroundColor: '#fff7ed',
              borderColor: '#fed7aa',
              borderWidth: 1,
              borderRadius: 12,
              paddingVertical: 7,
              paddingHorizontal: 12,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 13 }}>🚚</Text>
            <Text style={{ fontSize: 11.5, color: '#9a3412', fontWeight: '700', flex: 1 }}>
              Dispatch Hub: {DISPATCH_HUB}
            </Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: Math.min(windowHeight * 0.82, 680) }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
            bounces={false}
            overScrollMode="never"
            keyboardShouldPersistTaps="handled"
          >
            {showAddForm ? (
              /* Add / Edit Delivery Address Form */
              <View style={{ paddingVertical: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: COLORS.textMain }}>
                    {editingId ? 'Edit Delivery Address' : '+ Add New Delivery Address'}
                  </Text>
                  <TouchableOpacity onPress={resetForm} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.primary }}>
                      Back to list
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Validation Error Banner */}
                {formError && (
                  <View
                    style={{
                      backgroundColor: '#fef2f2',
                      borderColor: '#fca5a5',
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 10,
                      marginBottom: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>⚠️</Text>
                    <Text style={{ flex: 1, fontSize: 12.5, color: '#dc2626', fontWeight: '700' }}>
                      {formError}
                    </Text>
                  </View>
                )}

                {/* 1 & 2. Recipient Name & Phone in Responsive 2-Col Grid on Tablet */}
                <View style={isTablet ? { flexDirection: 'row', gap: 12 } : null}>
                  {/* 1. Recipient Full Name */}
                  <View style={[styles.authFieldGroup, isTablet && { flex: 1 }]}>
                    <Text style={styles.authFieldLabel}>Full Name / Contact Person *</Text>
                    <TextInput
                      style={styles.authInput}
                      placeholder="e.g. Juan Dela Cruz"
                      placeholderTextColor="#94a3b8"
                      value={recipientName}
                      onChangeText={(val) => {
                        setRecipientName(val);
                        if (formError) setFormError(null);
                      }}
                      maxLength={100}
                      autoCapitalize="words"
                    />
                  </View>

                  {/* 2. Contact Phone Number */}
                  <View style={[styles.authFieldGroup, isTablet && { flex: 1 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={styles.authFieldLabel}>Contact Phone Number *</Text>
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '700',
                          color: phoneNumber.length === 11 ? COLORS.success : (phoneNumber.length > 0 ? '#f59e0b' : COLORS.textMuted),
                        }}
                      >
                        {phoneNumber.length}/11 digits
                      </Text>
                    </View>
                    <TextInput
                      style={[
                        styles.authInput,
                        phoneNumber.length > 0 && phoneNumber.length < 11 && { borderColor: '#f59e0b' },
                        phoneNumber.length === 11 && { borderColor: COLORS.success },
                      ]}
                      placeholder="e.g. 09171234567"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                      value={phoneNumber}
                      onChangeText={handlePhoneChange}
                      maxLength={11}
                    />
                    {phoneNumber.length > 0 && phoneNumber.length < 11 && (
                      <Text style={{ fontSize: 11.5, color: '#f59e0b', fontWeight: '600', marginTop: 4 }}>
                        Contact number must be exactly 11 digits ({11 - phoneNumber.length} remaining)
                      </Text>
                    )}
                  </View>
                </View>

                {/* 3. Complete Street Address */}
                <View style={styles.authFieldGroup}>
                  <Text style={styles.authFieldLabel}>House / Unit No., Street, Building *</Text>
                  <TextInput
                    style={[styles.authInput, { minHeight: 60, textAlignVertical: 'top' }]}
                    placeholder="e.g. Zone 1, Mabasa St. / Golden Glow North"
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={2}
                    value={addressLine1}
                    onChangeText={(val) => {
                      setAddressLine1(val);
                      if (formError) setFormError(null);
                    }}
                  />
                </View>

                {/* 4 & 6. Barangay and Postal Code in Responsive Grid */}
                <View style={isTablet ? { flexDirection: 'row', gap: 12 } : null}>
                  {/* 4. Barangay Selection (Restricted strictly to CDO) */}
                  <View style={[styles.authFieldGroup, isTablet && { flex: 1.4 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={styles.authFieldLabel}>Barangay (Cagayan de Oro) *</Text>
                      <Text style={{ fontSize: 11, color: COLORS.primaryDark, fontWeight: '700' }}>
                        80 Official Barangays
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.authInput,
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          minHeight: 48,
                          borderColor: barangay ? COLORS.primary : COLORS.border,
                          backgroundColor: barangay ? COLORS.primaryLight : COLORS.surface,
                        },
                      ]}
                      onPress={() => setShowBarangayModal(true)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: barangay ? '800' : '500',
                          color: barangay ? COLORS.primaryDark : '#94a3b8',
                        }}
                      >
                        {barangay ? `Brgy. ${barangay}` : 'Select Cagayan de Oro Barangay ▾'}
                      </Text>
                      <Text style={{ fontSize: 13, color: COLORS.primary }}>📍 Change</Text>
                    </TouchableOpacity>

                    {/* Popular Barangays Quick Selector */}
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 6 }}>
                        Quick Select:
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                        {POPULAR_CDO_BARANGAYS.map((b) => {
                          const isChosen = barangay === b;
                          return (
                            <TouchableOpacity
                              key={b}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 8,
                                minHeight: 38,
                                justifyContent: 'center',
                                borderRadius: 8,
                                backgroundColor: isChosen ? COLORS.primary : '#f1f5f9',
                                borderWidth: 1,
                                borderColor: isChosen ? COLORS.primaryDark : '#e2e8f0',
                              }}
                              onPress={() => {
                                setBarangay(b);
                                if (formError) setFormError(null);
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11.5,
                                  fontWeight: isChosen ? '800' : '600',
                                  color: isChosen ? '#ffffff' : COLORS.textBody,
                                }}
                              >
                                {b === 'Balulang' ? '📍 Balulang (Hub)' : b}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  </View>

                  {/* 6. Postal Code */}
                  <View style={[styles.authFieldGroup, isTablet && { flex: 0.8 }]}>
                    <Text style={styles.authFieldLabel}>Postal Code (Cagayan de Oro)</Text>
                    <TextInput
                      style={styles.authInput}
                      placeholder="9000"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                      value={postalCode}
                      onChangeText={setPostalCode}
                      maxLength={10}
                    />
                  </View>
                </View>

                {/* 5. City / Municipality & Province (Strictly Read-Only / Locked) */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <View style={{ flex: 1.2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                      <Text style={styles.authFieldLabel}>City / Town *</Text>
                      <View style={{ backgroundColor: '#fed7aa', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9, color: '#9a3412', fontWeight: '900' }}>LOCKED</Text>
                      </View>
                    </View>
                    <TextInput
                      style={[
                        styles.authInput,
                        { backgroundColor: '#f8fafc', color: COLORS.textMain, fontWeight: '800' },
                      ]}
                      value={DELIVERY_CITY}
                      editable={false}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                      <Text style={styles.authFieldLabel}>Province *</Text>
                      <View style={{ backgroundColor: '#fed7aa', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9, color: '#9a3412', fontWeight: '900' }}>LOCKED</Text>
                      </View>
                    </View>
                    <TextInput
                      style={[
                        styles.authInput,
                        { backgroundColor: '#f8fafc', color: COLORS.textMain, fontWeight: '800' },
                      ]}
                      value={DELIVERY_PROVINCE}
                      editable={false}
                    />
                  </View>
                </View>

                {/* 7. Delivery Notes / Landmarks */}
                <View style={styles.authFieldGroup}>
                  <Text style={styles.authFieldLabel}>Delivery Notes / Landmark (Optional)</Text>
                  <TextInput
                    style={[styles.authInput, { minHeight: 52, textAlignVertical: 'top' }]}
                    placeholder="e.g. Near Balulang Elementary School, beside sari-sari store"
                    placeholderTextColor="#94a3b8"
                    multiline
                    value={deliveryInstructions}
                    onChangeText={setDeliveryInstructions}
                    maxLength={500}
                  />
                </View>

                {/* 8. Default Flag */}
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 18,
                    gap: 10,
                    paddingVertical: 4,
                  }}
                  onPress={() => setIsDefault(!isDefault)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: isDefault ? COLORS.primary : COLORS.border,
                      backgroundColor: isDefault ? COLORS.primary : '#fff',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {isDefault && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.textMain }}>
                      Set as default delivery address
                    </Text>
                    <Text style={{ fontSize: 11.5, color: COLORS.textMuted, fontWeight: '500' }}>
                      Automatically use this location for your Cagayan de Oro orders
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 20 }}>
                  <TouchableOpacity
                    style={[styles.secondaryAuthBtn, { flex: 1 }]}
                    onPress={resetForm}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.secondaryAuthBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryAuthBtn,
                      { flex: 1.6 },
                      (!isPhoneComplete || saving) && { opacity: 0.55 },
                    ]}
                    onPress={handleSaveAddress}
                    disabled={saving || !isPhoneComplete}
                    activeOpacity={0.88}
                  >
                    {saving ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.primaryAuthBtnText}>
                        {editingId ? 'Update Address 📍' : 'Save Address 📍'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Address List View */
              <>
                {loading ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                ) : (
                  addresses.map((addr) => {
                    const formattedAddr = formatDisplayAddress(addr);
                    const isSelected =
                      selectedAddress &&
                      (selectedAddress.id === addr.id ||
                        selectedAddress.address === formattedAddr ||
                        selectedAddress.address_line1 === addr.address_line1);
                    const isDef = Boolean(addr.is_default || addr.isDefault);
                    const contactName = addr.recipient_name || addr.contact_person || addr.contact_name;
                    const contactPhone = addr.phone_number || addr.phone || addr.contact_phone;
                    const notes = addr.delivery_instructions || addr.notes;
                    const isCDO = isWithinCDO(formattedAddr);

                    return (
                      <View
                        key={addr.id || formattedAddr}
                        style={{
                          padding: 14,
                          backgroundColor: isDef || isSelected ? COLORS.primaryLight : COLORS.surface,
                          borderRadius: 16,
                          borderWidth: 1.5,
                          borderColor: !isCDO
                            ? '#fca5a5'
                            : isSelected
                            ? COLORS.primaryDark
                            : isDef
                            ? COLORS.primaryBorder
                            : COLORS.border,
                          marginBottom: 12,
                        }}
                      >
                        {/* Card Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 6 }}>
                            <Text style={{ fontSize: 14 }}>📍</Text>
                            <Text
                              style={{
                                fontWeight: '900',
                                color: isDef ? COLORS.primaryDark : COLORS.textMain,
                                fontSize: 14,
                              }}
                              numberOfLines={1}
                            >
                              {contactName || 'Delivery Location'}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            {isDef && (
                              <View
                                style={{
                                  backgroundColor: COLORS.primary,
                                  paddingHorizontal: 7,
                                  paddingVertical: 2.5,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '900' }}>DEFAULT</Text>
                              </View>
                            )}
                            {isSelected && (
                              <View
                                style={{
                                  backgroundColor: '#0284c7',
                                  paddingHorizontal: 7,
                                  paddingVertical: 2.5,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '900' }}>ACTIVE FOR CART</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Contact Phone */}
                        {contactPhone && (
                          <Text style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 4, fontWeight: '600' }}>
                            📞 {contactPhone}
                          </Text>
                        )}

                        {/* Complete Street Address */}
                        <Text style={{ fontSize: 13.5, color: COLORS.textMain, marginTop: 4, fontWeight: '700' }}>
                          {formattedAddr}
                        </Text>

                        {/* Out of Boundary Warning for legacy non-CDO addresses */}
                        {!isCDO && (
                          <View
                            style={{
                              backgroundColor: '#fef2f2',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              marginTop: 6,
                              borderWidth: 1,
                              borderColor: '#fca5a5',
                            }}
                          >
                            <Text style={{ fontSize: 11, color: '#dc2626', fontWeight: '700' }}>
                              ⚠️ Outside Cagayan de Oro City boundary. Please edit to a valid CDO address.
                            </Text>
                          </View>
                        )}

                        {/* Delivery Notes / Landmark */}
                        {notes && (
                          <View
                            style={{
                              backgroundColor: '#f0f9ff',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 8,
                              marginTop: 6,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Text style={{ fontSize: 12 }}>📍</Text>
                            <Text style={{ fontSize: 11.5, color: '#0369a1', fontWeight: '600', flex: 1 }}>
                              {notes}
                            </Text>
                          </View>
                        )}

                        {/* Action Buttons Row */}
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-end',
                            gap: 8,
                            marginTop: 10,
                            borderTopWidth: 1,
                            borderColor: isDef ? COLORS.primaryBorder : COLORS.borderLight,
                            paddingTop: 8,
                          }}
                        >
                          {onSelectAddress && isCDO && (
                            <TouchableOpacity
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                minHeight: 44,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: COLORS.primary,
                                borderRadius: 8,
                              }}
                              onPress={() => {
                                onSelectAddress({
                                  ...addr,
                                  address: formattedAddr,
                                  tag: contactName || 'Delivery Address',
                                });
                                onClose();
                              }}
                              activeOpacity={0.8}
                              accessibilityLabel="Deliver to this address"
                            >
                              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#fff' }}>
                                Deliver Here ✓
                              </Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              minHeight: 44,
                              justifyContent: 'center',
                              alignItems: 'center',
                              backgroundColor: '#f1f5f9',
                              borderWidth: 1,
                              borderColor: '#cbd5e1',
                              borderRadius: 8,
                            }}
                            onPress={() => handleStartEdit(addr)}
                            activeOpacity={0.8}
                            accessibilityLabel="Edit address"
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: COLORS.textBody }}>
                              Edit
                            </Text>
                          </TouchableOpacity>

                          {!isDef && isCDO && (
                            <TouchableOpacity
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                minHeight: 44,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: '#f1f5f9',
                                borderWidth: 1,
                                borderColor: '#cbd5e1',
                                borderRadius: 8,
                              }}
                              onPress={() => handleSetDefault(addr)}
                              activeOpacity={0.8}
                              accessibilityLabel="Set as default address"
                            >
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: COLORS.textBody }}>
                                Set Default
                              </Text>
                            </TouchableOpacity>
                          )}

                          {addresses.length > 1 && (
                            <TouchableOpacity
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 8,
                                minHeight: 44,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: '#fee2e2',
                                borderWidth: 1,
                                borderColor: '#fca5a5',
                                borderRadius: 8,
                              }}
                              onPress={() => handleDelete(addr.id)}
                              activeOpacity={0.8}
                              accessibilityLabel="Delete address"
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
                  onPress={() => {
                    resetForm();
                    setShowAddForm(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryAuthBtnText}>+ Add New Delivery Address</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Official CDO Barangay Selection Modal */}
      <Modal visible={showBarangayModal} animationType="fade" transparent onRequestClose={() => setShowBarangayModal(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheetContainer,
              { maxHeight: '82%', backgroundColor: '#ffffff', paddingBottom: 24 },
            ]}
          >
            <View style={styles.sheetDragHandle} />

            <View style={styles.modalNav}>
              <View>
                <Text style={styles.modalNavTitle}>Select CDO Barangay 📍</Text>
                <Text style={{ fontSize: 11.5, color: COLORS.textMuted, fontWeight: '600' }}>
                  80 Official Barangays of Cagayan de Oro City
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowBarangayModal(false)}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.authInput,
                { marginBottom: 12, backgroundColor: '#f8fafc' },
              ]}
              placeholder="🔍 Search barangay (e.g. Balulang, Carmen, Lapasan)..."
              placeholderTextColor="#94a3b8"
              value={barangaySearch}
              onChangeText={setBarangaySearch}
              autoFocus
            />

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {filteredBarangays.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '600' }}>
                    No matching barangay found in Cagayan de Oro City.
                  </Text>
                </View>
              ) : (
                filteredBarangays.map((item) => {
                  const isCurrent = barangay === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                        backgroundColor: isCurrent ? COLORS.primaryLight : '#ffffff',
                        borderBottomWidth: 1,
                        borderBottomColor: '#f1f5f9',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        setBarangay(item);
                        setShowBarangayModal(false);
                        if (formError) setFormError(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 14 }}>{item === 'Balulang' ? '📍' : '🏘️'}</Text>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: isCurrent ? '800' : '600',
                            color: isCurrent ? COLORS.primaryDark : COLORS.textMain,
                          }}
                        >
                          {item}
                        </Text>
                        {item === 'Balulang' && (
                          <View style={{ backgroundColor: '#fed7aa', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, color: '#9a3412', fontWeight: '800' }}>CENTRAL HUB</Text>
                          </View>
                        )}
                      </View>
                      {isCurrent && (
                        <Text style={{ color: COLORS.primaryDark, fontWeight: '900', fontSize: 14 }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}
