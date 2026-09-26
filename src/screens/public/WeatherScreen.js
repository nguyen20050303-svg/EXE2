import React, { useState } from 'react';
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

const CITIES_DATA = [
  {
    name: 'Hà Nội',
    country: 'Việt Nam',
    temp: 29,
    condition: 'Nhiều mây',
    icon: '⛅',
    high: 33,
    low: 24,
    humidity: 78,
    wind: '14 km/h',
    uv: '6 (Cao)',
    airQuality: 'Tốt (AQI 42)',
    hourly: [
      { time: 'Bây giờ', temp: 29, icon: '⛅' },
      { time: '11:00', temp: 30, icon: '⛅' },
      { time: '12:00', temp: 32, icon: '☀️' },
      { time: '13:00', temp: 33, icon: '☀️' },
      { time: '14:00', temp: 32, icon: '⛅' },
      { time: '15:00', temp: 30, icon: '🌧️' },
      { time: '16:00', temp: 28, icon: '🌧️' },
      { time: '17:00', temp: 27, icon: '⛅' },
      { time: '18:00', temp: 26, icon: '🌙' },
    ],
    daily: [
      { day: 'Hôm nay', icon: '⛅', low: 24, high: 33, text: 'Nhiều mây' },
      { day: 'Thứ Sáu', icon: '☀️', low: 25, high: 34, text: 'Nắng đẹp' },
      { day: 'Thứ Bảy', icon: '🌧️', low: 23, high: 29, text: 'Mưa rào rải rác' },
      { day: 'Chủ Nhật', icon: '⛅', low: 24, high: 31, text: 'Mây thay đổi' },
      { day: 'Thứ Hai', icon: '☀️', low: 25, high: 34, text: 'Trời nắng gắt' },
      { day: 'Thứ Ba', icon: '⛅', low: 24, high: 32, text: 'Có mây' },
      { day: 'Thứ Tư', icon: '🌧️', low: 23, high: 30, text: 'Mưa dông' },
    ],
  },
  {
    name: 'TP. Hồ Chí Minh',
    country: 'Việt Nam',
    temp: 32,
    condition: 'Nắng nóng',
    icon: '☀️',
    high: 35,
    low: 26,
    humidity: 70,
    wind: '18 km/h',
    uv: '9 (Rất cao)',
    airQuality: 'Trung bình (AQI 68)',
    hourly: [
      { time: 'Bây giờ', temp: 32, icon: '☀️' },
      { time: '11:00', temp: 33, icon: '☀️' },
      { time: '12:00', temp: 34, icon: '☀️' },
      { time: '13:00', temp: 35, icon: '☀️' },
      { time: '14:00', temp: 34, icon: '⛅' },
      { time: '15:00', temp: 32, icon: '🌦️' },
      { time: '16:00', temp: 30, icon: '🌧️' },
      { time: '17:00', temp: 29, icon: '⛅' },
      { time: '18:00', temp: 28, icon: '🌙' },
    ],
    daily: [
      { day: 'Hôm nay', icon: '☀️', low: 26, high: 35, text: 'Nắng chói chang' },
      { day: 'Thứ Sáu', icon: '🌦️', low: 26, high: 34, text: 'Mưa rào chiều tối' },
      { day: 'Thứ Bảy', icon: '🌧️', low: 25, high: 32, text: 'Mưa dông nhiệt' },
      { day: 'Chủ Nhật', icon: '☀️', low: 26, high: 34, text: 'Nắng ráo' },
      { day: 'Thứ Hai', icon: '☀️', low: 26, high: 35, text: 'Nắng nóng' },
      { day: 'Thứ Ba', icon: '🌦️', low: 25, high: 33, text: 'Mưa rải rác' },
      { day: 'Thứ Tư', icon: '⛅', low: 26, high: 33, text: 'Mây từng đợt' },
    ],
  },
  {
    name: 'Đà Nẵng',
    country: 'Việt Nam',
    temp: 30,
    condition: 'Gió biển nhẹ',
    icon: '🌤️',
    high: 32,
    low: 25,
    humidity: 74,
    wind: '22 km/h',
    uv: '7 (Cao)',
    airQuality: 'Rất tốt (AQI 28)',
    hourly: [
      { time: 'Bây giờ', temp: 30, icon: '🌤️' },
      { time: '11:00', temp: 31, icon: '🌤️' },
      { time: '12:00', temp: 32, icon: '☀️' },
      { time: '13:00', temp: 32, icon: '☀️' },
      { time: '14:00', temp: 31, icon: '🌤️' },
      { time: '15:00', temp: 30, icon: '🌤️' },
      { time: '16:00', temp: 29, icon: '⛅' },
      { time: '17:00', temp: 28, icon: '⛅' },
      { time: '18:00', temp: 27, icon: '🌙' },
    ],
    daily: [
      { day: 'Hôm nay', icon: '🌤️', low: 25, high: 32, text: 'Gió biển mát' },
      { day: 'Thứ Sáu', icon: '☀️', low: 26, high: 33, text: 'Trời trong lành' },
      { day: 'Thứ Bảy', icon: '🌤️', low: 25, high: 32, text: 'Nắng nhẹ' },
      { day: 'Chủ Nhật', icon: '⛅', low: 25, high: 31, text: 'Mây thoáng đãng' },
      { day: 'Thứ Hai', icon: '☀️', low: 26, high: 33, text: 'Nắng ráo' },
      { day: 'Thứ Ba', icon: '🌧️', low: 24, high: 30, text: 'Có mưa rào' },
      { day: 'Thứ Tư', icon: '🌤️', low: 25, high: 31, text: 'Nắng dịu' },
    ],
  },
];

