import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getPendingQueueCount, subscribeToSyncChanges } from '../../services/syncManager';

export default function VaultDashboardScreen({
  mode,
  summary,
  currentUser,
  disguiseType,
  onChangeDisguise,
  onOpenNotes,
  onOpenPhotos,
  onOpenVideos,
  onOpenPasswords,
  onOpenDocuments,
  onOpenVoices,
  onOpenAccount,
  onQuickEscape,
  onSyncCloud,
  isSyncing,
  lastSync,
}) {
  const isDecoy = mode === 'decoy';
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (currentUser?.id) {
      void getPendingQueueCount(currentUser.id).then(setPendingCount);
      const unsub = subscribeToSyncChanges(() => {
        void getPendingQueueCount(currentUser.id).then(setPendingCount);
      });
      return unsub;
    }
  }, [currentUser, isSyncing]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleBox}>
          <Text style={styles.eyebrow}>{isDecoy ? 'Decoy vault' : 'Hidder vault'}</Text>
          <Text style={styles.title}>{isDecoy ? 'Safe Space' : 'Private Space'}</Text>
          <Text style={styles.subtitle}>
            {isDecoy
              ? 'Nội dung vô hại để giữ lớp vỏ an toàn khi bị ép mở.'
              : 'Hệ sinh thái bảo mật local-first, chỉ mở bằng mã thật.'}
          </Text>
        </View>

        <TouchableOpacity style={styles.escapeButton} onPress={onQuickEscape}>
          <Text style={styles.escapeText}>Quick Escape</Text>
        </TouchableOpacity>
      </View>

      {/* Account Card (Private Vault only) */}
      {!isDecoy && onOpenAccount ? (
        <TouchableOpacity style={styles.accountCard} onPress={onOpenAccount}>
          <View style={styles.accountCardLeft}>
            <View style={styles.accountIconCircle}>
              <Text style={styles.accountIconText}>
                {currentUser?.email ? currentUser.email[0].toUpperCase() : '👤'}
              </Text>
            </View>
            <View style={styles.accountCardTexts}>
              <Text style={styles.accountTitle} numberOfLines={1}>
                {currentUser ? currentUser.email : 'Tài khoản Cloud'}
              </Text>
              <Text style={styles.accountSubtitle}>
                {currentUser ? 'Đã liên kết • Chạm để quản lý' : 'Chưa đăng nhập • Chạm để Đăng ký / Đăng nhập'}
              </Text>
            </View>
          </View>
          <Text style={styles.accountChevron}>›</Text>
        </TouchableOpacity>
      ) : null}

      {/* Supabase Cloud Sync Card */}
      {!isDecoy && onSyncCloud ? (
        <View style={styles.syncCard}>
          <View style={styles.syncCardHeader}>
            <View style={styles.syncCardInfo}>
              <Text style={styles.syncTitle}>☁️ Supabase Cloud Sync</Text>
              <Text style={styles.syncSubtitle}>
                {pendingCount > 0
                  ? `⏳ Có ${pendingCount} mục chờ đồng bộ lên Cloud`
                  : lastSync
                  ? `Đã đồng bộ lúc: ${lastSync}`
                  : 'Chưa đồng bộ lên đám mây'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
              disabled={isSyncing}
              onPress={onSyncCloud}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <Text style={styles.syncButtonText}>Đồng bộ ngay</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Disguise Shell Switcher (Private Vault only) */}
      {!isDecoy && onChangeDisguise ? (
        <View style={styles.disguiseCard}>
          <Text style={styles.disguiseHeaderTitle}>🎭 Lớp vỏ ngụy trang bên ngoài</Text>
          <View style={styles.disguiseButtons}>
            <TouchableOpacity
              style={[styles.disguiseBtn, disguiseType === 'notes' && styles.disguiseBtnActive]}
              onPress={() => onChangeDisguise('notes')}
            >
              <Text style={[styles.disguiseBtnText, disguiseType === 'notes' && styles.disguiseBtnTextActive]}>
                📝 Ghi chú (Notes)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.disguiseBtn, disguiseType === 'calculator' && styles.disguiseBtnActive]}
              onPress={() => onChangeDisguise('calculator')}
            >
              <Text style={[styles.disguiseBtnText, disguiseType === 'calculator' && styles.disguiseBtnTextActive]}>
                🧮 Máy tính (Calculator)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Feature Grid Header */}
      <Text style={styles.sectionTitle}>
        {isDecoy ? 'Kho mồi đánh lạc hướng' : 'Các Kho Bảo Mật'}
      </Text>

      {/* Modules Grid */}
      <View style={styles.grid}>
        {/* Notes */}
        <TouchableOpacity style={styles.gridItem} onPress={onOpenNotes}>
          <View style={[styles.iconWrap, { backgroundColor: '#1E3A8A' }]}>
            <Text style={styles.iconEmoji}>📝</Text>
          </View>
          <Text style={styles.gridItemTitle}>{isDecoy ? 'Decoy Notes' : 'Private Notes'}</Text>
          <Text style={styles.gridItemCount}>{summary.noteCount || 0} ghi chú</Text>
        </TouchableOpacity>

        {!isDecoy ? (
          <>
            {/* Photos */}
            <TouchableOpacity style={styles.gridItem} onPress={onOpenPhotos}>
              <View style={[styles.iconWrap, { backgroundColor: '#065F46' }]}>
                <Text style={styles.iconEmoji}>🖼️</Text>
              </View>
              <Text style={styles.gridItemTitle}>Photo Vault</Text>
              <Text style={styles.gridItemCount}>{summary.photoCount || 0} ảnh</Text>
            </TouchableOpacity>

            {/* Videos */}
            <TouchableOpacity style={styles.gridItem} onPress={onOpenVideos}>
              <View style={[styles.iconWrap, { backgroundColor: '#7C2D12' }]}>
                <Text style={styles.iconEmoji}>🎬</Text>
              </View>
              <Text style={styles.gridItemTitle}>Video Vault</Text>
              <Text style={styles.gridItemCount}>{summary.videoCount || 0} video</Text>
            </TouchableOpacity>

            {/* Passwords & Cards */}
            <TouchableOpacity style={styles.gridItem} onPress={onOpenPasswords}>
              <View style={[styles.iconWrap, { backgroundColor: '#581C87' }]}>
                <Text style={styles.iconEmoji}>🔑</Text>
              </View>
              <Text style={styles.gridItemTitle}>Passwords & Cards</Text>
              <Text style={styles.gridItemCount}>{summary.passwordCount || 0} mục</Text>
            </TouchableOpacity>

            {/* Documents */}
            <TouchableOpacity style={styles.gridItem} onPress={onOpenDocuments}>
              <View style={[styles.iconWrap, { backgroundColor: '#1E293B' }]}>
                <Text style={styles.iconEmoji}>📁</Text>
              </View>
              <Text style={styles.gridItemTitle}>Document Vault</Text>
              <Text style={styles.gridItemCount}>{summary.documentCount || 0} file</Text>
            </TouchableOpacity>

            {/* Voice Memos */}
            <TouchableOpacity style={styles.gridItem} onPress={onOpenVoices}>
              <View style={[styles.iconWrap, { backgroundColor: '#831843' }]}>
                <Text style={styles.iconEmoji}>🎙️</Text>
              </View>
              <Text style={styles.gridItemTitle}>Voice Memos</Text>
              <Text style={styles.gridItemCount}>{summary.voiceCount || 0} bản ghi</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.decoyShieldBox}>
            <Text style={styles.decoyShieldTitle}>🛡️ Decoy Shield Active</Text>
            <Text style={styles.decoyShieldBody}>
              Kho giả lập chỉ hiển thị các ghi chú an toàn để bảo vệ tuyệt đối kho thật của bạn khi bị ép mở ứng dụng.
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitleBox: {
    flex: 1,
    marginRight: 12,
  },
  eyebrow: {
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 12,
    marginBottom: 6,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
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
  accountCard: {
    backgroundColor: '#111C34',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  accountIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  accountIconText: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '700',
  },
  accountCardTexts: {
    flex: 1,
  },
  accountTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  accountSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  accountChevron: {
    color: '#64748B',
    fontSize: 22,
    fontWeight: '600',
    marginLeft: 8,
  },
  syncCard: {
    backgroundColor: '#111C34',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  syncCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  syncTitle: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  syncSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  syncButton: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    minWidth: 105,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
  disguiseCard: {
    backgroundColor: '#111C34',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  disguiseHeaderTitle: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  disguiseButtons: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  disguiseBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  disguiseBtnActive: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  disguiseBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  disguiseBtnTextActive: {
    color: '#38BDF8',
  },
  sectionTitle: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#111C34',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconEmoji: {
    fontSize: 22,
  },
  gridItemTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  gridItemCount: {
    color: '#94A3B8',
    fontSize: 12,
  },
  decoyShieldBox: {
    width: '100%',
    backgroundColor: '#111C34',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  decoyShieldTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  decoyShieldBody: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
  },
});
