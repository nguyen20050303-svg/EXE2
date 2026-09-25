import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { confirmAction } from '../../utils/helpers';

function VaultVideoPlayer({ uri, style }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <VideoView
      style={style}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
      startsPictureInPictureAutomatically={false}
    />
  );
}

export default function VideoVaultScreen({
  videos,
  loading,
  importing,
  onImportVideo,
  onDeleteVideo,
  onBack,
  onQuickEscape,
}) {
  const [playingVideo, setPlayingVideo] = useState(null);

  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
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

      <Text style={styles.title}>Video Vault</Text>
      <Text style={styles.subtitle}>Video riêng tư được cô lập trong sandbox an toàn của app.</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#38BDF8" style={styles.loader} />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎬</Text>
              <Text style={styles.emptyTitle}>Chưa có video nào</Text>
              <Text style={styles.emptySubtitle}>Bấm nút bên dưới để nhập video từ thư viện.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.videoCard} onPress={() => setPlayingVideo(item)}>
              <View style={styles.videoIconBox}>
                <Text style={styles.playBadge}>▶</Text>
              </View>

              <View style={styles.videoInfo}>
                <Text style={styles.videoName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.metaRow}>
                  {item.duration ? (
                    <Text style={styles.metaText}>⏱ {formatDuration(item.duration)}</Text>
                  ) : null}
                  <Text style={styles.metaText}>💾 {formatSize(item.size)}</Text>
                  <Text style={styles.metaText}>
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  confirmAction({
                    title: 'Xóa video',
                    message: 'Bạn có chắc muốn xóa video này khỏi kho?',
                    confirmText: 'Xóa',
                    onConfirm: () => onDeleteVideo && onDeleteVideo(item.id),
                  });
                }}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Import Button */}
      <TouchableOpacity
        style={[styles.importButton, importing && styles.buttonDisabled]}
        disabled={importing}
        onPress={onImportVideo}
      >
        {importing ? (
          <ActivityIndicator size="small" color="#0F172A" />
        ) : (
          <Text style={styles.importButtonText}>＋ Import video từ máy</Text>
        )}
      </TouchableOpacity>

      {/* Video Player Modal */}
      <Modal visible={Boolean(playingVideo)} animationType="fade" transparent>
        <View style={styles.playerOverlay}>
          <View style={styles.playerHeader}>
            <Text style={styles.playerName} numberOfLines={1}>
              {playingVideo?.name}
            </Text>
            <TouchableOpacity style={styles.closePlayerBtn} onPress={() => setPlayingVideo(null)}>
              <Text style={styles.closePlayerText}>✕ Đóng</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.videoWrapper}>
            {playingVideo ? (
              <VaultVideoPlayer
                uri={playingVideo.uri}
                style={styles.videoPlayer}
              />
            ) : (
              <View style={styles.noPlayerBox}>
                <Text style={styles.noPlayerText}>Đang chuẩn bị trình phát video...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  videoCard: {
    backgroundColor: '#111C34',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    gap: 14,
  },
  videoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  playBadge: {
    color: '#38BDF8',
    fontSize: 18,
    marginLeft: 2,
  },
  videoInfo: {
    flex: 1,
  },
  videoName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
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
  playerOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  playerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
  },
  closePlayerBtn: {
    backgroundColor: '#222222',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closePlayerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  videoWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  noPlayerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noPlayerText: {
    color: '#94A3B8',
    fontSize: 15,
  },
});
