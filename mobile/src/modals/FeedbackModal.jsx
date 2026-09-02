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

const QUICK_TAGS = [
  '🚚 Fast Site Delivery',
  '🪵 Quality Construction Lumber',
  '👷 Polite Freight Driver',
  '📦 Complete Hardware Items',
  '🧱 Well Packed Materials',
  '💵 Smooth Payment Processing',
];

export default function FeedbackModal({
  visible,
  order,
  onClose,
  onSubmitFeedback,
}) {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState(['🚚 Fast Site Delivery', '🪵 Quality Construction Lumber']);
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

  const ratingLabels = [
    '1 ★ Poor Experience',
    '2 ★ Fair - Needs Improvement',
    '3 ★ Good Delivery',
    '4 ★ Very Good Service',
    '5 ★ Outstanding Contractor Service! 🌟',
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheetContainer}>
          <View style={styles.sheetDragHandle} />

          {/* Modal Header */}
          <View style={styles.modalNav}>
            <View>
              <Text style={styles.modalNavTitle}>Delivery Service Review ⭐</Text>
              <Text style={{ fontSize: 11.5, color: COLORS.textMuted, fontWeight: '600' }}>
                Order #{order.order_number || order.id}
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 1. Star Rating Selector */}
            <View style={{ alignItems: 'center', marginVertical: 14 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.textMain, marginBottom: 8 }}>
                How was your hardware delivery experience?
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, marginVertical: 6 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    activeOpacity={0.7}
                    style={{
                      padding: 4,
                      transform: [{ scale: rating >= star ? 1.15 : 1.0 }],
                    }}
                  >
                    <Text style={{ fontSize: 32 }}>{rating >= star ? '⭐' : '☆'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View
                style={{
                  backgroundColor: COLORS.primaryLight,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                  marginTop: 4,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.primaryDark }}>
                  {ratingLabels[rating - 1]}
                </Text>
              </View>
            </View>

            {/* 2. Quick Highlight Chips */}
            <View style={{ marginVertical: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.textMain, marginBottom: 8 }}>
                What went well? (Select all that apply):
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {QUICK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: isSelected ? COLORS.primaryLight : COLORS.surface,
                        borderWidth: 1.5,
                        borderColor: isSelected ? COLORS.primary : COLORS.border,
                      }}
                      onPress={() => toggleTag(tag)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? COLORS.primaryDark : COLORS.textBody,
                        }}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Review Comment Box */}
            <View style={{ marginVertical: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.textMain, marginBottom: 6 }}>
                Additional Feedback / Site Notes:
              </Text>
              <TextInput
                style={{
                  backgroundColor: COLORS.surface,
                  borderWidth: 1.5,
                  borderColor: COLORS.border,
                  borderRadius: 14,
                  padding: 12,
                  fontSize: 13.5,
                  color: COLORS.textMain,
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
                multiline
                placeholder="Share your feedback on material quality, dispatch speed, or driver service..."
                placeholderTextColor="#94a3b8"
                value={comment}
                onChangeText={setComment}
              />
            </View>

            {/* 4. Submit Button */}
            <TouchableOpacity
              style={[
                styles.primaryAuthBtn,
                { marginTop: 14, marginBottom: 20 },
                submitting && { opacity: 0.8 },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.88}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.primaryAuthBtnText}>Submit Review &amp; Feedback ⭐</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
