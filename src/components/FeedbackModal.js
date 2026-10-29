import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { submitUserFeedback } from '../services/feedbackService';

const CATEGORIES = [
  { id: 'FEATURE', label: '💡 Tính năng' },
  { id: 'BUG', label: '🐛 Báo lỗi' },
  { id: 'EXPERIENCE', label: '✨ Trải nghiệm' },
  { id: 'GENERAL', label: '💬 Ý kiến khác' },
];

export default function FeedbackModal({ visible, onClose, currentUser }) {
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState('FEATURE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung góp ý của bạn.');
      return;
    }

    setLoading(true);
    const res = await submitUserFeedback({
      userId: currentUser?.id || null,
      email: currentUser?.email || 'Ẩn danh',
      rating,
      category,
      title: title.trim(),
      content: content.trim(),
      appVersion: '1.0.0',
    });
    setLoading(false);

    if (res.success) {
      Alert.alert(
        'Cảm ơn bạn! 🎉',
        'Phản hồi của bạn đã được gửi thành công đến đội ngũ phát triển Hidder.',
        [
          {
            text: 'Đóng',
            onPress: () => {
              setTitle('');
              setContent('');
              setRating(5);
              onClose();
            },
          },
        ]
      );
    } else {
      Alert.alert('Lỗi', res.error || 'Không thể gửi phản hồi lúc này. Vui lòng thử lại sau.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Đóng Góp Ý Kiến & Phản Hồi</Text>
              <Text style={styles.subtitle}>
                Ý kiến thực tế từ bạn là động lực giúp đội ngũ cải tiến ứng dụng mỗi ngày.
              </Text>
            </View>

            {/* Rating Stars */}
            <View style={styles.ratingSection}>
              <Text style={styles.label}>Đánh giá trải nghiệm của bạn:</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    activeOpacity={0.7}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <Text style={[styles.starIcon, star <= rating && styles.starIconActive]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingText}>
                {rating === 5 && 'Tuyệt vời! Rất hài lòng ⭐⭐⭐⭐⭐'}
                {rating === 4 && 'Tốt, cần cải thiện một chút ⭐⭐⭐⭐'}
                {rating === 3 && 'Bình thường ⭐⭐⭐'}
                {rating === 2 && 'Chưa hài lòng ⭐⭐'}
                {rating === 1 && 'Rất thất vọng ⭐'}
              </Text>
            </View>

            {/* Categories */}
            <View style={styles.section}>
              <Text style={styles.label}>Loại phản hồi:</Text>
              <View style={styles.categoriesRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    style={[
                      styles.categoryBadge,
                      category === cat.id && styles.categoryBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        category === cat.id && styles.categoryTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Title Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Tiêu đề (tùy chọn):</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Tính năng ngụy trang máy tính..."
                placeholderTextColor="#64748B"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Content Input */}
            <View style={styles.section}>
              <Text style={styles.label}>
                Nội dung chi tiết <Text style={styles.required}>*</Text>:
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhập mô tả lỗi, đề xuất tính năng hoặc cảm nhận của bạn..."
                placeholderTextColor="#64748B"
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitText}>Gửi Phản Hồi</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#0F172A',
    width: '100%',
    maxWidth: 480,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '90%',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  ratingSection: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  starButton: {
    padding: 4,
  },
  starIcon: {
    fontSize: 32,
    color: '#475569',
  },
  starIconActive: {
    color: '#F59E0B',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 4,
  },
  section: {
    marginBottom: 14,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryBadgeActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#6366F1',
  },
  categoryText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
  },
  textArea: {
    height: 90,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  cancelText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    minWidth: 120,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

