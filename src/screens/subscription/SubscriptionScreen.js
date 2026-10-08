import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Clipboard from "expo-clipboard";
import { AuthContext } from "../../context/AuthContext";
import {
  BANK_CONFIG,
  STORAGE_PLANS,
  getVietQRUrl,
  getLatestManualPayment,
  requestSubscriptionPurchase,
  restorePurchases,
  submitManualPayment,
  createPayosPayment,
  SUBSCRIPTION_STATUS,
} from "../../services/subscriptionService";
import {
  logConfirmTransfer,
  logOpenVietQRPayment,
  logSelectPlan,
  logViewPricing,
} from "../../services/analytics";
import { getUserStorageUsage } from "../../services/cloudStorage";
import { confirmAction, formatBytes } from "../../utils/helpers";

export default function SubscriptionScreen({ onBack = null }) {
  const {
    currentUser,
    subscription,
    subscriptionAccess,
    refreshSubscription,
    signOutUser,
  } = useContext(AuthContext);

  const [selectedPlanId, setSelectedPlanId] = useState("STANDARD_1_5GB");
  const [loadingAction, setLoadingAction] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [payosUrl, setPayosUrl] = useState(null);
  const [payosModalVisible, setPayosModalVisible] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("NONE");
  const [storageUsage, setStorageUsage] = useState({
    storage_used: 0,
    storage_limit: 268435456,
    remaining_bytes: 268435456,
    percentage: 0,
    is_full: false,
    is_over_quota: false,
  });

  const paidPlans = STORAGE_PLANS.filter((p) => !p.isFree);
  const selectedPlan =
    paidPlans.find((p) => p.id === selectedPlanId) ||
    paidPlans[1] ||
    STORAGE_PLANS[2];

  // Tải dung lượng Cloud thực tế của người dùng và cập nhật subscription
  useEffect(() => {
    if (refreshSubscription) {
      void refreshSubscription();
    }
    void getUserStorageUsage().then(setStorageUsage);
  }, []);

  // Bắn sự kiện GA4 khi người dùng mở màn hình Mua thêm dung lượng
  useEffect(() => {
    void logViewPricing();
  }, []);

  // Nội dung chuyển khoản định danh riêng theo user id
  const transferMemo = `HIDDER ${(
    currentUser?.id?.replace(/[^a-zA-Z0-9]/g, "") || "VIP"
  )
    .slice(0, 8)
    .toUpperCase()}`;

  // Link mã VietQR tự động sinh theo số tiền và cú pháp chuyển khoản
  const qrImageUri = getVietQRUrl({
    amount: selectedPlan.priceValue,
    memo: transferMemo,
  });

  const handlePlanSelect = (plan) => {
    setSelectedPlanId(plan.id);
    void logSelectPlan(plan.id, plan.priceValue);
  };

  const handleOpenPayosCheckout = async () => {
    try {
      setLoadingAction(true);
      void logOpenVietQRPayment(selectedPlan.id, selectedPlan.priceValue);
      const res = await createPayosPayment({
        planId: selectedPlan.id,
        amount: selectedPlan.priceValue,
      });

      if (res.success && res.checkoutUrl) {
        setPaymentStatus("PENDING");
        setPayosUrl(res.checkoutUrl);
        setPayosModalVisible(true);
      } else {
        Alert.alert("Thông báo", res.error || "Không thể tạo liên kết thanh toán lúc này.");
      }
    } catch (err) {
      Alert.alert("Lỗi", `Đã có lỗi xảy ra: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCopy = async (text, fieldName) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      Alert.alert("Sao chép", `Đã sao chép: ${text}`);
    }
  };

  const handleConfirmTransfer = async () => {
    try {
      setLoadingAction(true);
      void logConfirmTransfer(selectedPlan.id, selectedPlan.priceValue);
      const res = await submitManualPayment({
        planId: selectedPlan.id,
        amount: selectedPlan.priceValue,
        transferMemo,
      });

      if (res.success) {
        setPaymentStatus(res.status || "PENDING");
        setQrModalVisible(false);
        Alert.alert(
          "Đã gửi yêu cầu xác minh",
          `Gói ${selectedPlan.name} đang chờ kiểm tra giao dịch. Gói chỉ được cập nhật sau khi hệ thống xác nhận khoản chuyển khoản.`,
          [{ text: "Bắt đầu sử dụng" }],
        );
      } else {
        Alert.alert(
          "Thông báo",
          res.error || "Chưa thể kích hoạt gói lúc này.",
        );
      }
    } catch (err) {
      Alert.alert("Lỗi", `Kích hoạt thất bại: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCheckPayment = async () => {
    setLoadingAction(true);
    const result = await getLatestManualPayment();
    if (result.success) {
      setPaymentStatus(result.status || "NONE");
      if (result.status === "PAID" && refreshSubscription) {
        await refreshSubscription();
      }
    }
    setLoadingAction(false);
  };

  const handleStorePurchasePress = async () => {
    try {
      setLoadingAction(true);
      const provider = Platform.OS === "ios" ? "APPLE" : "GOOGLE_PLAY";
      const result = await requestSubscriptionPurchase({
        planId: selectedPlan.id,
        provider,
      });

      if (!result.success) {
        Alert.alert(
          "Dịch vụ thanh toán Store",
          result.error ||
            `Cổng thanh toán Store (${provider}) chưa cấu hình tài khoản Google/Apple Play Console.\n\nVui lòng dùng hình thức "Chuyển khoản VietQR" ở trên để thanh toán trực tiếp.`,
          [{ text: "Đã hiểu" }],
        );
      } else {
        if (refreshSubscription) {
          await refreshSubscription();
        }
        Alert.alert(
          "Thành công",
          `Đăng ký gói ${selectedPlan.name} thành công!`,
        );
      }
    } catch (err) {
      Alert.alert("Lỗi", `Không thể hoàn tất giao dịch: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRestorePress = async () => {
    try {
      setLoadingAction(true);
      const result = await restorePurchases();

      if (!result.success) {
        Alert.alert(
          "Khôi phục gói mua",
          result.error ||
            "Chưa tìm thấy giao dịch mua hợp lệ nào trên tài khoản Store của bạn.",
          [{ text: "Đóng" }],
        );
      } else {
        if (refreshSubscription) {
          await refreshSubscription();
        }
        Alert.alert(
          "Thành công",
          "Đã khôi phục thành công gói đăng ký của bạn!",
        );
      }
    } catch (err) {
      Alert.alert("Lỗi", `Khôi phục thất bại: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSignOut = () => {
    confirmAction({
      title: "Đăng xuất",
      message: "Bạn có muốn đăng xuất khỏi tài khoản này?",
      confirmText: "Đăng xuất",
      onConfirm: async () => {
        await signOutUser();
      },
    });
  };

  // Freemium Status Evaluation
  const isPaidActive =
    subscriptionAccess?.isPaid &&
    subscriptionAccess?.status === SUBSCRIPTION_STATUS.ACTIVE;
  const isDowngraded =
    subscriptionAccess?.isDowngraded ||
    subscriptionAccess?.status === "DOWNGRADED_FREE";

  let badgeText = "GÓI MIỄN PHÍ 256 MB";
  let badgeStyle = styles.badgeTrial;
  let badgeTextStyle = styles.badgeTrialText;

  if (isPaidActive) {
    badgeText = `ĐANG HOẠT ĐỘNG (${subscriptionAccess?.plan?.toUpperCase() || ""})`;
    badgeStyle = styles.badgeActive;
    badgeTextStyle = styles.badgeActiveText;
  } else if (isDowngraded) {
    badgeText = "ĐÃ VỀ GÓI FREE 256 MB (GÓI CŨ HẾT HẠN)";
    badgeStyle = styles.badgeExpired;
    badgeTextStyle = styles.badgeExpiredText;
  }

  const expirationText = subscriptionAccess?.expirationDate
    ? `Hết hạn / Gia hạn: ${subscriptionAccess.expirationDate}`
    : "Miễn phí vĩnh viễn (Không hết hạn)";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0D111A" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Row with Title and Back Button */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.mainTitle}>Nâng cấp</Text>
            <Text style={styles.mainTitle}>dung lượng Cloud</Text>
            <Text style={styles.subtitle}>
              Lưu trên máy miễn phí trọn đời. Nâng cấp để sao lưu Cloud an toàn
              hơn.
            </Text>
          </View>

          {onBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonIcon}>‹</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Account & Current Subscription Status Card (Moved to Top) */}
        <View style={styles.statusCardGradient}>
          <Text style={styles.statusCardTitle}>GÓI ĐANG SỬ DỤNG</Text>
          <Text style={styles.statusCardPlanName}>
            {isPaidActive ? subscriptionAccess?.plan?.toUpperCase() : "FREE · 256 MB"}
          </Text>
          <View style={styles.statusCardStorageWrap}>
            <Text style={styles.statusCardStorageLabel}>
              {formatBytes(storageUsage.storage_used)} / {formatBytes(storageUsage.storage_limit)}
            </Text>
          </View>
          <Text style={styles.statusCardExpiration}>
            {expirationText}
          </Text>
        </View>



        {/* Cloud Storage Usage Card with Progress Bar */}
        <View style={styles.quotaCard}>
          <View style={styles.quotaHeader}>
            <Text style={styles.quotaTitle}>☁️ Cloud Storage</Text>
            <Text
              style={[
                styles.quotaUsageText,
                storageUsage.is_full && { color: "#EF4444" },
              ]}
            >
              {formatBytes(storageUsage.storage_used)} /{" "}
              {formatBytes(storageUsage.storage_limit)}
            </Text>
          </View>

          {/* Visual Progress Bar */}
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, Math.max(3, storageUsage.percentage))}%`,
                  backgroundColor: storageUsage.is_full
                    ? "#EF4444"
                    : storageUsage.percentage > 80
                      ? "#F59E0B"
                      : "#38BDF8",
                },
              ]}
            />
          </View>

          <View style={styles.quotaSubRow}>
            <Text style={styles.quotaRemainingText}>
              {storageUsage.is_full
                ? "⚠️ Đã hết dung lượng Cloud"
                : `Còn trống: ${formatBytes(storageUsage.remaining_bytes)}`}
            </Text>
            <Text style={styles.quotaPercentText}>
              {storageUsage.percentage}%
            </Text>
          </View>

          {/* Storage Full Warning Banner */}
          {storageUsage.is_full ? (
            <View style={styles.storageFullWarning}>
              <Text style={styles.storageFullWarningIcon}>⚠️</Text>
              <Text style={styles.storageFullWarningText}>
                Dung lượng Cloud đã đầy. Các file trên máy vẫn an toàn. Hãy chọn
                gói bên dưới để nâng cấp dung lượng sao lưu hoặc xóa bớt file
                Cloud.
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionHeading}>CHỌN GÓI NÂNG CẤP CLOUD</Text>

        {/* 3 Storage Plan Cards (Matching Image) */}
        <View style={styles.plansList}>
          {paidPlans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isCurrentPlan = isPaidActive && subscriptionAccess?.planId === plan.id;
            const isLowerPlan = isPaidActive && plan.storageBytes < subscriptionAccess?.storageLimit;
            
            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.storageCard,
                  isSelected && styles.storageCardActive,
                  isLowerPlan && { opacity: 0.5 },
                ]}
                onPress={() => {
                  if (isLowerPlan) {
                    Alert.alert(
                      "Không thể hạ cấp",
                      "Bạn đang sử dụng gói cao hơn. Vui lòng chờ gói hiện tại hết hạn để có thể đăng ký gói này."
                    );
                    return;
                  }
                  handlePlanSelect(plan);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.cardLeftCol}>
                  <Text style={styles.cardPlanName}>{plan.name}</Text>
                  <Text style={styles.cardPlanDesc}>{plan.description}</Text>
                </View>

                <View style={styles.cardRightCol}>
                  {isCurrentPlan ? (
                    <View style={styles.currentPlanBadge}>
                      <Text style={styles.currentPlanBadgeText}>Đang sử dụng</Text>
                    </View>
                  ) : isLowerPlan ? (
                    <View style={[styles.currentPlanBadge, { backgroundColor: '#64748B' }]}>
                      <Text style={styles.currentPlanBadgeText}>Đợi hết hạn</Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.cardPriceText,
                        isSelected && styles.cardPriceTextActive,
                      ]}
                    >
                      {plan.priceText}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Primary Action: Thanh toán Chuyển khoản VietQR */}
        {isPaidActive && subscriptionAccess?.planId === selectedPlanId ? null : (
          <TouchableOpacity
            style={[
              styles.qrPayButton,
              (isPaidActive && selectedPlan?.storageBytes < subscriptionAccess?.storageLimit) && { display: 'none' }
            ]}
            onPress={handleOpenPayosCheckout}
            activeOpacity={0.85}
          >
            <Text style={styles.qrPayButtonIcon}>🏦</Text>
            <View style={styles.qrPayButtonTextWrap}>
              <Text style={styles.qrPayButtonTitle}>
                Thanh toán Chuyển khoản VietQR (Khuyên dùng)
              </Text>
              <Text style={styles.qrPayButtonSub}>
                Gói {selectedPlan?.name?.split("·")[0]?.trim()} •{" "}
                {selectedPlan?.priceText}
              </Text>
            </View>
            <Text style={styles.qrPayButtonArrow}>›</Text>
          </TouchableOpacity>
        )}

        {paymentStatus === "PENDING" ? (
          <TouchableOpacity
            style={styles.restoreButton}
            disabled={loadingAction}
            onPress={handleCheckPayment}
            activeOpacity={0.7}
          >
            <Text style={styles.restoreButtonText}>
              Kiểm tra trạng thái thanh toán
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Secondary Option: Thanh toán qua Google / Apple Store */}
        <TouchableOpacity
          style={styles.storePayButton}
          disabled={loadingAction}
          onPress={handleStorePurchasePress}
          activeOpacity={0.8}
        >
          {loadingAction ? (
            <ActivityIndicator size="small" color="#94A3B8" />
          ) : (
            <Text style={styles.storePayButtonText}>
              Hoặc thanh toán qua{" "}
              {Platform.OS === "ios" ? "Apple App Store" : "Google Play"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          disabled={loadingAction}
          onPress={handleRestorePress}
          activeOpacity={0.7}
        >
          <Text style={styles.restoreButtonText}>
            Khôi phục gói mua (Restore Purchases)
          </Text>
        </TouchableOpacity>



        {/* Disguise Shell Return */}
        {onBack ? (
          <TouchableOpacity style={styles.disguiseButton} onPress={onBack}>
            <Text style={styles.disguiseButtonText}>
              🔒 Về màn hình ngụy trang
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutButtonText}>Đăng xuất tài khoản này</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ======================================================== */}
      {/* VIETQR PAYMENT MODAL                                     */}
      {/* ======================================================== */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Quét mã VietQR 24/7</Text>
                <Text style={styles.modalSubtitle}>
                  Chuyển khoản qua ứng dụng Ngân hàng hoặc MoMo
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setQrModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              {/* QR Image Frame */}
              <View style={styles.qrFrame}>
                <Image
                  source={{ uri: qrImageUri }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                <Text style={styles.qrNotice}>
                  Mở app ngân hàng bất kỳ để quét mã tự động điền số tiền
                </Text>
              </View>

              {/* Bank Details Table */}
              <View style={styles.bankDetailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ngân hàng:</Text>
                  <Text style={styles.detailValueBold}>
                    {BANK_CONFIG.bankName}
                  </Text>
                </View>

                <View style={styles.dividerLight} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Số tài khoản:</Text>
                  <View style={styles.copyableValueRow}>
                    <Text style={styles.detailValueMono}>
                      {BANK_CONFIG.accountNo}
                    </Text>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() =>
                        handleCopy(BANK_CONFIG.accountNo, "account")
                      }
                    >
                      <Text style={styles.copyBtnText}>
                        {copiedField === "account" ? "✓ Đã chép" : "Sao chép"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.dividerLight} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Chủ tài khoản:</Text>
                  <Text style={styles.detailValueBold}>
                    {BANK_CONFIG.accountName}
                  </Text>
                </View>

                <View style={styles.dividerLight} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Số tiền:</Text>
                  <View style={styles.copyableValueRow}>
                    <Text style={styles.detailPriceValue}>
                      {String(selectedPlan?.priceValue || 0).replace(
                        /\B(?=(\d{3})+(?!\d))/g,
                        ".",
                      )}{" "}
                      đ
                    </Text>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() =>
                        handleCopy(String(selectedPlan.priceValue), "amount")
                      }
                    >
                      <Text style={styles.copyBtnText}>
                        {copiedField === "amount" ? "✓ Đã chép" : "Sao chép"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.dividerLight} />

                <View style={styles.detailRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>
                      Nội dung chuyển khoản:
                    </Text>
                    <Text style={styles.detailSubNote}>
                      (Vui lòng giữ nguyên nội dung này)
                    </Text>
                  </View>
                  <View style={styles.copyableValueRow}>
                    <Text style={styles.detailMemoValue}>{transferMemo}</Text>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() => handleCopy(transferMemo, "memo")}
                    >
                      <Text style={styles.copyBtnText}>
                        {copiedField === "memo" ? "✓ Đã chép" : "Sao chép"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Confirm Paid Button */}
              <TouchableOpacity
                style={[
                  styles.confirmPaidButton,
                  loadingAction && styles.buttonDisabled,
                ]}
                disabled={loadingAction}
                onPress={handleConfirmTransfer}
                activeOpacity={0.85}
              >
                {loadingAction ? (
                  <ActivityIndicator color="#0F172A" size="small" />
                ) : (
                  <Text style={styles.confirmPaidButtonText}>
                    ✅ Tôi đã chuyển khoản xong
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setQrModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Đóng</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={payosModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPayosModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={styles.webviewHeader}>
            <TouchableOpacity onPress={() => setPayosModalVisible(false)} style={styles.webviewCloseBtn}>
              <Text style={styles.webviewCloseText}>Đóng</Text>
            </TouchableOpacity>
            <Text style={styles.webviewTitle}>Thanh toán an toàn</Text>
            <View style={{ width: 60 }} />
          </View>
          {payosUrl && (
            <WebView
              source={{ uri: payosUrl }}
              style={{ flex: 1 }}
              onNavigationStateChange={(navState) => {
                if (navState.url.includes('hidder://payment/success')) {
                  setPayosModalVisible(false);
                  setPayosUrl(null);
                  handleCheckPayment();
                  Alert.alert("Thành công", "Đã ghi nhận yêu cầu! Đang kiểm tra thanh toán...");
                } else if (navState.url.includes('hidder://payment/cancel')) {
                  setPayosModalVisible(false);
                  setPayosUrl(null);
                }
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0D111A",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  titleWrap: {
    flex: 1,
    paddingRight: 16,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 10,
    lineHeight: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#1E2530",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  backButtonIcon: {
    fontSize: 26,
    color: "#E2E8F0",
    lineHeight: 28,
    fontWeight: "300",
    textAlign: "center",
  },
  plansList: {
    gap: 14,
    marginBottom: 20,
  },
  storageCard: {
    backgroundColor: "#171B26",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: "#232938",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  storageCardActive: {
    borderColor: "#38BDF8",
    backgroundColor: "#1B2232",
  },
  cardLeftCol: {
    flex: 1,
    paddingRight: 14,
  },
  cardPlanName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  cardPlanDesc: {
    fontSize: 13,
    color: "#94A3B8",
    lineHeight: 18,
  },
  cardRightCol: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  cardPriceText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  cardPriceTextActive: {
    color: "#38BDF8",
  },
  qrPayButton: {
    backgroundColor: "#38BDF8",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  qrPayButtonIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  qrPayButtonTextWrap: {
    flex: 1,
  },
  qrPayButtonTitle: {
    color: "#090D16",
    fontSize: 15,
    fontWeight: "800",
  },
  qrPayButtonSub: {
    color: "#0F2942",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  qrPayButtonArrow: {
    fontSize: 22,
    color: "#090D16",
    fontWeight: "700",
    marginLeft: 6,
  },
  storePayButton: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  storePayButtonText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  restoreButton: {
    backgroundColor: "transparent",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  restoreButtonText: {
    color: "#64748B",
    fontSize: 12.5,
    fontWeight: "600",
  },
  localFreeBanner: {
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  localFreeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  localFreeTitle: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  localFreeDesc: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 16,
  },
  quotaCard: {
    backgroundColor: "#171B26",
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: "#232938",
  },
  quotaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  quotaTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  quotaUsageText: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "700",
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#232938",
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  quotaSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quotaRemainingText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  quotaPercentText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  storageFullWarning: {
    marginTop: 12,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    flexDirection: "row",
    alignItems: "center",
  },
  storageFullWarningIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  storageFullWarningText: {
    flex: 1,
    color: "#FCA5A5",
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeading: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#121722",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1E2535",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  infoLabel: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "500",
  },
  infoValue: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    maxWidth: "60%",
  },
  divider: {
    height: 1,
    backgroundColor: "#1E2535",
    marginVertical: 4,
  },
  badgeExpired: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  badgeExpiredText: {
    color: "#F87171",
    fontSize: 11,
    fontWeight: "700",
  },
  badgeActive: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  badgeActiveText: {
    color: "#4ADE80",
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTrial: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  badgeTrialText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "700",
  },
  disguiseButton: {
    backgroundColor: "#1E2535",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  disguiseButtonText: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "700",
  },
  logoutButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#111726",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  qrFrame: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  qrImage: {
    width: 240,
    height: 240,
    backgroundColor: "#FFFFFF",
  },
  qrNotice: {
    fontSize: 12,
    color: "#475569",
    textAlign: "center",
    marginTop: 10,
    fontWeight: "500",
  },
  bankDetailCard: {
    backgroundColor: "#161F33",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#24324D",
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  detailLabel: {
    color: "#94A3B8",
    fontSize: 13,
  },
  detailValueBold: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  detailPriceValue: {
    color: "#38BDF8",
    fontSize: 16,
    fontWeight: "800",
  },
  detailMemoValue: {
    color: "#FBBF24",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  detailValueMono: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
  },
  detailSubNote: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  copyableValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  copyBtn: {
    backgroundColor: "#24324D",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyBtnText: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "600",
  },
  dividerLight: {
    height: 1,
    backgroundColor: "#24324D",
    marginVertical: 4,
  },
  confirmPaidButton: {
    backgroundColor: "#22C55E",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmPaidButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  cancelModalButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelModalText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  webviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#fff"
  },
  webviewCloseBtn: {
    paddingVertical: 8,
    width: 60,
  },
  webviewCloseText: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
  },
  webviewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  statusCardGradient: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
    alignItems: "center",
  },
  statusCardAccount: {
    color: "#94A3B8",
    fontSize: 13,
    marginBottom: 12,
  },
  statusCardTitle: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 4,
    opacity: 0.8,
  },
  statusCardPlanName: {
    color: "#38BDF8",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 16,
  },
  statusCardStorageWrap: {
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusCardStorageLabel: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
  },
  statusCardDivider: {
    height: 1,
    width: "100%",
    backgroundColor: "rgba(148, 163, 184, 0.1)",
    marginBottom: 16,
  },
  statusCardExpiration: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "500",
  },
  currentPlanBadge: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  currentPlanBadgeText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },
});
