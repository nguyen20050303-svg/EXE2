import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const INITIAL_EVENTS = [
  {
    id: 'ev-1',
    dayOffset: 0,
    time: '09:00 - 10:00',
    title: 'Họp giao ban đầu tuần',
    category: 'Công việc',
    color: '#2563EB',
    location: 'Phòng họp 3B / Zoom',
  },
  {
    id: 'ev-2',
    dayOffset: 0,
    time: '12:30 - 13:30',
    title: 'Ăn trưa đối tác khách hàng',
    category: 'Gặp gỡ',
    color: '#059669',
    location: 'Nhà hàng San Hô',
  },
  {
    id: 'ev-3',
    dayOffset: 0,
    time: '16:00 - 17:00',
    title: 'Kiểm tra báo cáo tài chính tháng',
    category: 'Công việc',
    color: '#2563EB',
    location: 'Bàn làm việc',
  },
  {
    id: 'ev-4',
    dayOffset: 1,
    time: '08:30 - 11:30',
    title: 'Hội thảo công nghệ AI & Di động',
    category: 'Học tập',
    color: '#7C3AED',
    location: 'Trung tâm Hội nghị Quốc gia',
  },
  {
    id: 'ev-5',
    dayOffset: 2,
    time: '19:00 - 20:30',
    title: 'Tập thể dục & Chạy bộ công viên',
    category: 'Sức khỏe',
    color: '#D97706',
    location: 'Công viên Thống Nhất',
  },
  {
    id: 'ev-6',
    dayOffset: -1,
    time: '14:00 - 15:30',
    title: 'Bàn giao tài liệu hợp đồng',
    category: 'Công việc',
    color: '#2563EB',
    location: 'Văn phòng Công ty',
  },
];

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function CalendarScreen({
  onAttemptUnlock,
  biometricEnabled,
  onBiometricUnlock,
  onHiddenGesture,
  onOpenHiddenSettings,
}) {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [events, setEvents] = useState(INITIAL_EVENTS);

  // Modal thêm sự kiện
  const [modalVisible, setModalVisible] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('09:00 - 10:00');
  const [newEventCategory, setNewEventCategory] = useState('Công việc');
  const [newEventLocation, setNewEventLocation] = useState('');

  // Tính ma trận ngày trong tháng
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const daysCount = lastDayOfMonth.getDate();
    // Chuyển Chủ nhật (0) thành thứ 7 trong tuần Việt Nam (T2=0, ..., CN=6)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const days = [];
    // Khoảng trống đầu tháng
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, key: `empty-${i}` });
    }
    // Các ngày trong tháng
    for (let d = 1; d <= daysCount; d++) {
      days.push({ day: d, key: `day-${d}` });
    }
    return days;
  }, [currentYear, currentMonth]);

  const monthLabel = useMemo(() => {
    return `Tháng ${currentMonth + 1}, ${currentYear}`;
  }, [currentMonth, currentYear]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDay(1);
  };

  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    const trimmed = text.trim().toLowerCase();

    // 1. Vào Cài đặt ẩn qua mã lệnh
    if (trimmed === '//settings' || trimmed === '*#settings') {
      setSearchQuery('');
      setShowSearch(false);
      if (onOpenHiddenSettings) {
        onOpenHiddenSettings();
      }
      return;
    }
  };

  const handleSearchSubmit = async () => {
    const trimmed = searchQuery.trim();
    if (trimmed.toLowerCase() === '//settings' || trimmed.toLowerCase() === '*#settings') {
      setSearchQuery('');
      setShowSearch(false);
      if (onOpenHiddenSettings) {
        onOpenHiddenSettings();
      }
      return;
    }

    // Chỉ kiểm tra mở két khi người dùng chủ động nhấn Search/Enter
    if (onAttemptUnlock && trimmed.length >= 4) {
      const mode = await onAttemptUnlock(trimmed);
      if (mode !== 'none') {
        setSearchQuery('');
        setShowSearch(false);
        return;
      }
    }
  };

  // Sự kiện của ngày được chọn
  const dayEvents = useMemo(() => {
    const isThisMonth =
      currentMonth === today.getMonth() && currentYear === today.getFullYear();
    const diffDays = isThisMonth ? selectedDay - today.getDate() : 999;

    let list = events.filter((ev) => ev.dayOffset === diffDays);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (ev) =>
          ev.title.toLowerCase().includes(q) ||
          ev.category.toLowerCase().includes(q) ||
          ev.location.toLowerCase().includes(q)
      );
    }
    return list;
  }, [events, selectedDay, currentMonth, currentYear, today, searchQuery]);

  const handleAddEvent = () => {
    if (!newEventTitle.trim()) return;

    const isThisMonth =
      currentMonth === today.getMonth() && currentYear === today.getFullYear();
    const diffDays = isThisMonth ? selectedDay - today.getDate() : 0;

    const item = {
      id: `ev-${Date.now()}`,
      dayOffset: diffDays,
      time: newEventTime.trim() || 'Cả ngày',
      title: newEventTitle.trim(),
      category: newEventCategory,
      color:
        newEventCategory === 'Công việc'
          ? '#2563EB'
          : newEventCategory === 'Sức khỏe'
          ? '#D97706'
          : '#059669',
      location: newEventLocation.trim() || 'Chưa ghi địa điểm',
    };

    setEvents((prev) => [item, ...prev]);
    setNewEventTitle('');
    setNewEventLocation('');
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onHiddenGesture || onBiometricUnlock}
          onLongPress={onOpenHiddenSettings}
          delayLongPress={2000}
        >
          <Text style={styles.headerTitle}>{monthLabel}</Text>
          <Text style={styles.headerSubtitle}>Lịch biểu cá nhân & Sự kiện</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.todayBtn} onPress={handleToday}>
            <Text style={styles.todayBtnText}>Hôm nay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowSearch(!showSearch)}
            activeOpacity={0.7}
          >
            <Text style={styles.iconBtnText}>⌕</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, styles.addBtn]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addBtnText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      {showSearch ? (
        <View style={styles.searchShell}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm sự kiện hoặc ghi chú..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={/^\d{4,}$/.test(searchQuery)}
            autoFocus
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Month Navigator Controls */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navArrowBtn} onPress={handlePrevMonth}>
          <Text style={styles.navArrowText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.navMonthInfo}>
          Ngày {selectedDay} {monthLabel}
        </Text>

        <TouchableOpacity style={styles.navArrowBtn} onPress={handleNextMonth}>
          <Text style={styles.navArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Week Header */}
      <View style={styles.weekHeader}>
        {DAYS_OF_WEEK.map((d, i) => (
          <Text
            key={i}
            style={[
              styles.weekDayText,
              (i === 5 || i === 6) && styles.weekendText,
            ]}
          >
            {d}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.gridContainer}>
        {calendarDays.map((item) => {
          if (!item.day) {
            return <View key={item.key} style={styles.emptyDayCell} />;
          }

          const isSelected = item.day === selectedDay;
          const isCurrentToday =
            item.day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear();

          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isCurrentToday && !isSelected && styles.dayCellToday,
              ]}
              onPress={() => setSelectedDay(item.day)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  isCurrentToday && !isSelected && styles.dayNumberToday,
                ]}
              >
                {item.day}
              </Text>
              {/* Event indicator dot */}
              {item.day % 2 === 0 || item.day === selectedDay ? (
                <View
                  style={[
                    styles.eventDot,
                    isSelected && { backgroundColor: '#FFFFFF' },
                  ]}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Events Section for Selected Day */}
      <View style={styles.eventsHeaderRow}>
        <Text style={styles.eventsHeaderTitle}>
          SỰ KIỆN & LỊCH TRÌNH ({dayEvents.length})
        </Text>
        <Text style={styles.eventsHeaderDate}>
          {selectedDay}/{currentMonth + 1}/{currentYear}
        </Text>
      </View>

      <FlatList
        data={dayEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.eventsListContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyEventsBox}>
            <Text style={styles.emptyEventsIcon}>☕</Text>
            <Text style={styles.emptyEventsText}>
              Không có sự kiện nào cho ngày này
            </Text>
            <TouchableOpacity
              style={styles.addEventInlineBtn}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addEventInlineText}>＋ Thêm lịch trình mới</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.eventCard, { borderLeftColor: item.color }]}>
            <View style={styles.eventCardHeader}>
              <Text style={styles.eventTime}>{item.time}</Text>
              <View
                style={[
                  styles.eventCategoryBadge,
                  { backgroundColor: `${item.color}15` },
                ]}
              >
                <Text
                  style={[styles.eventCategoryText, { color: item.color }]}
                >
                  {item.category}
                </Text>
              </View>
            </View>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.eventLocation}>📍 {item.location}</Text>
          </View>
        )}
      />

      {/* Add Event Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tạo sự kiện mới</Text>
            <Text style={styles.modalSubtitle}>
              Ngày {selectedDay}/{currentMonth + 1}/{currentYear}
            </Text>

            <Text style={styles.inputLabel}>Tên sự kiện *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ví dụ: Họp nhóm dự án"
              placeholderTextColor="#9CA3AF"
              value={newEventTitle}
              onChangeText={setNewEventTitle}
            />

            <Text style={styles.inputLabel}>Khung giờ</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="09:00 - 10:30"
              placeholderTextColor="#9CA3AF"
              value={newEventTime}
              onChangeText={setNewEventTime}
            />

            <Text style={styles.inputLabel}>Địa điểm</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Phòng họp / Địa chỉ"
              placeholderTextColor="#9CA3AF"
              value={newEventLocation}
              onChangeText={setNewEventLocation}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleAddEvent}
              >
                <Text style={styles.modalSaveText}>Lưu sự kiện</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '600',
  },
  addBtn: {
    backgroundColor: '#2563EB',
  },
  addBtnText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    fontSize: 16,
    color: '#94A3B8',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navArrowText: {
    fontSize: 20,
    color: '#334155',
    lineHeight: 22,
  },
  navMonthInfo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  weekendText: {
    color: '#EF4444',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  emptyDayCell: {
    width: '14.28%',
    height: 42,
  },
  dayCell: {
    width: '14.28%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  dayCellSelected: {
    backgroundColor: '#2563EB',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  dayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayNumberToday: {
    color: '#2563EB',
    fontWeight: '700',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2563EB',
    marginTop: 2,
  },
  eventsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  eventsHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  eventsHeaderDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  eventsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 10,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  eventCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  eventCategoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyEventsBox: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyEventsIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyEventsText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  addEventInlineBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addEventInlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
