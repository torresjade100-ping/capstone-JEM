import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { styles, COLORS } from '../styles/appStyles';

export default function WishlistModal({
  visible,
  products = [],
  wishlist = [],
  onClose,
  onAddToCart,
  onToggleWishlist,
}) {
  if (!visible) return null;

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheetContainer}>
          <View style={styles.sheetDragHandle} />

          <View style={styles.modalNav}>
            <View>
              <Text style={styles.modalNavTitle}>Saved Wishlist ❤️</Text>
              <Text style={{ fontSize: 11.5, color: COLORS.textMuted, fontWeight: '500' }}>
                {wishlistedProducts.length} materials saved for future projects
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            {wishlistedProducts.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 44, marginBottom: 8 }}>🤍</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.textMain, marginBottom: 4 }}>
                  Your wishlist is empty
                </Text>
                <Text style={{ fontSize: 12.5, color: COLORS.textMuted, textAlign: 'center', maxWidth: 260 }}>
                  Tap the heart icon on any hardware material to bookmark it for fast ordering later.
                </Text>
              </View>
            ) : (
              wishlistedProducts.map((p) => (
                <View
                  key={p.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: COLORS.surface,
                    borderRadius: 16,
                    padding: 12,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 12,
                      backgroundColor: '#f8fafc',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                      borderWidth: 1,
                      borderColor: COLORS.borderLight,
                    }}
                  >
                    <Text style={{ fontSize: 28 }}>{p.emoji || '🧱'}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.textMain }} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: COLORS.primaryDark, fontWeight: '800', marginTop: 2 }}>
                      ₱{Number(p.base_price || 0).toLocaleString()} <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: '400' }}>/ {p.unit || 'unit'}</Text>
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {onToggleWishlist && (
                      <TouchableOpacity
                        style={{ padding: 6 }}
                        onPress={() => onToggleWishlist(p.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 16, color: COLORS.danger }}>✕</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.featuredAddBtn}
                      onPress={() => onAddToCart(p, 1)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.featuredAddBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
