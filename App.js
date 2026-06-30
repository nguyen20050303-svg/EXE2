import React, { useContext, useEffect, useState } from 'react';
import { Alert, StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext, AuthProvider } from './src/context/AuthContext';
import SetupWizard from './src/components/SetupWizard';
import NoteListScreen from './src/screens/public/NoteListScreen';
import NoteDetailScreen from './src/screens/public/NoteDetailScreen';
import VaultDashboardScreen from './src/screens/private/VaultDashboardScreen';
import PhotoVaultScreen from './src/screens/private/PhotoVaultScreen';
import VaultNotesScreen from './src/screens/private/VaultNotesScreen';
import {
  addPhotoItem,
  createPublicNote,
  createVaultNote,
  getPhotoItems,
  getPublicNotes,
  getVaultNotes,
  getVaultSummary,
  searchPublicNotes,
} from './src/services/database';
import { importPhotoToVault } from './src/services/fileSystem';

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
    isInitializing,
    isSetupComplete,
    isUnlocked,
    lockVault,
    biometricAvailable,
  } = useContext(AuthContext);

  const [currentScreen, setCurrentScreen] = useState('public-list');
  const [selectedNote, setSelectedNote] = useState(null);
  const [publicNotes, setPublicNotes] = useState([]);
  const [visiblePublicNotes, setVisiblePublicNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPublicNotes, setLoadingPublicNotes] = useState(true);
  const [vaultSummary, setVaultSummary] = useState({ noteCount: 0, photoCount: 0, recentNotes: [] });
  const [vaultNotes, setVaultNotes] = useState([]);
  const [photoItems, setPhotoItems] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [importingPhoto, setImportingPhoto] = useState(false);

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
    const [summary, notes, photos] = await Promise.all([
      getVaultSummary(mode),
      getVaultNotes(mode),
      mode === 'real' ? getPhotoItems() : Promise.resolve([]),
    ]);

    setVaultSummary(summary);
    setVaultNotes(notes);
    setPhotoItems(photos);
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

  const handleImportPhoto = async () => {
    try {
      setImportingPhoto(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Thiếu quyền', 'Cần quyền truy cập thư viện để import ảnh.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
      });

      if (result.canceled) {
        return;
      }

      const imported = await importPhotoToVault(result.assets[0]);
      await addPhotoItem(imported);
      await loadVaultData('real');
    } catch (error) {
      console.error('Import photo thất bại:', error);
      Alert.alert('Import thất bại', 'Không thể đưa ảnh vào photo vault.');
    } finally {
      setImportingPhoto(false);
    }
  };

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (!isSetupComplete) {
    return <SetupWizard biometricAvailable={biometricAvailable} onComplete={completeSetup} />;
  }

  if (!isUnlocked) {
    return currentScreen === 'public-detail' ? (
      <>
        <StatusBar barStyle="dark-content" />
        <NoteDetailScreen note={selectedNote} onBack={() => setCurrentScreen('public-list')} />
      </>
    ) : (
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
        />
      </>
    );
  }

  if (currentScreen === 'vault-notes') {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <VaultNotesScreen
          mode={activeVaultMode}
          notes={vaultNotes}
          onCreateNote={handleCreateVaultNote}
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
          loading={loadingPhotos}
          importing={importingPhoto}
          onImportPhoto={handleImportPhoto}
          onBack={() => setCurrentScreen('vault-home')}
          onQuickEscape={handleQuickEscape}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <VaultDashboardScreen
        mode={activeVaultMode}
        summary={vaultSummary}
        onOpenNotes={() => setCurrentScreen('vault-notes')}
        onOpenPhotos={() => setCurrentScreen('photo-vault')}
        onQuickEscape={handleQuickEscape}
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
