import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { styles } from '../styles/appStyles';

export default function WishlistModal({
  visible,
  products,
  wishlist,
  onClose,
  onAddToCart,
}) {
  if (!visible) return null;

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '80%',
          }}
        >
          <View style={styles.modalNav}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>
              ❤️ My Saved Wishlist
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 20, color: '#94a3b8' }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ paddingVertical: 10 }}>
            {wishlistedProducts.length === 0 ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🤍</Text>
                <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600' }}>
                  Your wishlist is empty
                </Text>
              </View>
            ) : (
              wishlistedProducts.map((p) => (
                <View
                  key={p.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderColor: '#f1f5f9',
                  }}
                >
                  <Text style={{ fontSize: 32, marginRight: 12 }}>{p.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                      {p.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#f97316', fontWeight: '800' }}>
                      ₱{p.base_price.toLocaleString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.featuredAddBtn}
                    onPress={() => onAddToCart(p, 1)}
                  >
                    <Text style={styles.featuredAddBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
