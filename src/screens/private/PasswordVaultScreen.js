import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PasswordVaultScreen({
  items,
  onSaveItem,
  onDeleteItem,
  onBack,
  onQuickEscape,
}) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'card'
  const [modalVisible, setModalVisible] = useState(false);
  const [revealedIds, setRevealedIds] = useState({});

  // Form states
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  // Card specific
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const toggleReveal = (id) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text, label) => {
    // Nếu có expo-clipboard thì gọi, hoặc alert giả lập
    try {
      const Clipboard = require('expo-clipboard');
      Clipboard.setStringAsync(text);
      Alert.alert('Đã sao chép', `Đã chép ${label} vào bộ nhớ tạm.`);
    } catch {
      Alert.alert('Đã chọn', `${label}: ${text}`);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên tài khoản hoặc tên thẻ.');
      return;
    }

    if (activeTab === 'login') {
      await onSaveItem({
        type: 'login',
        title: title.trim(),
        username: username.trim(),
        password: password.trim(),
        notes: notes.trim(),
      });
    } else {
      await onSaveItem({
        type: 'card',
        title: title.trim(),
        cardNumber: cardNumber.trim(),
        cardHolder: cardHolder.trim(),
        expiry: expiry.trim(),
        cvv: cvv.trim(),
      });
    }

    // Reset
    setTitle('');
    setUsername('');
    setPassword('');
    setNotes('');
    setCardNumber('');
    setCardHolder('');
    setExpiry('');
    setCvv('');
    setModalVisible(false);
  };

  const filteredItems = items.filter((item) => (item.type || 'login') === activeTab);

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

      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Passwords & Cards</Text>
          <Text style={styles.subtitle}>Két lưu trữ tài khoản và thông tin thẻ bảo mật.</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'login' && styles.activeTab]}
          onPress={() => setActiveTab('login')}
        >
          <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>
            🔑 Tài khoản ({items.filter((i) => (i.type || 'login') === 'login').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'card' && styles.activeTab]}
          onPress={() => setActiveTab('card')}
        >
          <Text style={[styles.tabText, activeTab === 'card' && styles.activeTabText]}>
            💳 Thẻ ngân hàng ({items.filter((i) => i.type === 'card').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {activeTab === 'login' ? 'Chưa có tài khoản nào' : 'Chưa có thẻ nào'}
            </Text>
            <Text style={styles.emptySubtitle}>Bấm dấu ＋ ở góc trên để thêm mới an toàn.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isRevealed = Boolean(revealedIds[item.id]);

          if (item.type === 'card') {
            return (
              <View style={styles.cardItem}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <TouchableOpacity onPress={() => onDeleteItem(item.id)}>
                    <Text style={styles.deleteText}>Xóa</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Số thẻ:</Text>
                  <Text style={styles.fieldValue}>
                    {isRevealed
                      ? item.cardNumber
                      : `•••• •••• •••• ${item.cardNumber ? item.cardNumber.slice(-4) : '••••'}`}
                  </Text>
                  <View style={styles.actionIcons}>
                    <TouchableOpacity onPress={() => toggleReveal(item.id)}>
                      <Text style={styles.iconBtn}>{isRevealed ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleCopy(item.cardNumber, 'Số thẻ')}>
                      <Text style={styles.iconBtn}>📋</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.cardSubRow}>
                  <View>
                    <Text style={styles.fieldLabel}>Chủ thẻ</Text>
                    <Text style={styles.fieldSubValue}>{item.cardHolder || '---'}</Text>
                  </View>
                  <View>
                    <Text style={styles.fieldLabel}>Hết hạn</Text>
                    <Text style={styles.fieldSubValue}>{item.expiry || '---'}</Text>
                  </View>
                  <View>
                    <Text style={styles.fieldLabel}>CVV</Text>
                    <Text style={styles.fieldSubValue}>{isRevealed ? item.cvv : '•••'}</Text>
                  </View>
                </View>
              </View>
            );
          }

          // Login type
          return (
            <View style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <TouchableOpacity onPress={() => onDeleteItem(item.id)}>
                  <Text style={styles.deleteText}>Xóa</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Tên ĐN:</Text>
                <Text style={styles.fieldValue} numberOfLines={1}>
                  {item.username || '---'}
                </Text>
                {item.username ? (
                  <TouchableOpacity onPress={() => handleCopy(item.username, 'Tên đăng nhập')}>
                    <Text style={styles.iconBtn}>📋</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Mật khẩu:</Text>
                <Text style={styles.fieldValue}>
                  {isRevealed ? item.password : '••••••••••••'}
                </Text>
                <View style={styles.actionIcons}>
                  <TouchableOpacity onPress={() => toggleReveal(item.id)}>
                    <Text style={styles.iconBtn}>{isRevealed ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleCopy(item.password, 'Mật khẩu')}>
                    <Text style={styles.iconBtn}>📋</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {item.notes ? (
                <Text style={styles.itemNotes} numberOfLines={2}>
                  📝 {item.notes}
                </Text>
              ) : null}
            </View>
          );
        }}
      />

      {/* Modal Add Item */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeTab === 'login' ? 'Thêm Tài khoản' : 'Thêm Thẻ ngân hàng'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseText}>Đóng</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeTab === 'login' ? (
                <>
                  <Text style={styles.inputLabel}>Tên dịch vụ / Ứng dụng *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="VD: Facebook, Google, MBBank..."
                    placeholderTextColor="#64748B"
                    value={title}
                    onChangeText={setTitle}
                  />

                  <Text style={styles.inputLabel}>Tên đăng nhập / Email</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Email hoặc số điện thoại"
                    placeholderTextColor="#64748B"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />

                  <Text style={styles.inputLabel}>Mật khẩu</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Mật khẩu"
                    placeholderTextColor="#64748B"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />

                  <Text style={styles.inputLabel}>Ghi chú thêm</Text>
                  <TextInput
                    style={[styles.modalInput, styles.textArea]}
                    placeholder="Mã PIN, câu hỏi bảo mật..."
                    placeholderTextColor="#64748B"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                  />
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Tên thẻ / Ngân hàng *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="VD: Vietcombank Visa, Techcombank..."
                    placeholderTextColor="#64748B"
                    value={title}
                    onChangeText={setTitle}
                  />

                  <Text style={styles.inputLabel}>Số thẻ</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="16 chữ số"
                    placeholderTextColor="#64748B"
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    keyboardType="numeric"
                  />

                  <Text style={styles.inputLabel}>Tên chủ thẻ</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="NGUYEN VAN A"
                    placeholderTextColor="#64748B"
                    value={cardHolder}
                    onChangeText={setCardHolder}
                    autoCapitalize="characters"
                  />

                  <View style={styles.modalRow}>
                    <View style={styles.modalCol}>
                      <Text style={styles.inputLabel}>Hết hạn (MM/YY)</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="12/28"
                        placeholderTextColor="#64748B"
                        value={expiry}
                        onChangeText={setExpiry}
                      />
                    </View>
                    <View style={styles.modalCol}>
                      <Text style={styles.inputLabel}>CVV / CVC</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="•••"
                        placeholderTextColor="#64748B"
                        value={cvv}
                        onChangeText={setCvv}
                        keyboardType="numeric"
                        secureTextEntry
                      />
                    </View>
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSave}>
                <Text style={styles.modalSaveText}>Lưu vào Két</Text>
              </TouchableOpacity>
            </ScrollView>
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#111C34',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#1E293B',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#38BDF8',
  },
  listContent: {
    paddingBottom: 40,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  itemCard: {
    backgroundColor: '#111C34',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  deleteText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '500',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 13,
    width: 76,
  },
  fieldValue: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    fontSize: 16,
  },
  itemNotes: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
    paddingTop: 6,
  },
  cardItem: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
    paddingTop: 10,
  },
  fieldSubValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseText: {
    color: '#94A3B8',
    fontSize: 15,
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#111C34',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCol: {
    flex: 1,
  },
  modalSaveBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  modalSaveText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
});
