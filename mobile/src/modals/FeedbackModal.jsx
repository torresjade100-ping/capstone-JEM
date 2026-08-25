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
import { styles } from '../styles/appStyles';

const QUICK_TAGS = [
  '🚚 Fast Delivery',
  '🪵 Quality Lumber',
  '👷 Polite Driver',
  '📦 Complete Items',
  '🧱 Well Packed',
];

export default function FeedbackModal({
  visible,
  order,
  onClose,
  onSubmitFeedback,
}) {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState(['🚚 Fast Delivery', '🪵 Quality Lumber']);
  const [comment, setComment] = useState('Materials arrived in great condition and driver was very helpful!');
  const [submitting, setSubmitting] = useState(false);

  if (!visible || !order) return null;

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    const fullMessage = [
      selectedTags.length > 0 ? `[Highlights: ${selectedTags.join(', ')}]` : '',
      comment.trim(),
    ]
      .filter(Boolean)
      .join('\n');

    setSubmitting(true);
    try {
      await onSubmitFeedback({
        order_number: order.order_number || String(order.id),
        rating,
        message: fullMessage || 'Service completed satisfactorily.',
      });
      onClose();
    } catch (e) {
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent! 🌟'];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '90%',
          }}
        >
          {/* Header */}
          <View style={styles.modalNav}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>
                Delivery Service Feedback ⭐
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
                Order #{order.order_number || order.id}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 20, color: '#94a3b8' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Star Rating Section */}
            <View style={{ alignItems: 'center', marginVertical: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                How was your hardware delivery experience?
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={{ padding: 4 }}
                  >
                    <Text style={{ fontSize: 32 }}>
                      {star <= rating ? '⭐' : '☆'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#ea580c' }}>
                {ratingLabels[rating - 1]} ({rating} / 5 Stars)
              </Text>
            </View>

            {/* Quick Praise Tags */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 8 }}>
                Quick Highlights:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {QUICK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 20,
                        backgroundColor: isSelected ? '#ea580c' : '#f1f5f9',
                        borderWidth: 1,
                        borderColor: isSelected ? '#ea580c' : '#e2e8f0',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: isSelected ? '#fff' : '#475569',
                        }}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Comments Input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                Your Comments &amp; Suggestions:
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#cbd5e1',
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 13,
                  color: '#0f172a',
                  minHeight: 80,
                  textAlignVertical: 'top',
                  backgroundColor: '#f8fafc',
                }}
                multiline
                numberOfLines={3}
                placeholder="Share your experience with driver and materials delivery..."
                placeholderTextColor="#94a3b8"
                value={comment}
                onChangeText={setComment}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryAuthBtn, { backgroundColor: '#ea580c' }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryAuthBtnText}>Submit Service Feedback ⭐</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
