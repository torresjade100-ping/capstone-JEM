import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { styles } from '../styles/appStyles';

export default function ProductDetailsModal({
  product,
  onClose,
  onAddToCart,
}) {
  if (!product) return null;

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '85%',
          }}
        >
          <View style={styles.modalNav}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>
              Product Details
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 20, color: '#94a3b8' }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.detailThumb}>
              <Text style={{ fontSize: 80 }}>{product.emoji}</Text>
            </View>
            <Text
              style={{
                fontSize: 13,
                color: '#f97316',
                fontWeight: '800',
                textTransform: 'uppercase',
                marginTop: 12,
              }}
            >
              {product.brand} • {product.category}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a', marginVertical: 4 }}>
              {product.name}
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#f97316' }}>
              ₱{product.base_price.toLocaleString()}{' '}
              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '400' }}>
                / {product.unit}
              </Text>
            </Text>
            <Text style={{ fontSize: 13.5, color: '#475569', lineHeight: 20, marginTop: 10 }}>
              {product.description}
            </Text>
            <TouchableOpacity
              style={[styles.primaryAuthBtn, { marginTop: 20 }]}
              onPress={() => onAddToCart(product, 1)}
            >
              <Text style={styles.primaryAuthBtnText}>Add to Cart 🛒</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