export default function WeatherScreen({
  onAttemptUnlock,
  biometricEnabled,
  onBiometricUnlock,
  onOpenHiddenSettings,
}) {
  const [selectedCityIndex, setSelectedCityIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const currentCity = CITIES_DATA[selectedCityIndex];

  const handleSearchChange = (text) => {
    setSearchQuery(text);

    const trimmed = text.trim().toLowerCase();
    // 1. Kích hoạt vào cài đặt ẩn qua mã lệnh
    if (trimmed === '//settings' || trimmed === '*#settings') {
      setSearchQuery('');
      setSearchOpen(false);
      if (onOpenHiddenSettings) {
        onOpenHiddenSettings();
      }
      return;
    }

    // 2. Tìm tên thành phố thực tế theo thời gian thực (KHÔNG kích hoạt mở két khi đang gõ)
    const matchIndex = CITIES_DATA.findIndex((c) =>
      c.name.toLowerCase().includes(trimmed)
    );
    if (matchIndex !== -1 && trimmed.length >= 2) {
      setSelectedCityIndex(matchIndex);
    }
  };

  const handleSearchSubmit = async () => {
    const trimmed = searchQuery.trim();
    if (trimmed.toLowerCase() === '//settings' || trimmed.toLowerCase() === '*#settings') {
      setSearchQuery('');
      setSearchOpen(false);
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
        setSearchOpen(false);
        return;
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={onOpenHiddenSettings}
          delayLongPress={1500}
          style={styles.locationContainer}
        >
          <Text style={styles.locationIcon}>📍</Text>
          <View>
            <Text style={styles.cityName}>{currentCity.name}</Text>
            <Text style={styles.countryName}>{currentCity.country}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => setSearchOpen(!searchOpen)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIconText}>⌕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Discreet Search Input */}
      {searchOpen ? (
        <View style={styles.searchShell}>
          <Text style={styles.searchPromptIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm thành phố hoặc mã vùng..."
            placeholderTextColor="#8892B0"
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Temperature & Condition Card */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={biometricEnabled ? onBiometricUnlock : undefined}
          onLongPress={onOpenHiddenSettings}
          delayLongPress={2000}
          style={styles.heroCard}
        >
          <Text style={styles.weatherHeroIcon}>{currentCity.icon}</Text>
          <Text style={styles.currentTemp}>{currentCity.temp}°</Text>
          <Text style={styles.conditionText}>{currentCity.condition}</Text>
          <Text style={styles.tempRangeText}>
            Cao: {currentCity.high}°  •  Thấp: {currentCity.low}°
          </Text>

          <View style={styles.airQualityBadge}>
            <Text style={styles.airQualityText}>🍃 {currentCity.airQuality}</Text>
          </View>
        </TouchableOpacity>

        {/* Hourly Forecast Carousel */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>DỰ BÁO THEO GIỜ</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hourlyList}
          >
            {currentCity.hourly.map((item, idx) => (
              <View key={idx} style={styles.hourlyItem}>
                <Text style={styles.hourlyTime}>{item.time}</Text>
                <Text style={styles.hourlyIcon}>{item.icon}</Text>
                <Text style={styles.hourlyTemp}>{item.temp}°</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 7-Day Forecast */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>DỰ BÁO 7 NGÀY TỚI</Text>
          <View style={styles.forecastListCard}>
            {currentCity.daily.map((dayItem, idx) => (
              <View
                key={idx}
                style={[
                  styles.dailyRow,
                  idx === currentCity.daily.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={styles.dailyDay}>{dayItem.day}</Text>
                <Text style={styles.dailyIcon}>{dayItem.icon}</Text>
                <Text style={styles.dailyDesc}>{dayItem.text}</Text>
                <View style={styles.dailyTempRange}>
                  <Text style={styles.dailyLow}>{dayItem.low}°</Text>
                  <View style={styles.tempBarTrack}>
                    <View style={styles.tempBarFill} />
                  </View>
                  <Text style={styles.dailyHigh}>{dayItem.high}°</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Weather Details Grid */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>CHI TIẾT THỜI TIẾT</Text>
          <View style={styles.gridRow}>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>ĐỘ ẨM</Text>
              <Text style={styles.detailValue}>{currentCity.humidity}%</Text>
              <Text style={styles.detailNote}>Điểm sương 22°C</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>TỐC ĐỘ GIÓ</Text>
              <Text style={styles.detailValue}>{currentCity.wind}</Text>
              <Text style={styles.detailNote}>Gió nhẹ hướng Nam</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>CHỈ SỐ UV</Text>
              <Text style={styles.detailValue}>{currentCity.uv}</Text>
              <Text style={styles.detailNote}>Nên đeo kính râm</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>ÁP SUẤT</Text>
              <Text style={styles.detailValue}>1,012 hPa</Text>
              <Text style={styles.detailNote}>Áp suất ổn định</Text>
            </View>
          </View>
        </View>

        {/* Footer note */}
        <Text style={styles.footerNote}>
          Dữ liệu thời tiết cập nhật lúc 09:30 AM • Trạm khí tượng thủy văn
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationIcon: {
    fontSize: 22,
  },
  cityName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  countryName: {
    fontSize: 12,
    color: '#8892B0',
    marginTop: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C2541',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A506B',
  },
  actionIconText: {
    fontSize: 18,
    color: '#E0E7FF',
    fontWeight: '600',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2541',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#3A506B',
  },
  searchPromptIcon: {
    fontSize: 16,
    color: '#8892B0',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 14,
    color: '#8892B0',
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  weatherHeroIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  currentTemp: {
    fontSize: 72,
    fontWeight: '200',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  conditionText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#E0E7FF',
    marginTop: 4,
  },
  tempRangeText: {
    fontSize: 14,
    color: '#8892B0',
    marginTop: 6,
    fontWeight: '500',
  },
  airQualityBadge: {
    backgroundColor: 'rgba(72, 202, 228, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(72, 202, 228, 0.3)',
  },
  airQualityText: {
    color: '#48CAE4',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionContainer: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8892B0',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  hourlyList: {
    paddingRight: 16,
    gap: 10,
  },
  hourlyItem: {
    backgroundColor: '#1C2541',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 1,
    borderColor: 'rgba(58, 80, 107, 0.6)',
  },
  hourlyTime: {
    fontSize: 12,
    color: '#8892B0',
    fontWeight: '500',
    marginBottom: 8,
  },
  hourlyIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  hourlyTemp: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  forecastListCard: {
    backgroundColor: '#1C2541',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(58, 80, 107, 0.6)',
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(58, 80, 107, 0.4)',
  },
  dailyDay: {
    width: 80,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dailyIcon: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
  },
  dailyDesc: {
    flex: 1,
    fontSize: 12,
    color: '#8892B0',
    marginLeft: 8,
  },
  dailyTempRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyLow: {
    fontSize: 14,
    color: '#8892B0',
    fontWeight: '500',
    width: 28,
    textAlign: 'right',
  },
  tempBarTrack: {
    width: 50,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  tempBarFill: {
    width: '60%',
    height: '100%',
    backgroundColor: '#48CAE4',
    borderRadius: 2,
    alignSelf: 'center',
  },
  dailyHigh: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    width: 28,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#1C2541',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(58, 80, 107, 0.6)',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8892B0',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  detailNote: {
    fontSize: 12,
    color: '#48CAE4',
    fontWeight: '500',
  },
  footerNote: {
    textAlign: 'center',
    color: '#55657E',
    fontSize: 11,
    marginTop: 24,
  },
});
