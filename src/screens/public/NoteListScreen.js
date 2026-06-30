import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatDate } from '../../utils/helpers';

export default function NoteListScreen({
  notes,
  loading,
  searchQuery,
  onChangeSearchQuery,
  onSelectNote,
  onCreateNote,
  biometricEnabled,
  onBiometricUnlock,
}) {
  const [composerVisible, setComposerVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const noteCountLabel = useMemo(() => {
    if (notes.length === 0) return 'Không có ghi chú';
    if (notes.length === 1) return '1 ghi chú';
    return `${notes.length} ghi chú`;
  }, [notes.length]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      return;
    }

    setSaving(true);
    await onCreateNote({ title, content });
    setSaving(false);
    setTitle('');
    setContent('');
    setComposerVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Notes</Text>
          <Text style={styles.subtitle}>{noteCountLabel}</Text>
        </View>

        <View style={styles.headerActions}>
          {biometricEnabled ? (
            <TouchableOpacity style={styles.iconButton} onPress={onBiometricUnlock}>
              <Text style={styles.iconButtonText}>◎</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.addButton} onPress={() => setComposerVisible(true)}>
            <Text style={styles.addButtonText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchShell}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm"
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={onChangeSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#111827" style={styles.loader} />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable style={styles.noteCard} onPress={() => onSelectNote(item)}>
              <View style={styles.noteCardHeader}>
                <Text style={styles.noteTitle}>{item.title}</Text>
                <Text style={styles.noteDate}>{formatDate(item.updatedAt)}</Text>
              </View>
              <Text style={styles.noteSummary} numberOfLines={2}>
                {item.content}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Không tìm thấy ghi chú phù hợp</Text>
              <Text style={styles.emptyDescription}>Thử một từ khóa khác hoặc tạo ghi chú mới.</Text>
            </View>
          }
        />
      )}

      <Modal visible={composerVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setComposerVisible(false)}>
              <Text style={styles.cancelText}>Đóng</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ghi chú mới</Text>
            <TouchableOpacity disabled={saving} onPress={handleSave}>
              <Text style={styles.saveText}>{saving ? 'Đang lưu' : 'Lưu'}</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.titleInput}
            placeholder="Tiêu đề"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.contentInput}
            placeholder="Bắt đầu viết..."
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F5',
    paddingHorizontal: 20,
    paddingTop: 64,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconButtonText: {
    fontSize: 18,
    color: '#374151',
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 18,
  },
  searchIcon: {
    fontSize: 16,
    color: '#9CA3AF',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  loader: {
    marginTop: 48,
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  noteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 8,
  },
  noteTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  noteDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noteSummary: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4B5563',
  },
  emptyState: {
    marginTop: 52,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F7F7F5',
    paddingTop: 64,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 16,
  },
  modalTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  saveText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  titleInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 14,
  },
  contentInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
  },
});
