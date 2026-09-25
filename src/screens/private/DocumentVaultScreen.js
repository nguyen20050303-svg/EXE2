import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { confirmAction } from '../../utils/helpers';

export default function DocumentVaultScreen({
  documents,
  loading,
  importing,
  onImportDocument,
  onDeleteDocument,
  onBack,
  onQuickEscape,
}) {
  const getFileIcon = (name = '', mimeType = '') => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf' || mimeType.includes('pdf')) return '📕';
    if (['doc', 'docx'].includes(ext) || mimeType.includes('word')) return '📘';
    if (['xls', 'xlsx', 'csv'].includes(ext) || mimeType.includes('sheet') || mimeType.includes('excel')) return '📗';
    if (['zip', 'rar', '7z'].includes(ext)) return '📦';
    if (['txt', 'md'].includes(ext)) return '📝';
    return '📄';
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← Vault</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.escapeButton} onPress={onQuickEscape}>
          <Text style={styles.escapeText}>Quick Escape</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Document Vault</Text>
      <Text style={styles.subtitle}>Lưu trữ hợp đồng, tài liệu mật, tệp PDF & văn bản nhạy cảm.</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#38BDF8" style={styles.loader} />
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📁</Text>
              <Text style={styles.emptyTitle}>Chưa có tài liệu nào</Text>
              <Text style={styles.emptySubtitle}>Bấm nút bên dưới để chọn file từ điện thoại.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.docCard}>
              <View style={styles.docIconBox}>
                <Text style={styles.docEmoji}>{getFileIcon(item.name, item.mimeType)}</Text>
              </View>

              <View style={styles.docInfo}>
                <Text style={styles.docName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{formatSize(item.size)}</Text>
                  <Text style={styles.metaText}>•</Text>
                  <Text style={styles.metaText}>
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  confirmAction({
                    title: 'Xóa tài liệu',
                    message: `Xóa vĩnh viễn file "${item.name}" khỏi kho?`,
                    confirmText: 'Xóa',
                    onConfirm: () => onDeleteDocument && onDeleteDocument(item.id),
                  });
                }}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Import Button */}
      <TouchableOpacity
        style={[styles.importButton, importing && styles.buttonDisabled]}
        disabled={importing}
        onPress={onImportDocument}
      >
        {importing ? (
          <ActivityIndicator size="small" color="#0F172A" />
        ) : (
          <Text style={styles.importButtonText}>＋ Import tệp / Tài liệu</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingTop: 64,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  escapeButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  escapeText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
  },
  docCard: {
    backgroundColor: '#111C34',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    gap: 14,
  },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docEmoji: {
    fontSize: 22,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  metaText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  deleteBtn: {
    padding: 8,
  },
  deleteBtnText: {
    color: '#64748B',
    fontSize: 16,
  },
  importButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 32,
  },
  importButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
