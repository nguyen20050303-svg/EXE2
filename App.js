import React, { useContext, useEffect, useState } from 'react';
import { Alert, StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext, AuthProvider } from './src/context/AuthContext';
import SetupWizard from './src/components/SetupWizard';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import SubscriptionScreen from './src/screens/subscription/SubscriptionScreen';
import NoteListScreen from './src/screens/public/NoteListScreen';
import NoteDetailScreen from './src/screens/public/NoteDetailScreen';
import CalculatorScreen from './src/screens/public/CalculatorScreen';
import WeatherScreen from './src/screens/public/WeatherScreen';
import CalendarScreen from './src/screens/public/CalendarScreen';
import VaultDashboardScreen from './src/screens/private/VaultDashboardScreen';
import PhotoVaultScreen from './src/screens/private/PhotoVaultScreen';
import VaultNotesScreen from './src/screens/private/VaultNotesScreen';
import PasswordVaultScreen from './src/screens/private/PasswordVaultScreen';
import VideoVaultScreen from './src/screens/private/VideoVaultScreen';
import DocumentVaultScreen from './src/screens/private/DocumentVaultScreen';
import VoiceVaultScreen from './src/screens/private/VoiceVaultScreen';
import AccountScreen from './src/screens/private/AccountScreen';
import HiddenSettingsScreen from './src/screens/settings/HiddenSettingsScreen';
import { logAppOpen, logDisguiseChange } from './src/services/analytics';
import {
  addDocumentItem,
  addPhotoItem,
  addVideoItem,
  addVoiceItem,
  createPublicNote,
  createVaultNote,
  deleteDocumentItem,
  deletePasswordItem,
  deletePhotoItem,
  deleteVaultNote,
  deleteVideoItem,
  deleteVoiceItem,
  getDocumentItems,
  getLastSyncTime,
  getPasswordItems,
  getPhotoItems,
  getPublicNotes,
  getVaultNotes,
  getVaultSummary,
  getVideoItems,
  getVoiceItems,
  savePasswordItem,
  searchPublicNotes,
  syncAllWithSupabase,
} from './src/services/database';
import {
  importDocumentToVault,
  importPhotoToVault,
  importVideoToVault,
  saveAudioToVault,
} from './src/services/fileSystem';

function LoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}

