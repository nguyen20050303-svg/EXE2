import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function VaultDashboardScreen({ mode, summary, onOpenNotes, onOpenPhotos, onQuickEscape }) {
  const isDecoy = mode === 'decoy';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>{isDecoy ? 'Decoy vault' : 'Hidder vault'}</Text>
          <Text style={styles.title}>{isDecoy ? 'Safe Space' : 'Private Space'}</Text>
          <Text style={styles.subtitle}>
            {isDecoy
              ? 'Nội dung vô hại để giữ lớp vỏ an toàn.'
              : 'Không gian riêng tư local-first, chỉ mở bằng mã thật.'}
          </Text>
        </View>

        <TouchableOpacity style={styles.escapeButton} onPress={onQuickEscape}>
          <Text style={styles.escapeText}>Quick Escape</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Notes</Text>
          <Text style={styles.metricValue}>{summary.noteCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Photos</Text>
          <Text style={styles.metricValue}>{summary.photoCount}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryCard} onPress={onOpenNotes}>
        <Text style={styles.primaryTitle}>{isDecoy ? 'Decoy notes' : 'Private notes'}</Text>
        <Text style={styles.primaryBody}>
          {isDecoy
            ? 'Mở danh sách ghi chú vô hại dùng cho trường hợp cần đánh lạc hướng.'
            : 'Lưu các ghi chú cá nhân, tài khoản, checklist và dữ liệu nhạy cảm.'}
        </Text>
      </TouchableOpacity>

      {!isDecoy ? (
        <TouchableOpacity style={styles.secondaryCard} onPress={onOpenPhotos}>
          <Text style={styles.secondaryTitle}>Photo vault</Text>
          <Text style={styles.secondaryBody}>Import ảnh vào sandbox local của ứng dụng để giảm lộ ý đồ.</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.secondaryCardMuted}>
          <Text style={styles.secondaryTitle}>Decoy shield</Text>
          <Text style={styles.secondaryBody}>Vault giả chỉ hiển thị các nội dung vô hại và không cho lộ kho thật.</Text>
        </View>
      )}

      <View style={styles.recentSection}>
        <Text style={styles.recentTitle}>Recent items</Text>
        {summary.recentNotes.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có dữ liệu nào trong không gian này.</Text>
        ) : (
          summary.recentNotes.map((item) => (
            <View key={item.id} style={styles.recentCard}>
              <Text style={styles.recentCardTitle}>{item.title}</Text>
              <Text style={styles.recentCardBody} numberOfLines={2}>
                {item.content}
              </Text>
            </View>
          ))
        )}
      </View>
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
    gap: 18,
    marginBottom: 24,
  },
  eyebrow: {
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 12,
    marginBottom: 8,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  escapeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  escapeText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#111C34',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 8,
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '700',
  },
  primaryCard: {
    backgroundColor: '#1D4ED8',
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
  },
  primaryTitle: {
    color: '#EFF6FF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  primaryBody: {
    color: '#DBEAFE',
    fontSize: 14,
    lineHeight: 21,
  },
  secondaryCard: {
    backgroundColor: '#111C34',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  secondaryCardMuted: {
    backgroundColor: '#111C34',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  secondaryTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  secondaryBody: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  recentSection: {
    gap: 10,
    paddingBottom: 24,
  },
  recentTitle: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '700',
  },
  recentCard: {
    backgroundColor: '#111C34',
    borderRadius: 18,
    padding: 14,
  },
  recentCardTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  recentCardBody: {
    color: '#94A3B8',
    lineHeight: 20,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
});
