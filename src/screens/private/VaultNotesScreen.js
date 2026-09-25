import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatDate, confirmAction } from '../../utils/helpers';

export default function VaultNotesScreen({ mode, notes, onCreateNote, onDeleteNote, onBack, onQuickEscape }) {
  const [composerVisible, setComposerVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const isDecoy = mode === 'decoy';

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      return;
    }

    await onCreateNote({ title, content });
    setTitle('');
    setContent('');
    setComposerVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isDecoy ? 'Kho Ghi Chú' : 'Private Notes'}</Text>
        <TouchableOpacity style={styles.quickEscapeBtn} onPress={onQuickEscape}>
          <Text style={styles.quickEscapeText}>🔒 Thoát</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <View style={styles.noteHeaderLeft}>
                <Text style={styles.noteTitle}>{item.title}</Text>
                <Text style={styles.noteDate}>{formatDate(item.updatedAt)}</Text>
              </View>
              {onDeleteNote ? (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    confirmAction({
                      title: 'Xóa ghi chú',
                      message: `Xóa ghi chú "${item.title}" khỏi kho bí mật?`,
                      confirmText: 'Xóa',
                      onConfirm: () => onDeleteNote(item.id),
                    });
                  }}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.noteBody}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{isDecoy ? 'Chưa có ghi chú decoy' : 'Chưa có private note nào'}</Text>
            <Text style={styles.emptyDescription}>Tạo ghi chú đầu tiên cho không gian này.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.addButton} onPress={() => setComposerVisible(true)}>
        <Text style={styles.addButtonText}>Tạo ghi chú</Text>
      </TouchableOpacity>

      <Modal visible={composerVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setComposerVisible(false)}>
              <Text style={styles.closeText}>Đóng</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ghi chú mới</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveText}>Lưu</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.titleInput}
            placeholder="Tiêu đề"
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={styles.contentInput}
            placeholder="Nội dung"
            placeholderTextColor="#94A3B8"
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
    backgroundColor: '#020617',
    paddingHorizontal: 20,
    paddingTop: 64,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  backText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  escapeButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  escapeText: {
    color: '#020617',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 18,
  },
  listContent: {
    paddingBottom: 100,
    gap: 12,
  },
  noteCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  noteHeaderLeft: {
    flex: 1,
  },
  noteTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  noteDate: {
    color: '#94A3B8',
    fontSize: 12,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteBtnText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '700',
  },
  noteBody: {
    color: '#CBD5E1',
    lineHeight: 21,
  },
  emptyState: {
    marginTop: 52,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyDescription: {
    color: '#94A3B8',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 26,
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#EFF6FF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: 64,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  saveText: {
    color: '#E0E7FF',
    fontSize: 16,
    fontWeight: '700',
  },
  titleInput: {
    backgroundColor: '#111827',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 14,
  },
  contentInput: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#F8FAFC',
    fontSize: 16,
  },
});
