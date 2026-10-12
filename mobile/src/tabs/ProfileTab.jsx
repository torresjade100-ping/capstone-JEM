import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eyebrow } from '../components/ui/Primitives';
import PressableScale from '../components/ui/PressableScale';
import { PALETTE, GRADIENTS, RADIUS, SHADOWS } from '../components/ui/theme';

export default function ProfileTab({
  userName = '',
  userEmail = '',
  userPhone = '',
  ordersCount = 0,
  completedOrdersCount = 0,
  wishlistCount = 0,
  isDarkMode = false,
  onToggleDarkMode,
  onNavigateToOrders,
  onOpenWishlist,
  onOpenAddress,
  onOpenNotifications,
  onOpenSupport,
  onOpenEditProfile,
  onSignOut,
  onShowToast,
}) {
  const insets = useSafeAreaInsets();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const displayName = userName || 'Valued Customer';
  const displayEmail = userEmail || 'Customer Account';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    if (onSignOut) {
      onSignOut();
    }
  };

  const renderRow = ({ icon, label, badge, onPress, isLast = false, color = PALETTE.textBody }) => (
    <PressableScale
      key={label}
      onPress={onPress}
      style={[s.rowItem, isLast && { borderBottomWidth: 0 }]}
      scaleTo={0.98}
    >
      <View style={s.rowIconWrap}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={s.rowLabel}>{label}</Text>
      {badge !== undefined && badge > 0 ? (
        <View style={s.rowBadge}>
          <Text style={s.rowBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={17} color={PALETTE.textFaint} />
    </PressableScale>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* 1. Header Profile Hero */}
      <LinearGradient
        colors={GRADIENTS.navy}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.profileHeader, { paddingTop: insets.top + 16 }]}
      >
        <View style={s.orbA} pointerEvents="none" />
        <View style={s.orbB} pointerEvents="none" />

        {/* User Card Row */}
        <View style={s.userCardRow}>
          <LinearGradient
            colors={GRADIENTS.orange}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.avatar, SHADOWS.orange]}
          >
            <Text style={s.avatarText}>{avatarLetter}</Text>
          </LinearGradient>

          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={s.nameText} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={s.emailText} numberOfLines={1}>
              {displayEmail}
            </Text>

            <View style={s.customerBadge}>
              <Ionicons name="person" size={11} color={PALETTE.orange200} />
              <Text style={s.customerBadgeText}>Customer Account</Text>
            </View>
          </View>

          <PressableScale
            onPress={onOpenEditProfile}
            style={s.editBtn}
            scaleTo={0.9}
          >
            <Ionicons name="pencil" size={16} color="#FFFFFF" />
          </PressableScale>
        </View>

        {/* 3 Metric Cards */}
        <View style={s.metricsRow}>
          <PressableScale
            onPress={onNavigateToOrders}
            style={s.metricCard}
            containerStyle={{ flex: 1 }}
            scaleTo={0.95}
          >
            <View style={[s.metricIcon, { backgroundColor: 'rgba(249, 115, 22, 0.16)' }]}>
              <Ionicons name="receipt" size={16} color={PALETTE.orange400} />
            </View>
            <Text style={s.metricVal}>{ordersCount}</Text>
            <Text style={s.metricLabel}>Total Orders</Text>
          </PressableScale>

          <PressableScale
            onPress={onNavigateToOrders}
            style={s.metricCard}
            containerStyle={{ flex: 1 }}
            scaleTo={0.95}
          >
            <View style={[s.metricIcon, { backgroundColor: 'rgba(16, 185, 129, 0.16)' }]}>
              <Ionicons name="checkmark-done" size={16} color={PALETTE.success} />
            </View>
            <Text style={s.metricVal}>{completedOrdersCount}</Text>
            <Text style={s.metricLabel}>Delivered</Text>
          </PressableScale>

          <PressableScale
            onPress={onOpenWishlist}
            style={s.metricCard}
            containerStyle={{ flex: 1 }}
            scaleTo={0.95}
          >
            <View style={[s.metricIcon, { backgroundColor: 'rgba(244, 114, 182, 0.16)' }]}>
              <Ionicons name="heart" size={16} color="#F472B6" />
            </View>
            <Text style={s.metricVal}>{wishlistCount}</Text>
            <Text style={s.metricLabel}>Wishlist</Text>
          </PressableScale>
        </View>
      </LinearGradient>

      {/* 2. Scrollable Body Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* Section: My Account */}
        <Eyebrow>Account & Orders</Eyebrow>
        <View style={[s.groupCard, SHADOWS.card]}>
          {renderRow({
            icon: 'person-outline',
            label: 'Profile & Contact Info',
            onPress: onOpenEditProfile,
          })}
          {renderRow({
            icon: 'receipt-outline',
            label: 'My Orders',
            badge: ordersCount,
            onPress: onNavigateToOrders,
          })}
          {renderRow({
            icon: 'heart-outline',
            label: 'Wishlist',
            badge: wishlistCount,
            onPress: onOpenWishlist,
          })}
          {renderRow({
            icon: 'location-outline',
            label: 'Delivery Addresses',
            onPress: onOpenAddress,
          })}
          {renderRow({
            icon: 'card-outline',
            label: 'Payment Methods',
            onPress: () => onShowToast('GCash, Maya, Bank Transfer & COD enabled'),
          })}
          {renderRow({
            icon: 'notifications-outline',
            label: 'Notifications & Alerts',
            onPress: onOpenNotifications,
            isLast: true,
          })}
        </View>

        {/* Section: Display */}
        <Eyebrow style={{ marginTop: 20 }}>Display Preferences</Eyebrow>
        <View style={[s.groupCard, SHADOWS.card]}>
          <View style={[s.rowItem, { borderBottomWidth: 0, justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={s.rowIconWrap}>
                <Ionicons
                  name={isDarkMode ? 'moon-outline' : 'sunny-outline'}
                  size={20}
                  color={isDarkMode ? PALETTE.orange400 : PALETTE.warning}
                />
              </View>
              <Text style={s.rowLabel}>Dark Mode Theme</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={onToggleDarkMode}
              trackColor={{ false: '#CBD5E1', true: PALETTE.orange500 }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section: Support */}
        <Eyebrow style={{ marginTop: 20 }}>Support & Customer Services</Eyebrow>
        <View style={[s.groupCard, SHADOWS.card]}>
          {renderRow({
            icon: 'help-buoy-outline',
            label: 'Customer Support & Help Center',
            onPress: onOpenSupport,
          })}
          {renderRow({
            icon: 'information-circle-outline',
            label: 'About JEM Hardware',
            onPress: () => onShowToast('JEM Hardware & Supplies v2.0'),
          })}
          {renderRow({
            icon: 'shield-checkmark-outline',
            label: 'Terms of Service & Privacy Policy',
            onPress: () => onShowToast('Terms of Service & Privacy Policy'),
            isLast: true,
          })}
        </View>

        {/* Sign Out Button */}
        <PressableScale
          onPress={() => setShowLogoutConfirm(true)}
          style={[s.signOutBtn, SHADOWS.card]}
          scaleTo={0.96}
        >
          <Ionicons name="log-out-outline" size={19} color={PALETTE.danger} />
          <Text style={s.signOutText}>Sign Out of JEM Account</Text>
        </PressableScale>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={[s.modalCard, SHADOWS.raised]}>
            <LinearGradient
              colors={['#FEE2E2', '#FECACA']}
              style={s.modalIconCircle}
            >
              <Ionicons name="log-out" size={28} color={PALETTE.danger} />
            </LinearGradient>

            <Text style={s.modalTitle}>Sign Out</Text>
            <Text style={s.modalMessage}>
              Are you sure you want to sign out of your JEM Hardware customer account?
            </Text>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelModalBtn}
                onPress={() => setShowLogoutConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={s.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.confirmModalBtn}
                onPress={handleConfirmLogout}
                activeOpacity={0.85}
              >
                <Text style={s.confirmModalText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  profileHeader: {
    paddingHorizontal: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: RADIUS.xxl,
    borderBottomRightRadius: RADIUS.xxl,
    overflow: 'hidden',
  },
  orbA: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
  },
  orbB: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  userCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '900', color: '#FFFFFF' },
  nameText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.4 },
  emailText: { fontSize: 12.5, color: '#9AA8BF', marginTop: 2, fontWeight: '500' },
  customerBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249, 115, 22, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    marginTop: 6,
  },
  customerBadgeText: { color: PALETTE.orange200, fontSize: 10.5, fontWeight: '800' },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  metricsRow: { flexDirection: 'row', gap: 10 },
  metricCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricVal: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 },
  metricLabel: { fontSize: 11, color: '#9AA8BF', marginTop: 2, fontWeight: '600' },

  scroll: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 120 },

  groupCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: PALETTE.lineSoft,
    overflow: 'hidden',
    marginBottom: 4,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: PALETTE.lineSoft,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PALETTE.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: { flex: 1, fontSize: 13.5, fontWeight: '700', color: PALETTE.text },
  rowBadge: {
    backgroundColor: PALETTE.orange500,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 8,
  },
  rowBadgeText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '900' },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PALETTE.dangerBg,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: RADIUS.lg,
    paddingVertical: 15,
    marginTop: 22,
    marginBottom: 20,
  },
  signOutText: { color: PALETTE.dangerDeep, fontSize: 14.5, fontWeight: '800' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: PALETTE.text, marginBottom: 8 },
  modalMessage: {
    fontSize: 13.5,
    color: PALETTE.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelModalBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: PALETTE.surfaceAlt,
    borderWidth: 1,
    borderColor: PALETTE.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalText: { fontSize: 14, fontWeight: '800', color: PALETTE.textBody },
  confirmModalBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: PALETTE.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