function MainAppContent() {
  const {
    activeVaultMode,
    attemptUnlock,
    authenticateBiometric,
    biometricEnabled,
    completeSetup,
    currentUser,
    disguiseType,
    changeDisguiseType,
    isInitializing,
    isSetupComplete,
    isUnlocked,
    lockVault,
    setPickerActive,
    biometricAvailable,
    subscription,
    subscriptionAccess,
    subscriptionLoading,
    signOutUser,
  } = useContext(AuthContext);

  const [authScreen, setAuthScreen] = useState('login'); // 'login' | 'register'
  const [currentScreen, setCurrentScreen] = useState('public-list');
  const [selectedNote, setSelectedNote] = useState(null);
  const [publicNotes, setPublicNotes] = useState([]);
  const [visiblePublicNotes, setVisiblePublicNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPublicNotes, setLoadingPublicNotes] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setAuthScreen('login');
    }
  }, [currentUser]);

  useEffect(() => {
    void logAppOpen();
  }, []);

  useEffect(() => {
    if (disguiseType) {
      void logDisguiseChange(disguiseType);
    }
  }, [disguiseType]);

  // Vault data states
  const [vaultSummary, setVaultSummary] = useState({
    noteCount: 0,
    photoCount: 0,
    videoCount: 0,
    passwordCount: 0,
    documentCount: 0,
    voiceCount: 0,
    recentNotes: [],
  });
  const [vaultNotes, setVaultNotes] = useState([]);
  const [photoItems, setPhotoItems] = useState([]);
  const [videoItems, setVideoItems] = useState([]);
  const [passwordItems, setPasswordItems] = useState([]);
  const [documentItems, setDocumentItems] = useState([]);
  const [voiceItems, setVoiceItems] = useState([]);

  // Loading & status states
  const [loadingVault, setLoadingVault] = useState(false);
  const [importingPhoto, setImportingPhoto] = useState(false);
  const [importingVideo, setImportingVideo] = useState(false);
  const [importingDocument, setImportingDocument] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    if (!isSetupComplete) {
      return;
    }
    loadPublicNotes();
  }, [isSetupComplete]);

  useEffect(() => {
    if (!isUnlocked || !activeVaultMode) {
      setCurrentScreen('public-list');
      setSelectedNote(null);
      return;
    }

    setCurrentScreen('vault-home');
    void loadVaultData(activeVaultMode);
  }, [activeVaultMode, isUnlocked]);

  const loadPublicNotes = async () => {
    setLoadingPublicNotes(true);
    const notes = await getPublicNotes();
    setPublicNotes(notes);
    setVisiblePublicNotes(notes);
    setLoadingPublicNotes(false);
  };

  const loadVaultData = async (mode) => {
    // If Real vault mode and subscription is expired, do not load sensitive vault items
    if (mode === 'real' && subscriptionAccess && !subscriptionAccess.valid) {
      return;
    }
    setLoadingVault(true);
    const isReal = mode === 'real';

    const [summary, notes, photos, videos, passwords, documents, voices, syncTime] =
      await Promise.all([
        getVaultSummary(mode),
        getVaultNotes(mode),
        isReal ? getPhotoItems() : Promise.resolve([]),
        isReal ? getVideoItems() : Promise.resolve([]),
        isReal ? getPasswordItems() : Promise.resolve([]),
        isReal ? getDocumentItems() : Promise.resolve([]),
        isReal ? getVoiceItems() : Promise.resolve([]),
        getLastSyncTime(),
      ]);

    setVaultSummary(summary);
    setVaultNotes(notes);
    setPhotoItems(photos);
    setVideoItems(videos);
    setPasswordItems(passwords);
    setDocumentItems(documents);
    setVoiceItems(voices);
    setLastSync(syncTime);
    setLoadingVault(false);
  };

  const handleSearchChange = async (value) => {
    setSearchQuery(value);
    const unlockMode = await attemptUnlock(value);

    if (unlockMode !== 'none') {
      setSearchQuery('');
      const notes = await getPublicNotes();
      setVisiblePublicNotes(notes);
      return;
    }

    const filtered = await searchPublicNotes(value);
    setVisiblePublicNotes(filtered);
  };

  const handleCreatePublicNote = async (note) => {
    await createPublicNote(note);
    const notes = await getPublicNotes();
    setPublicNotes(notes);
    setVisiblePublicNotes(searchQuery.trim() ? await searchPublicNotes(searchQuery) : notes);
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setCurrentScreen('public-detail');
  };

  const handleBiometricUnlock = async () => {
    const success = await authenticateBiometric();
    if (!success) {
      Alert.alert('Không thể mở', 'Sinh trắc học chưa sẵn sàng hoặc bị hủy.');
    }
  };

  const handleQuickEscape = () => {
    lockVault();
    setSearchQuery('');
    setCurrentScreen('public-list');
  };

  const handleCreateVaultNote = async (note) => {
    await createVaultNote(activeVaultMode, note);
    await loadVaultData(activeVaultMode);
  };

  const handleDeleteVaultNote = async (id) => {
    await deleteVaultNote(activeVaultMode, id);
    await loadVaultData(activeVaultMode);
  };

  const handleSyncCloud = async () => {
    try {
      setIsSyncing(true);
      const res = await syncAllWithSupabase();
      if (res.success) {
        setLastSync(res.timestamp);
        await loadVaultData(activeVaultMode);
        await loadPublicNotes();
        if (res.isQuotaFull) {
          Alert.alert(
            'Dung lượng Cloud đã đầy (Storage Full)',
            'Các file trên máy vẫn an toàn và truy cập bình thường. Tuy nhiên một số file chưa thể sao lưu lên Cloud do đã chạm hạn mức. Bạn có muốn nâng cấp thêm dung lượng không?',
            [
              { text: 'Để sau', style: 'cancel' },
              { text: 'Nâng cấp gói Cloud', onPress: () => setCurrentScreen('subscription') },
            ]
          );
        } else {
          Alert.alert('Đồng bộ thành công', `Đã đồng bộ với Supabase Cloud lúc ${res.timestamp}`);
        }
      } else {
        Alert.alert('Đồng bộ thất bại', res.error || 'Vui lòng kiểm tra lại kết nối mạng.');
      }
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Photo handlers ---
  const handleImportPhoto = async () => {
    try {
      setImportingPhoto(true);
      setPickerActive(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Thiếu quyền', 'Cần quyền truy cập thư viện để import ảnh.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
      });

      if (result.canceled) return;

      const imported = await importPhotoToVault(result.assets[0]);
      await addPhotoItem(imported);
      await loadVaultData('real');
    } catch (error) {
      console.error('Import photo thất bại:', error);
      Alert.alert('Import thất bại', 'Không thể đưa ảnh vào photo vault.');
    } finally {
      setImportingPhoto(false);
      setPickerActive(false);
    }
  };

  const handleDeletePhoto = async (id) => {
    await deletePhotoItem(id);
    await loadVaultData(activeVaultMode);
  };

  // --- Video handlers ---
  const handleImportVideo = async () => {
    try {
      setImportingVideo(true);
      setPickerActive(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Thiếu quyền', 'Cần quyền truy cập thư viện để import video.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
      });

      if (result.canceled) return;

      const imported = await importVideoToVault(result.assets[0]);
      await addVideoItem(imported);
      await loadVaultData('real');
    } catch (error) {
      console.error('Import video thất bại:', error);
      Alert.alert('Import thất bại', 'Không thể đưa video vào kho.');
    } finally {
      setImportingVideo(false);
      setPickerActive(false);
    }
  };

  const handleDeleteVideo = async (id) => {
    await deleteVideoItem(id);
    await loadVaultData(activeVaultMode);
  };

  // --- Password handlers ---
  const handleSavePassword = async (item) => {
    await savePasswordItem(item);
    await loadVaultData(activeVaultMode);
  };

  const handleDeletePassword = async (id) => {
    await deletePasswordItem(id);
    await loadVaultData(activeVaultMode);
  };

  // --- Document handlers ---
  const handleImportDocument = async () => {
    try {
      setImportingDocument(true);
      setPickerActive(true);
      let DocumentPicker;
      try {
        DocumentPicker = require('expo-document-picker');
      } catch {
        Alert.alert('Lỗi', 'Thư viện chọn tài liệu chưa sẵn sàng.');
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets ? result.assets[0] : result;
      const imported = await importDocumentToVault(asset);
      await addDocumentItem(imported);
      await loadVaultData('real');
    } catch (error) {
      console.error('Import document thất bại:', error);
      Alert.alert('Import thất bại', 'Không thể đưa tài liệu vào kho.');
    } finally {
      setImportingDocument(false);
      setPickerActive(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    await deleteDocumentItem(id);
    await loadVaultData(activeVaultMode);
  };

  // --- Voice handlers ---
  const handleSaveVoice = async (uri, customName) => {
    try {
      const saved = await saveAudioToVault(uri, customName);
      await addVoiceItem(saved);
      await loadVaultData('real');
      Alert.alert('Đã lưu', 'Bản ghi âm đã được cất vào kho bí mật.');
    } catch (error) {
      console.error('Lưu ghi âm thất bại:', error);
      Alert.alert('Lỗi', 'Không thể lưu bản ghi âm.');
    }
  };

  const handleDeleteVoice = async (id) => {
    await deleteVoiceItem(id);
    await loadVaultData(activeVaultMode);
  };

  if (isInitializing || (currentUser && !subscriptionAccess)) {
    return <LoadingScreen />;
  }

  // --- Step 1: Check Supabase Authentication ---
  if (!currentUser) {
    if (authScreen === 'register') {
      return <RegisterScreen onNavigateToLogin={() => setAuthScreen('login')} />;
    }
    return <LoginScreen onNavigateToRegister={() => setAuthScreen('register')} />;
  }

  // --- Step 2: Check Setup Wizard (Preserves Stealth Disguise if Setup Completed) ---
  if (!isSetupComplete) {
    return (
      <SetupWizard
        biometricAvailable={biometricAvailable}
        onComplete={completeSetup}
        onSignOut={signOutUser}
      />
    );
  }

  // --- Public Disguise Shell ---
  if (!isUnlocked) {
    if (currentScreen === 'hidden-settings') {
      return (
        <>
          <StatusBar barStyle="light-content" />
          <HiddenSettingsScreen onBack={() => setCurrentScreen('public-list')} />
        </>
      );
    }

    if (currentScreen === 'public-detail') {
      return (
        <>
          <StatusBar barStyle="dark-content" />
          <NoteDetailScreen note={selectedNote} onBack={() => setCurrentScreen('public-list')} />
        </>
      );
    }

    if (disguiseType === 'calculator') {
      return (
        <CalculatorScreen
          onAttemptUnlock={attemptUnlock}
          biometricEnabled={biometricEnabled}
          onBiometricUnlock={handleBiometricUnlock}
          onOpenHiddenSettings={() => setCurrentScreen('hidden-settings')}
        />
      );
    }

    if (disguiseType === 'weather') {
      return (
        <WeatherScreen
          onAttemptUnlock={attemptUnlock}
          biometricEnabled={biometricEnabled}
          onBiometricUnlock={handleBiometricUnlock}
          onOpenHiddenSettings={() => setCurrentScreen('hidden-settings')}
        />
      );
    }

    if (disguiseType === 'calendar') {
      return (
        <CalendarScreen
          onAttemptUnlock={attemptUnlock}
          biometricEnabled={biometricEnabled}
          onBiometricUnlock={handleBiometricUnlock}
          onOpenHiddenSettings={() => setCurrentScreen('hidden-settings')}
        />
      );
    }

    return (
      <>
        <StatusBar barStyle="dark-content" />
        <NoteListScreen
          notes={visiblePublicNotes}
          loading={loadingPublicNotes}
          searchQuery={searchQuery}
          onChangeSearchQuery={handleSearchChange}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreatePublicNote}
          biometricEnabled={biometricEnabled}
          onBiometricUnlock={handleBiometricUnlock}
          onOpenHiddenSettings={() => setCurrentScreen('hidden-settings')}
        />
      </>
    );
  }

  // --- Freemium Model: Local Vault Storage is FREE forever, no paywall blocks entry! ---

  if (currentScreen === 'subscription') {
    return <SubscriptionScreen onBack={() => setCurrentScreen('account')} />;
  }

  // --- Vault Screens ---
  if (currentScreen === 'vault-notes') {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <VaultNotesScreen
          mode={activeVaultMode}
          notes={vaultNotes}
          onCreateNote={handleCreateVaultNote}
          onDeleteNote={handleDeleteVaultNote}
          onBack={() => setCurrentScreen('vault-home')}
          onQuickEscape={handleQuickEscape}
        />
      </>
    );
  }

  if (currentScreen === 'photo-vault') {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <PhotoVaultScreen
          photos={photoItems}
          loading={loadingVault}
          importing={importingPhoto}
          onImportPhoto={handleImportPhoto}
          onDeletePhoto={handleDeletePhoto}
          onBack={() => setCurrentScreen('vault-home')}
          onQuickEscape={handleQuickEscape}
        />
      </>
    );
  }

  if (currentScreen === 'vault-videos') {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <VideoVaultScreen
          videos={videoItems}
          loading={loadingVault}
          importing={importingVideo}
          onImportVideo={handleImportVideo}
          onDeleteVideo={handleDeleteVideo}
          onBack={() => setCurrentScreen('vault-home')}
          onQuickEscape={handleQuickEscape}
        />
      </>
    );
  }

  if (currentScreen === 'vault-passwords') {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <PasswordVaultScreen
          items={passwordItems}
          onSaveItem={handleSavePassword}
          onDeleteItem={handleDeletePassword}
          onBack={() => setCurrentScreen('vault-home')}
          onQuickEscape={handleQuickEscape}
        />
      </>
    );
  }

  if (currentScreen === 'vault-documents') {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <DocumentVaultScreen
          documents={documentItems}
          loading={loadingVault}
          importing={importingDocument}
          onImportDocument={handleImportDocument}
          onDeleteDocument={handleDeleteDocument}
          onBack={() => setCurrentScreen('vault-home')}
          onQuickEscape={handleQuickEscape}
        />
      </>
    );
  }

  if (currentScreen === 'vault-voices') {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <VoiceVaultScreen
          voices={voiceItems}
          loading={loadingVault}
          onSaveVoice={handleSaveVoice}
          onDeleteVoice={handleDeleteVoice}
          onBack={() => setCurrentScreen('vault-home')}
          onQuickEscape={handleQuickEscape}
        />
      </>
    );
  }

  if (currentScreen === 'hidden-settings') {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <HiddenSettingsScreen onBack={() => setCurrentScreen('account')} />
      </>
    );
  }

  if (currentScreen === 'account') {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <AccountScreen
          onBack={() => setCurrentScreen('vault-home')}
          onSyncNow={handleSyncCloud}
          onOpenSubscription={() => setCurrentScreen('subscription')}
          onOpenSecuritySettings={() => setCurrentScreen('hidden-settings')}
          isSyncing={isSyncing}
          lastSync={lastSync}
        />
      </>
    );
  }

  // Default Vault Home Dashboard
  return (
    <>
      <StatusBar barStyle="light-content" />
      <VaultDashboardScreen
        mode={activeVaultMode}
        summary={vaultSummary}
        currentUser={currentUser}
        disguiseType={disguiseType}
        onChangeDisguise={changeDisguiseType}
        onOpenNotes={() => setCurrentScreen('vault-notes')}
        onOpenPhotos={() => setCurrentScreen('photo-vault')}
        onOpenVideos={() => setCurrentScreen('vault-videos')}
        onOpenPasswords={() => setCurrentScreen('vault-passwords')}
        onOpenDocuments={() => setCurrentScreen('vault-documents')}
        onOpenVoices={() => setCurrentScreen('vault-voices')}
        onOpenAccount={() => setCurrentScreen('account')}
        onQuickEscape={handleQuickEscape}
        onSyncCloud={handleSyncCloud}
        isSyncing={isSyncing}
        lastSync={lastSync}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F7F7F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
