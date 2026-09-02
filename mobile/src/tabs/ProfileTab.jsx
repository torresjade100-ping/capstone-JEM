import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { styles, COLORS } from '../styles/appStyles';

export default function ProfileTab({
  userName = '',
  userEmail = '',
  ordersCount = 0,
  completedOrdersCount = 0,
  wishlistCount = 0,
  onNavigateToOrders,
  onOpenWishlist,
  onOpenAddress,
  onOpenNotifications,
  onOpenSupport,
  onSignOut,
  onShowToast,
}) {
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

  return (
    <View style={{ flex: 1 }}>
      {/* 1. Header with Avatar & User Info */}
      <View style={styles.profileTopHeader}>
        <View style={styles.profileUserRow}>
          <View style={styles.profileAvatarBox}>
            <Text style={styles.profileAvatarText}>{avatarLetter}</Text>
          </View>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.profileUserName}>{displayName}</Text>
            <Text style={styles.profileUserEmail}>{displayEmail}</Text>

            <View style={styles.profileContractorBadge}>
              <Text style={styles.profileContractorBadgeText}>
                🏗️ Verified Contractor Account
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.profileGearBtn}
            onPress={() => onShowToast('Settings Configured')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* 3 Summary Stat Cards */}
        <View style={styles.profileStatsRow}>
          <TouchableOpacity
            style={styles.profileStatCard}
            onPress={onNavigateToOrders}
            activeOpacity={0.8}
          >
            <Text style={styles.profileStatValue}>{ordersCount}</Text>
            <Text style={styles.profileStatLabel}>Total Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileStatCard}
            onPress={onNavigateToOrders}
            activeOpacity={0.8}
          >
            <Text style={styles.profileStatValue}>{completedOrdersCount}</Text>
            <Text style={styles.profileStatLabel}>Delivered</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileStatCard}
            onPress={onOpenWishlist}
            activeOpacity={0.8}
          >
            <Text style={styles.profileStatValue}>{wishlistCount}</Text>
            <Text style={styles.profileStatLabel}>Saved Wishlist</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
        {/* 2. MY ACCOUNT Section */}
        <Text style={styles.profileSectionEyebrow}>MY ACCOUNT</Text>
        <View style={styles.profileGroupCard}>
          <TouchableOpacity
            style={styles.profileRowItem}
            onPress={onNavigateToOrders}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>📦</Text>
            <Text style={styles.profileRowLabel}>My Orders &amp; Deliveries</Text>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileRowItem}
            onPress={onOpenWishlist}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>❤️</Text>
            <Text style={styles.profileRowLabel}>Saved Wishlist Materials</Text>
            {wishlistCount > 0 && (
              <View style={styles.profileNotifBadge}>
                <Text style={styles.profileNotifBadgeText}>{wishlistCount}</Text>
              </View>
            )}
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileRowItem}
            onPress={onOpenAddress}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>📍</Text>
            <Text style={styles.profileRowLabel}>Job Site Delivery Addresses</Text>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileRowItem}
            onPress={() => onShowToast('GCash / Maya / COD Enabled')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>💳</Text>
            <Text style={styles.profileRowLabel}>Payment Methods (GCash, Maya, COD)</Text>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.profileRowItem, { borderBottomWidth: 0 }]}
            onPress={onOpenNotifications}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>🔔</Text>
            <Text style={styles.profileRowLabel}>Notifications &amp; Promos</Text>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 3. SUPPORT & ABOUT Section */}
        <Text style={[styles.profileSectionEyebrow, { marginTop: 22 }]}>
          SUPPORT &amp; HELP
        </Text>
        <View style={styles.profileGroupCard}>
          <TouchableOpacity
            style={styles.profileRowItem}
            onPress={onOpenSupport}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>❓</Text>
            <Text style={styles.profileRowLabel}>Contractor Support &amp; Hotline</Text>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileRowItem}
            onPress={() =>
              onShowToast('JEM Hardware & Construction Supply v2.0 Production')
            }
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>ℹ️</Text>
            <Text style={styles.profileRowLabel}>About JEM Hardware</Text>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.profileRowItem, { borderBottomWidth: 0 }]}
            onPress={() => onShowToast('App is up to date')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>🛡️</Text>
            <Text style={styles.profileRowLabel}>Privacy &amp; Terms of Service</Text>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Sign Out Button */}
        <TouchableOpacity
          style={styles.profileSignOutBtn}
          onPress={() => setShowLogoutConfirm(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.profileSignOutText}>🚪 Sign Out of Account</Text>
        </TouchableOpacity>
      </View>

      {/* 5. Professional Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.confirmModalBackdrop}>
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmModalIconCircle}>
              <Text style={{ fontSize: 28 }}>🚪</Text>
            </View>

            <Text style={styles.confirmModalTitle}>Sign Out</Text>
            <Text style={styles.confirmModalMessage}>
              Are you sure you want to log out of your JEM Hardware account?
            </Text>

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowLogoutConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmLogoutBtn}
                onPress={handleConfirmLogout}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmLogoutBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
