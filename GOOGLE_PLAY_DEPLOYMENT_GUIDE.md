# 🚀 Hướng Dẫn Phát Hành Ứng Dụng Hidder Lên Google Play (CH Play)

Tài liệu này tổng hợp toàn bộ các bước, lệnh build và nội dung khai báo cần thiết để đưa ứng dụng **Hidder** lên Google Play Store thành công, tránh bị từ chối duyệt.

---

## 1. Các điều chỉnh kỹ thuật đã hoàn tất trong dự án

1. **Định dạng đóng gói AAB (Android App Bundle):**
   - File `eas.json` đã được cấu hình profile `production` sinh tệp `.aab` (Google Play bắt buộc dùng AAB từ năm 2021).
   - Bật `autoIncrement: true` để tự động tăng `versionCode` mỗi lần build.

2. **Cấu hình `app.json` tuân thủ Google Play:**
   - Đã gán `versionCode: 1` và `version: "1.0.0"`.
   - Đặt `allowBackup: false` để bảo vệ két mã hóa không bị sao lưu lộ ra ngoài qua Google Drive Backup.
   - Tối ưu hóa quyền Android (`permissions`), loại bỏ các quyền truy cập tệp rộng bị Google siết chặt (`WRITE_EXTERNAL_STORAGE`), chỉ giữ các quyền cần thiết:
     - `android.permission.RECORD_AUDIO` (Ghi âm Voice Memos)
     - `android.permission.CAMERA` (Chụp ảnh/quay video két mật)
     - `android.permission.USE_BIOMETRIC` & `USE_FINGERPRINT` (Mở khóa sinh trắc học)
     - `android.permission.INTERNET` (Đồng bộ Cloud & Thời tiết)

3. **Chính sách quyền riêng tư (Privacy Policy):**
   - Đã tạo sẵn file web `privacy-policy.html` và markdown `PRIVACY_POLICY.md` đạt chuẩn Data Safety của Google Play.
   - Đã tích hợp nút xem Chính sách quyền riêng tư trực tiếp trong màn hình Tài khoản (`AccountScreen.js`).

---

## 2. Lệnh đóng gói bản Production (AAB)

Mở terminal trên máy tính và chạy:

```powershell
git add .
git commit -m "chore(release): prepare project for Google Play production release"
git push origin main
cmd /c "npx eas-cli build -p android --profile production"
```

Khi build hoàn tất trên EAS Cloud, bạn sẽ nhận được đường dẫn tải về tệp `.aab` để tải lên Google Play Console.

---

## 3. Tạo đường dẫn Chính sách quyền riêng tư (Privacy Policy URL)

Google Play **bắt buộc** phải có 1 URL công khai chứa Chính sách bảo mật. Bạn có thể chọn 1 trong 2 cách cực kỳ nhanh sau:

### Cách 1: Sử dụng GitHub Pages (Miễn phí, 2 phút)
1. Trong repository GitHub của bạn (`EXE2`), vào tab **Settings** > mục **Pages**.
2. Tại mục **Branch**, chọn `main` và thư mục `/ (root)`, nhấn **Save**.
3. Sau 1 phút, bạn sẽ có URL:  
   `https://<username>.github.io/<repo>/privacy-policy.html`
4. Dán URL này vào mục **Privacy policy** trên Google Play Console.

### Cách 2: Upload lên Supabase Storage
1. Vào Supabase Dashboard > **Storage** > tạo một bucket đặt tên `public-docs` (chọn Public).
2. Tải tệp `privacy-policy.html` lên.
3. Lấy Public URL của tệp để điền vào Google Play Console.

---

## 4. Hướng dẫn khai báo Google Play Console

### A. Quyền truy cập ứng dụng (App Access - BẮT BUỘC KHAI BÁO)
> ⚠️ **LƯU Ý CỰC KỲ QUAN TRỌNG:** Nếu không khai báo cách mở két cho đội ngũ kiểm duyệt của Google, ứng dụng sẽ bị từ chối (Reject) ngay vì lỗi "Không truy cập được tính năng / Broken functionality".

