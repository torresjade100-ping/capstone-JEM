import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { GoogleIcon } from '../components/AuthIcons';

export default function GoogleAccountSelectModal({
  visible,
  onClose,
  onSelectAccount,
  loading = false,
}) {
  const [customEmail, setCustomEmail] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [error, setError] = useState('');

  // Sample default Google accounts for fast developer & user testing
  const defaultAccounts = [
    {
      name: 'Carlo Enterina',
      email: 'jhoncarloenterina@gmail.com',
      avatarColor: '#EA4335',
      initial: 'C',
    },
    {
      name: 'JEM Contractor',
      email: 'contractor.jem@gmail.com',
      avatarColor: '#4285F4',
      initial: 'J',
    },
  ];

  const handleSelect = (account) => {
    setError('');
    if (onSelectAccount) {
      onSelectAccount(account.email, account.name);
    }
  };

  const handleCustomSubmit = () => {
    const trimmed = customEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Please enter a valid Google email address.');
      return;
    }
    setError('');
    const name = trimmed.split('@')[0];
    if (onSelectAccount) {
      onSelectAccount(trimmed, name);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Google Header */}
          <View style={styles.googleHeader}>
            <GoogleIcon size={24} />
            <Text style={styles.headerTitle}>Sign in with Google</Text>
            <Text style={styles.headerSubtitle}>
              Choose an account to continue to <Text style={styles.brandHighlight}>JEM Hardware</Text>
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Account List */}
          <View style={styles.accountList}>
            {defaultAccounts.map((acc, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.accountItem}
                onPress={() => handleSelect(acc)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, { backgroundColor: acc.avatarColor }]}>
                  <Text style={styles.avatarText}>{acc.initial}</Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{acc.name}</Text>
                  <Text style={styles.accountEmail}>{acc.email}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Custom Account Input Toggle */}
            {showCustomInput ? (
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Enter your Gmail address"
                  placeholderTextColor="#64748B"
                  value={customEmail}
                  onChangeText={(val) => {
                    setCustomEmail(val);
                    if (error) setError('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.customSubmitBtn}
                  onPress={handleCustomSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.customSubmitText}>Continue</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.useAnotherBtn}
                onPress={() => setShowCustomInput(true)}
                activeOpacity={0.7}
              >
                <View style={styles.anotherIconCircle}>
                  <Text style={styles.anotherIconText}>+</Text>
                </View>
                <Text style={styles.useAnotherText}>Use another Google account</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Disclaimer */}
          <Text style={styles.disclaimerText}>
            To continue, Google will share your verified email address and profile name with JEM Hardware.
          </Text>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0F1A2E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2C42',
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  googleHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  brandHighlight: {
    color: '#F97316',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    padding: 10,
    borderRadius: 6,
    marginBottom: 14,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12.5,
    fontWeight: '600',
  },
  accountList: {
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E2C42',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2C42',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  accountEmail: {
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  useAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  anotherIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#162338',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  anotherIconText: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '600',
    marginTop: -2,
  },
  useAnotherText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  customInputContainer: {
    marginTop: 12,
    gap: 10,
  },
  customInput: {
    height: 46,
    backgroundColor: '#0A0F1D',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 14,
  },
  customSubmitBtn: {
    height: 42,
    backgroundColor: '#F97316',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
