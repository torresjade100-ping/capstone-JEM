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

export default function EditProfileModal({
  visible,
  onClose,
  userName = '',
  userEmail = '',
  userPhone = '',
  onSaveProfile,
}) {
  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState(userPhone || '0917-123-4567');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!visible) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorMsg('Full Name cannot be empty.');
      return;
    }

    if (password && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password && password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await onSaveProfile({
        name: name.trim(),
        phone: phone.trim(),
        ...(password ? { password } : {}),
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheetContainer}>
          <View style={styles.sheetDragHandle} />

          <View style={styles.modalNav}>
            <View>
              <Text style={styles.modalNavTitle}>Edit Customer Profile 👤</Text>
              <Text style={{ fontSize: 11.5, color: COLORS.textMuted, fontWeight: '500' }}>
                Update your contractor account information
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }} bounces={false} overScrollMode="never">
            {errorMsg ? (
              <View
                style={{
                  backgroundColor: COLORS.dangerBg,
                  borderWidth: 1,
                  borderColor: COLORS.dangerBorder,
                  padding: 10,
                  borderRadius: 12,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: COLORS.danger, fontSize: 12.5, fontWeight: '700' }}>
                  ⚠️ {errorMsg}
                </Text>
              </View>
            ) : null}

            {/* Email (Read Only Account Identifier) */}
            <View style={styles.authFieldGroup}>
              <Text style={styles.authFieldLabel}>Account Email / Username (Permanent)</Text>
              <TextInput
                style={[styles.authInput, { backgroundColor: '#f1f5f9', color: '#64748b' }]}
                value={userEmail}
                editable={false}
              />
            </View>

            {/* Full Name */}
            <View style={styles.authFieldGroup}>
              <Text style={styles.authFieldLabel}>Full Name / Business Name *</Text>
              <TextInput
                style={styles.authInput}
                placeholder="e.g. Juan Dela Cruz / JDC Construction"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Phone Number */}
            <View style={styles.authFieldGroup}>
              <Text style={styles.authFieldLabel}>Contact / Dispatch Phone Number *</Text>
              <TextInput
                style={styles.authInput}
                placeholder="e.g. 09171234567"
                placeholderTextColor="#94a3b8"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Change Password */}
            <View style={styles.authFieldGroup}>
              <Text style={styles.authFieldLabel}>Change Password (Optional)</Text>
              <TextInput
                style={styles.authInput}
                placeholder="Leave blank to keep current password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {password ? (
              <View style={styles.authFieldGroup}>
                <Text style={styles.authFieldLabel}>Confirm New Password *</Text>
                <TextInput
                  style={styles.authInput}
                  placeholder="Re-type new password"
                  placeholderTextColor="#94a3b8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryAuthBtn,
                { marginTop: 14, marginBottom: 20 },
                loading && { opacity: 0.8 },
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.primaryAuthBtnText}>Save Profile Changes ✓</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
