import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PhotoVaultScreen({ photos, loading, importing, onImportPhoto, onBack, onQuickEscape }) {
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

      <Text style={styles.title}>Photo vault</Text>
      <Text style={styles.subtitle}>Ảnh được copy vào sandbox local của ứng dụng.</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#F8FAFC" style={styles.loader} />
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => (
            <View style={styles.photoCard}>
              <Image source={{ uri: item.uri }} style={styles.photo} />
              <Text style={styles.photoName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Chưa có ảnh nào</Text>
              <Text style={styles.emptyDescription}>Import một ảnh để bắt đầu xây dựng photo vault local.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.importButton} disabled={importing} onPress={onImportPhoto}>
        <Text style={styles.importButtonText}>{importing ? 'Đang import...' : 'Import ảnh từ thư viện'}</Text>
      </TouchableOpacity>
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
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
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 20,
  },
  loader: {
    marginTop: 60,
  },
  gridContent: {
    paddingBottom: 100,
    gap: 12,
  },
  gridRow: {
    gap: 12,
  },
  photoCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 18,
    overflow: 'hidden',
    paddingBottom: 10,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
  },
  photoName: {
    color: '#E2E8F0',
    fontSize: 13,
    marginTop: 8,
    marginHorizontal: 10,
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  emptyDescription: {
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  importButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 26,
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#EFF6FF',
    fontSize: 15,
    fontWeight: '700',
  },
});
