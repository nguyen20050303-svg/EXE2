import React from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const GUIDE_ITEMS = [
  {
    id: 'calculator',
    icon: '🧮',
    title: 'Máy tính bỏ túi (Calculator)',
    gesture: 'Nhấn & Giữ phím dấu "=" trong 1.2 giây',
    highlightColor: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    normalUse: 'Tính toán cộng, trừ, nhân, chia bình thường. Bấm dấu "=" chỉ thực hiện phép tính.',
    secretUnlock: 'Nhấn giữ phím "=" khoảng 1.2s -> Máy rung phản hồi -> Hộp thoại mã PIN bí mật xuất hiện.',
  },
  {
    id: 'notes',
    icon: '📝',
    title: 'Ghi chú (Notes)',
    gesture: 'Nhấn & Giữ dòng chữ "Notes" trên cùng trong 1.5 giây',
    highlightColor: '#EAB308',
    bgColor: 'rgba(234, 179, 8, 0.1)',
    normalUse: 'Xem, viết, lưu và tìm kiếm ghi chú công khai. Ô tìm kiếm hoạt động bình thường, tuyệt đối không lộ két.',
    secretUnlock: 'Nhấn giữ tiêu đề "Notes" màu vàng ở góc trên trong 1.5s -> Rung nhẹ -> Mở xác thực bí mật.',
  },
  {
    id: 'weather',
    icon: '⛅',
    title: 'Thời tiết (Weather)',
    gesture: 'Nhấn & Giữ thẻ nhiệt độ trung tâm (Hero Card) trong 1.5 giây',
    highlightColor: '#38BDF8',
    bgColor: 'rgba(56, 189, 248, 0.1)',
    normalUse: 'Dự báo thời tiết và tìm kiếm các thành phố trên thế giới. Ô tìm kiếm không kích hoạt két.',
    secretUnlock: 'Nhấn giữ thẻ nhiệt độ to ở giữa màn hình trong 1.5s -> Rung nhẹ -> Mở xác thực bí mật.',
  },
  {
    id: 'calendar',
    icon: '📅',
    title: 'Lịch biểu & Sự kiện (Calendar)',
    gesture: 'Nhấn & Giữ tiêu đề Tháng/Năm trong 1.5 giây',
    highlightColor: '#A855F7',
    bgColor: 'rgba(168, 85, 247, 0.1)',
    normalUse: 'Xem ngày tháng, quản lý lịch biểu và tìm sự kiện. Ô tìm kiếm chỉ tìm lịch trình.',
    secretUnlock: 'Nhấn giữ thanh tiêu đề Tháng & Năm trên đỉnh lịch trong 1.5s -> Rung nhẹ -> Mở xác thực bí mật.',
  },
];

