import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatDate } from '../../utils/helpers';

export default function VaultNotesScreen({ mode, notes, onCreateNote, onBack, onQuickEscape }) {
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
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← Vault</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.escapeButton} onPress={onQuickEscape}>
          <Text style={styles.escapeText}>Quick Escape</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{isDecoy ? 'Decoy notes' : 'Private notes'}</Text>
      <Text style={styles.subtitle}>
        {isDecoy
          ? 'Các ghi chú vô hại để đánh lạc hướng khi cần.'
          : 'Không gian để lưu thông tin riêng tư, checklist nhạy cảm và dữ liệu cá nhân.'}
      </Text>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteTitle}>{item.title}</Text>
              <Text style={styles.noteDate}>{formatDate(item.updatedAt)}</Text>
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
  noteTitle: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  noteDate: {
    color: '#94A3B8',
    fontSize: 12,
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
