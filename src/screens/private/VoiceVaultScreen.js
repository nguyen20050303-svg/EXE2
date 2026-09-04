import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function VoiceVaultScreen({
  voices,
  loading,
  onSaveVoice,
  onDeleteVoice,
  onBack,
  onQuickEscape,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingId, setPlayingId] = useState(null);
  const [customName, setCustomName] = useState('');

  const recordingRef = useRef(null);
  const soundRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const getAudioModule = () => {
    try {
      const { Audio } = require('expo-av');
      return Audio;
    } catch {
      return null;
    }
  };

  const startRecording = async () => {
    const Audio = getAudioModule();
    if (!Audio) {
      Alert.alert('Chưa sẵn sàng', 'Mô-đun âm thanh đang được khởi tạo.');
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần cấp quyền', 'Ứng dụng cần quyền Micro để ghi âm.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Lỗi khi bắt đầu ghi âm:', err);
      Alert.alert('Lỗi', 'Không thể bắt đầu ghi âm.');
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const recording = recordingRef.current;
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      if (uri) {
        await onSaveVoice(uri, customName);
        setCustomName('');
      }
    } catch (err) {
      console.error('Lỗi khi dừng ghi âm:', err);
      Alert.alert('Lỗi', 'Không thể lưu bản ghi âm.');
    }
  };

  const playSound = async (item) => {
    const Audio = getAudioModule();
    if (!Audio) return;

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      if (playingId === item.id) {
        setPlayingId(null);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: item.uri },
        { shouldPlay: true },
        (status) => {
          if (status.didJustFinish) {
            setPlayingId(null);
          }
        }
      );

      soundRef.current = sound;
      setPlayingId(item.id);
    } catch (err) {
      console.error('Lỗi phát âm thanh:', err);
      Alert.alert('Lỗi', 'Không thể phát bản ghi âm.');
    }
  };

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
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

      <Text style={styles.title}>Voice Memos</Text>
      <Text style={styles.subtitle}>Ghi âm bí mật trực tiếp và lưu trữ riêng tư trong kho.</Text>

      {/* Recording Studio Box */}
      <View style={[styles.recorderCard, isRecording && styles.recorderCardActive]}>
        <Text style={styles.recordingTimer}>{formatSeconds(recordingSeconds)}</Text>
        <Text style={styles.recordingStatus}>
          {isRecording ? '● Đang ghi âm...' : 'Sẵn sàng thu âm mới'}
        </Text>

        {!isRecording ? (
          <TextInput
            style={styles.nameInput}
            placeholder="Tên bản ghi (tùy chọn)"
            placeholderTextColor="#64748B"
            value={customName}
            onChangeText={setCustomName}
          />
        ) : null}

        <TouchableOpacity
          style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
        </TouchableOpacity>
        <Text style={styles.recordBtnLabel}>
          {isRecording ? 'Chạm để Dừng & Lưu' : 'Chạm nút đỏ để Thu âm'}
        </Text>
      </View>

      {/* Voice List */}
      <Text style={styles.listHeader}>Bản ghi âm đã lưu ({voices.length})</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#38BDF8" style={styles.loader} />
      ) : (
        <FlatList
          data={voices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎙️</Text>
              <Text style={styles.emptyTitle}>Chưa có bản ghi âm nào</Text>
              <Text style={styles.emptySubtitle}>Bấm nút thu âm phía trên để bắt đầu.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPlaying = playingId === item.id;

            return (
              <View style={styles.voiceCard}>
                <TouchableOpacity style={styles.playBtn} onPress={() => playSound(item)}>
                  <Text style={styles.playBtnText}>{isPlaying ? '⏸' : '▶'}</Text>
                </TouchableOpacity>

                <View style={styles.voiceInfo}>
                  <Text style={styles.voiceName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.voiceDate}>
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')} •{' '}
                    {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    Alert.alert('Xóa ghi âm', `Xóa bản ghi "${item.name}"?`, [
                      { text: 'Hủy', style: 'cancel' },
                      {
                        text: 'Xóa',
                        style: 'destructive',
                        onPress: () => onDeleteVoice && onDeleteVoice(item.id),
                      },
                    ]);
                  }}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
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
  recorderCard: {
    backgroundColor: '#111C34',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  recorderCardActive: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: '#1C1528',
  },
  recordingTimer: {
    color: '#F8FAFC',
    fontSize: 40,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  recordingStatus: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 14,
  },
  nameInput: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  recordBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1E293B',
    borderWidth: 4,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  recordBtnActive: {
    borderColor: '#F87171',
  },
  recordInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
  },
  recordInnerActive: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  recordBtnLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  listHeader: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 32,
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
  },
  voiceCard: {
    backgroundColor: '#111C34',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    gap: 12,
  },
  playBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 2,
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  voiceDate: {
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
});