export default function DisguiseGuideModal({ visible, onClose }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.badge}>HƯỚNG DẪN BẢO MẬT & NGỤY TRANG</Text>
                <Text style={styles.title}>Cách Mở Khóa Két Bí Mật</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Concept Banner */}
              <View style={styles.conceptCard}>
                <Text style={styles.conceptTitle}>🛡️ Cơ Chế Xác Thực Kín Đáo (Stealth Authentication)</Text>
                <Text style={styles.conceptText}>
                  Hidder áp dụng triết lý bảo mật không để lại dấu vết. Ứng dụng bên ngoài hoạt động 100% như app thật. 
                  Người lạ mượn máy hay gõ tìm kiếm sẽ không bao giờ phát hiện sự tồn tại của Két bí mật.
                </Text>
              </View>

              {/* 4 Shells Instructions */}
              <Text style={styles.sectionHeading}>1. CỬ CHỈ MỞ TRÊN TỪNG LỚP VỎ NGỤY TRANG</Text>
              {GUIDE_ITEMS.map((item) => (
                <View key={item.id} style={[styles.guideCard, { borderColor: item.highlightColor }]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardIcon}>{item.icon}</Text>
                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <View style={[styles.gesturePill, { backgroundColor: item.bgColor }]}>
                        <Text style={[styles.gesturePillText, { color: item.highlightColor }]}>
                          👉 {item.gesture}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.cardRow}>
                    <Text style={styles.rowLabel}>Thao tác bình thường:</Text>
                    <Text style={styles.rowContent}>{item.normalUse}</Text>
                  </View>

                  <View style={styles.cardRow}>
                    <Text style={[styles.rowLabel, { color: '#38BDF8' }]}>Thao tác mở Vault:</Text>
                    <Text style={[styles.rowContent, { color: '#F1F5F9' }]}>{item.secretUnlock}</Text>
                  </View>
                </View>
              ))}

              {/* Authentication Flow Routing */}
              <Text style={styles.sectionHeading}>2. QUY TRÌNH PHÂN NHÁNH XÁC THỰC</Text>
              <View style={styles.flowCard}>
                <View style={styles.flowStep}>
                  <View style={styles.stepNumberBadge}><Text style={styles.stepNumberText}>1</Text></View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Cử chỉ ẩn (Long-press Gesture)</Text>
                    <Text style={styles.stepDesc}>Thực hiện thao tác nhấn giữ trên vỏ bọc ngụy trang đang dùng. Máy sẽ rung nhẹ 1 nhịp phản hồi xúc giác.</Text>
                  </View>
                </View>

                <View style={styles.flowLine} />

                <View style={styles.flowStep}>
                  <View style={[styles.stepNumberBadge, { backgroundColor: '#38BDF8' }]}><Text style={styles.stepNumberText}>2</Text></View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Sinh trắc học (Vân tay / Face ID)</Text>
                    <Text style={styles.stepDesc}>Nếu bật sinh trắc học, máy sẽ tự động yêu cầu quét. Xác thực thành công sẽ đưa bạn thẳng vào Két Thật (Real Vault).</Text>
                  </View>
                </View>

                <View style={styles.flowLine} />

                <View style={styles.flowStep}>
                  <View style={[styles.stepNumberBadge, { backgroundColor: '#A855F7' }]}><Text style={styles.stepNumberText}>3</Text></View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Nhập mã PIN bí mật (Dự phòng)</Text>
                    <Text style={styles.stepDesc}>Hộp thoại bảo mật kín đáo hiện ra với 2 nhánh truy cập:</Text>
                    
                    <View style={styles.pinBranch}>
                      <View style={styles.pinBranchItem}>
                        <Text style={styles.pinBranchTitle}>🔑 Nhập Real PIN (Mã thật):</Text>
                        <Text style={styles.pinBranchDesc}>Mở Két Thật (Private Vault) với toàn bộ 6 kho dữ liệu cá nhân đã được mã hóa AES-256.</Text>
                      </View>
                      <View style={[styles.pinBranchItem, { marginTop: 8 }]}>
                        <Text style={[styles.pinBranchTitle, { color: '#F97316' }]}>🎭 Nhập Decoy PIN (Mã mồi):</Text>
                        <Text style={styles.pinBranchDesc}>Mở Két Giả (Decoy Vault) chỉ chứa các ghi chú mẫu an toàn để đánh lạc hướng khi bị cưỡng ép mở máy.</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Safety Rules */}
              <Text style={styles.sectionHeading}>3. QUY TẮC AN TOÀN QUAN TRỌNG</Text>
              <View style={styles.safetyCard}>
                <Text style={styles.safetyItem}>
                  🔒 <Text style={styles.safetyBold}>Không mở két từ ô tìm kiếm:</Text> Dãy số nhập trong ô tìm kiếm của Ghi chú, Thời tiết, Lịch sẽ không kích hoạt két để tránh người ngoài vô tình gõ trúng.
                </Text>
                <Text style={styles.safetyItem}>
                  ⚡ <Text style={styles.safetyBold}>Thoát nhanh (Quick Escape):</Text> Nút Quick Escape góc trên Vault hoặc bấm nút Home/đổi app sẽ lập tức khóa két và chuyển về vỏ ngụy trang.
                </Text>
                <Text style={styles.safetyItem}>
                  ⚙️ <Text style={styles.safetyBold}>Đổi vỏ ngụy trang bất cứ lúc nào:</Text> Bạn có thể chuyển đổi giữa 4 lớp vỏ (Máy tính, Ghi chú, Thời tiết, Lịch) ngay trong Dashboard của Két Thật.
                </Text>
              </View>

              <TouchableOpacity style={styles.gotItButton} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.gotItButtonText}>Tôi Đã Hiểu & Ghi Nhớ</Text>
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  badge: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  conceptCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
    marginBottom: 20,
  },
  conceptTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  conceptText: {
    color: '#94A3B8',
    fontSize: 12.5,
    lineHeight: 18,
  },
  sectionHeading: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  guideCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  gesturePill: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gesturePillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 10,
  },
  cardRow: {
    marginBottom: 6,
  },
  rowLabel: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  rowContent: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
  },
  flowCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
  },
  flowLine: {
    width: 2,
    height: 16,
    backgroundColor: '#334155',
    marginLeft: 11,
    marginVertical: 4,
  },
  pinBranch: {
    marginTop: 10,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pinBranchItem: {},
  pinBranchTitle: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  pinBranchDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
  },
  safetyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
  },
  safetyItem: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  safetyBold: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  gotItButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gotItButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
