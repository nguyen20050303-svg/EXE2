# Chính Sách Quyền Riêng Tư (Privacy Policy) – Hidder

**Ứng dụng:** Hidder (com.hidder.app)  
**Cập nhật lần cuối:** 26/09/2026  
**Nhà phát triển:** Hidder Security Team  
**Liên hệ hỗ trợ:** support@hidder.app  

---

## 1. Giới thiệu tổng quan
Ứng dụng **Hidder** được phát triển nhằm mục đích cung cấp cho người dùng một không gian lưu trữ cá nhân an toàn, riêng tư, được bảo vệ bằng mật mã chuẩn quân sự (AES-256-GCM) và giao diện ngụy trang bảo vệ chống phát hiện.

Chúng tôi tuân thủ nghiêm ngặt nguyên tắc **Zero-Knowledge Encryption** (Mã hóa không tri thức): Khóa mã hóa được quản lý cục bộ trên thiết bị của bạn. Chúng tôi không nắm giữ khóa giải mã và không thể đọc trộm các tệp tin trong kho lưu trữ của bạn.

---

## 2. Dữ liệu thu thập và Mục đích sử dụng

### a. Thông tin tài khoản
- **Địa chỉ Email và User ID:** Được thu thập khi bạn đăng ký tài khoản nhằm xác thực phiên người dùng, đồng bộ các tệp mã hóa trên Supabase Cloud và bảo lưu các gói dịch vụ lưu trữ.

### b. Nội dung kho bảo mật
- **Hình ảnh, Video, Ghi chú, Mật khẩu, Tài liệu, Ghi âm giọng nói:** Người dùng chủ động thêm vào kho. Các tệp này được mã hóa cục bộ bằng khóa Master Key AES-256 trước khi lưu vào bộ nhớ máy hoặc đồng bộ lên kho đám mây.

---

## 3. Quyền truy cập thiết bị (Permissions)

| Quyền | Mục đích sử dụng | Bắt buộc / Tùy chọn |
|---|---|---|
| `android.permission.RECORD_AUDIO` | Thu âm giọng nói bí mật trong màn hình Voice Memos | Tùy chọn (chỉ xin quyền khi bấm Ghi âm) |
| `android.permission.MODIFY_AUDIO_SETTINGS` | Điều phối chế độ phát loa / tai nghe khi nghe lại ghi âm | Đi kèm quyền Audio |
| `android.permission.CAMERA` | Chụp ảnh hoặc quay video trực tiếp cất vào kho bảo mật | Tùy chọn (chỉ xin quyền khi dùng máy ảnh) |
| `android.permission.USE_BIOMETRIC` / `USE_FINGERPRINT` | Mở khóa kho nhanh bằng Vân tay hoặc Khuôn mặt (Face ID) | Tùy chọn (có thể bật/tắt trong Cài đặt) |
| `android.permission.INTERNET` | Đồng bộ dữ liệu mã hóa lên Supabase và lấy dữ liệu thời tiết ngụy trang | Bắt buộc |

Ứng dụng **KHÔNG** yêu cầu quyền vị trí nền (Background Location), **KHÔNG** yêu cầu quyền Danh bạ (Contacts), và **KHÔNG** yêu cầu quyền SMS/Cuộc gọi.

---

## 4. Bảo mật dữ liệu & Cơ chế Decoy Vault
- **Mã hóa AES-256-GCM:** Dữ liệu được bảo vệ bằng thuật toán mã hóa khóa đối xứng tiêu chuẩn của chính phủ Hoa Kỳ.
- **Bảo vệ chống cưỡng ép (Decoy Vault):** Khi nhập mã PIN mồi (Decoy PIN), ứng dụng chỉ mở ra két giả chứa các ghi chú vô hại, bảo vệ bạn trong các tình huống bị đe dọa hoặc ép buộc mở điện thoại.
- **Isolated Storage:** Mọi khóa nhạy cảm được bảo vệ an toàn trong Android Keystore thông qua `expo-secure-store`.

---

## 5. Xóa dữ liệu và Tài khoản (Data & Account Deletion)
Người dùng có toàn quyền:
1. Xóa từng tệp tin, hình ảnh, ghi âm hoặc ghi chú bất kỳ trong kho lưu trữ.
2. Đăng xuất hoặc xóa toàn bộ dữ liệu kho bất cứ lúc nào.
3. Yêu cầu xóa vĩnh viễn tài khoản và toàn bộ dữ liệu đám mây trên Supabase bằng cách liên hệ qua email: `support@hidder.app`.

---

## 6. Thay đổi chính sách
Chúng tôi có thể cập nhật Chính sách quyền riêng tư này định kỳ để tuân thủ các quy định pháp luật và chính sách mới nhất của Google Play Store. Mọi thay đổi quan trọng sẽ được thông báo rõ ràng trong ứng dụng.
