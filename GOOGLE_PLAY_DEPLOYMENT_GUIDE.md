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

### A. Quyền truy cập ứng dụng (App Access)
- Vì Hidder có cơ chế ngụy trang và bảo vệ bằng mật khẩu, bạn cần cung cấp thông tin cho người kiểm duyệt của Google:
  - **Tài khoản đăng nhập test:** Tạo sẵn 1 tài khoản (ví dụ: `google-review@hidder.app` / `TestPass123!`).
  - **Hướng dẫn mở két:**
    > "Ứng dụng ngụy trang dưới dạng ứng dụng Ghi chú / Máy tính. Để mở két bảo mật, tại thanh tìm kiếm ghi chú (hoặc màn hình máy tính), hãy nhập mã PIN: `9988` (rồi bấm nút `=` nếu ở máy tính). Két bảo mật sẽ mở ra."

### B. An toàn dữ liệu (Data Safety Questionnaire)
Khi trả lời bảng câu hỏi về dữ liệu:
- **Dữ liệu có được thu thập không?** -> Chọn **Có (Yes)**.
- **Dữ liệu có được mã hóa khi truyền tải không?** -> Chọn **Có (Yes, all user data is encrypted in transit)**.
- **Có cơ chế yêu cầu xóa dữ liệu không?** -> Chọn **Có (Yes, users can delete their data and account)**.
- **Các loại dữ liệu thu thập:**
  1. **Personal info (Email address):** Mục đích: App functionality, Account management. Không chia sẻ bên thứ ba.
  2. **Photos & Videos:** Người dùng chủ động tải lên, mã hóa đầu cuối.
  3. **Audio recordings:** Voice memos, chỉ thu âm khi người dùng ấn nút.
  4. **Files & Documents:** Tài liệu mật trong Document Vault.

### C. Khán giả mục tiêu & Xếp hạng nội dung (Target Audience & Content Rating)
- Độ tuổi: **13 tuổi trở lên (13+)** hoặc **18+**.
- Không hướng tới trẻ em dưới 13 tuổi.

---

## 5. Đăng ký tài khoản Google Play Console
- Phí đăng ký nhà phát triển của Google: **$25 USD (trả 1 lần duy nhất)** tại [play.google.com/console](https://play.google.com/console).
- Chuẩn bị hình ảnh đồ họa:
  - **App Icon:** 512 x 512 px (PNG 32-bit, không có nền trong suốt).
  - **Đồ họa tính năng (Feature Graphic):** 1024 x 500 px (JPG hoặc PNG).
  - **Ảnh chụp màn hình (Screenshots):** Tối thiểu 2 ảnh (tỷ lệ 16:9 hoặc 9:16).