Cung cấp thông tin sau cho kiểm duyệt viên Google trong phần **App access** > **All or some functionality is restricted**:
- **Tài khoản test đã tạo sẵn:** 
  - Email: `google-review@hidder.app`
  - Mật khẩu: `ReviewerPass123!`
- **Hướng dẫn mở két (Copy đoạn này dán vào hướng dẫn):**
  > "This application provides a stealth privacy vault disguised as utility tools. To access the secure vault interface for review:
  > 1. If using Calculator shell: Long-press the '=' button for 1.2 seconds. A prompt will appear. Enter Real PIN: 9988 to open the Private Vault (or Decoy PIN: 1122 to test Decoy mode).
  > 2. If using Notes shell: Long-press the yellow 'Notes' title on top for 1.5 seconds. Enter Real PIN: 9988.
  > 3. If using Weather shell: Long-press the central temperature card for 1.5 seconds. Enter Real PIN: 9988.
  > 4. If using Calendar shell: Long-press the Month/Year header for 1.5 seconds. Enter Real PIN: 9988."

---

### B. An toàn dữ liệu (Data Safety Questionnaire)
Khi trả lời bảng câu hỏi về dữ liệu:
- **Dữ liệu có được thu thập không?** -> Chọn **Có (Yes)**.
- **Dữ liệu có được mã hóa khi truyền tải không?** -> Chọn **Có (Yes, all user data is encrypted in transit via HTTPS & AES-256-GCM client-side)**.
- **Có cơ chế yêu cầu xóa dữ liệu không?** -> Chọn **Có (Yes, users can delete their data directly in app and request account deletion via support email)**.
- **Các loại dữ liệu thu thập:**
  1. **Personal info (Email address):** Mục đích: App functionality, Account management. Không chia sẻ bên thứ ba.
  2. **Photos & Videos:** Người dùng chủ động tải lên két, được mã hóa cục bộ.
  3. **Audio recordings:** Voice memos, chỉ thu âm khi người dùng ấn nút ghi âm.
  4. **Files & Documents:** Tài liệu mật trong Document Vault.

---

### C. Khán giả mục tiêu & Xếp hạng nội dung (Target Audience & Content Rating)
- Độ tuổi: **13 tuổi trở lên (13+)** hoặc **18+**.
- Không hướng tới trẻ em dưới 13 tuổi.

---

## 5. Quy Định Mới Của Google Play Cho Tài Khoản Cá Nhân (Closed Testing 20 Testers)

> 💡 **Lưu ý quy định Google từ tháng 11/2023:** 
> Nếu tài khoản Google Play Console là **tài khoản cá nhân mới tạo**, Google bắt buộc:
> - Phải tạo một bản phát hành thử nghiệm đóng (**Closed Testing track**).
> - Cần ít nhất **20 người tham gia thử nghiệm (testers)** chấp nhận tham gia (opt-in) và cài đặt app.
> - Giữ trạng thái thử nghiệm liên tục trong **tối thiểu 14 ngày**.
> - Sau 14 ngày, bạn mới có thể nhấn nút **"Apply for Production"** để đưa app lên CH Play công khai.

---

## 6. Đăng ký tài khoản & Chuẩn bị tài nguyên đồ họa

- Phí đăng ký tài khoản Google Play Developer: **$25 USD (thanh toán 1 lần duy nhất qua thẻ Visa/Mastercard)** tại [play.google.com/console](https://play.google.com/console).
- Bộ hình ảnh đồ họa bắt buộc tải lên Store Listing:
  - **App Icon:** 512 x 512 px (PNG 32-bit, không có nền trong suốt).
  - **Đồ họa tính năng (Feature Graphic):** 1024 x 500 px (JPG hoặc PNG, tỷ lệ 16:9).
  - **Ảnh chụp màn hình điện thoại (Phone Screenshots):** Tối thiểu 2 ảnh, tối đa 8 ảnh (tỷ lệ 16:9 hoặc 9:16, độ phân giải tối thiểu 1080px).

