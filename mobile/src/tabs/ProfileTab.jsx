import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles/appStyles';

export default function ProfileTab({
  userName,
  userEmail,
  ordersCount,
  completedOrdersCount,
  wishlistCount,
  onNavigateToOrders,
  onOpenWishlist,
  onOpenAddress,
  onOpenNotifications,
  onOpenSupport,
  onSignOut,
  onShowToast,
}) {
  return (
    <View>
      <View style={styles.profileTopHeader}>
        <View style={styles.profileUserRow}>
          <View style={styles.profileAvatarBox}>
            <Text style={styles.profileAvatarText}>
              {userName ? userName.charAt(0).toUpperCase() : 'J'}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.profileUserName}>{userName || 'Juan dela Cruz'}</Text>
            <Text style={styles.profileUserEmail}>{userEmail || 'juan@email.com'}</Text>
            <Text style={styles.profileUserPhone}>0917-123-4567</Text>
          </View>
          <TouchableOpacity
            style={styles.profileGearBtn}
            onPress={() => onShowToast('App Settings')}
          >
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* 3 Summary Stat Cards */}
        <View style={styles.profileStatsRow}>
          <View style={styles.profileStatCard}>
            <Text style={styles.profileStatValue}>{ordersCount}</Text>
            <Text style={styles.profileStatLabel}>Total Orders</Text>
          </View>
          <View style={styles.profileStatCard}>
            <Text style={styles.profileStatValue}>{completedOrdersCount}</Text>
            <Text style={styles.profileStatLabel}>Completed</Text>
          </View>
          <View style={styles.profileStatCard}>
            <Text style={styles.profileStatValue}>{wishlistCount}</Text>
            <Text style={styles.profileStatLabel}>Wishlist</Text>
          </View>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        {/* MY ACCOUNT Section */}
        <Text style={styles.profileSectionEyebrow}>MY ACCOUNT</Text>
        <View style={styles.profileGroupCard}>
          <TouchableOpacity style={styles.profileRowItem} onPress={onNavigateToOrders}>
            <Text style={{ fontSize: 18, marginRight: 12 }}>📦</Text>
            <Text style={styles.profileRowLabel}>My Orders</Text>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.profileRowItem} onPress={onOpenWishlist}>
            <Text style={{ fontSize: 18, marginRight: 12 }}>🤍</Text>
            <Text style={styles.profileRowLabel}>Wishlist</Text>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.profileRowItem} onPress={onOpenAddress}>
            <Text style={{ fontSize: 18, marginRight: 12 }}>📍</Text>
            <Text style={styles.profileRowLabel}>Delivery Addresses</Text>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileRowItem}
            onPress={() => onShowToast('GCash / Maya / COD Enabled')}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>💳</Text>
            <Text style={styles.profileRowLabel}>Payment Methods</Text>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.profileRowItem, { borderBottomWidth: 0 }]}
            onPress={onOpenNotifications}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>🔔</Text>
            <Text style={styles.profileRowLabel}>Notifications</Text>
            <View style={styles.profileNotifBadge}>
              <Text style={styles.profileNotifBadgeText}>3</Text>
            </View>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* SUPPORT Section */}
        <Text style={[styles.profileSectionEyebrow, { marginTop: 20 }]}>SUPPORT</Text>
        <View style={styles.profileGroupCard}>
          <TouchableOpacity style={styles.profileRowItem} onPress={onOpenSupport}>
            <Text style={{ fontSize: 18, marginRight: 12 }}>❓</Text>
            <Text style={styles.profileRowLabel}>Help &amp; Support</Text>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileRowItem}
            onPress={() => onShowToast('JEM Hardware & Construction Supply v2.0')}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>ℹ️</Text>
            <Text style={styles.profileRowLabel}>About JEM Hardware</Text>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.profileRowItem, { borderBottomWidth: 0 }]}
            onPress={() => onShowToast('Settings Configured')}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>⚙️</Text>
            <Text style={styles.profileRowLabel}>Settings</Text>
            <Text style={styles.profileRowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.profileSignOutBtn} onPress={onSignOut}>
          <Text style={styles.profileSignOutText}>🚪 Sign Out of Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
