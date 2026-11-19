# LexiFlow — Ứng dụng học từ vựng offline (PWA)

Ứng dụng web **không cần framework, không cần npm**, hỗ trợ iPhone/Android/máy tính; có thể chỉnh sửa miễn phí bằng VS Code.

## Chức năng
- Thêm/sửa/xóa từ và nhập hàng loạt qua `từ; nghĩa`, `từ | nghĩa`, `từ - nghĩa` hoặc tab. Tối thiểu **4 từ và 4 nghĩa khác nhau** để tạo đề.
- Trắc nghiệm 4 đáp án, luyện Anh → Việt, Việt → Anh hoặc hai chiều.
- Chọn mức độ nhớ Quên/Khó/Nhớ/Dễ sau mỗi câu; dùng thuật toán spaced repetition DSR thích ứng (bản tự triển khai, **không phải FSRS chuẩn**).
- Tổng quan, tỷ lệ đúng, phân loại ghi nhớ, biểu đồ 7 ngày, lịch ôn.
- IndexedDB để lưu offline và sao lưu/khôi phục file JSON (chỉ đồng bộ giữa thiết bị bằng sao lưu thủ công).
- PWA cài lên màn hình chính, Service Worker hỗ trợ offline sau lần tải đầu tiên.

## Chạy trên Windows
Yêu cầu Python 3 (hoặc bất kỳ static HTTP server):

```powershell
cd vocab-master
py -m http.server 8080
```

Mở `http://localhost:8080/`. **Không mở bằng `file://`** vì IndexedDB/PWA có thể hoạt động không đúng.

## Đưa lên GitHub Pages miễn phí
1. Tạo repository GitHub mới (ví dụ `lexiflow`).
2. Upload **toàn bộ nội dung thư mục** (index.html, app.js, scheduler.js, sw.js, styles.css, manifest.webmanifest, icons/...) vào thư mục gốc repository.
3. Vào **Settings → Pages → Build and deployment → Deploy from a branch** → `main` → `/ (root)` → Save.
4. Đợi GitHub Pages cấp URL `https://TEN-TAI-KHOAN.github.io/lexiflow/`. Mở URL bằng Safari (iPhone) hoặc Chrome (Android); chọn **Share → Add to Home Screen** / **Install app**.
5. Khi thay đổi code, tăng số phiên bản của `CACHE` trong `sw.js` thành một phiên bản mới (`lexiflow-v1.3`, `v1.4`...) để cập nhật tài nguyên offline. Đợi bản deploy hoàn tất và đóng/mở lại ứng dụng để nhận bản mới.

**Chú ý:** GitHub Pages cần repository public với nhiều gói miễn phí; mã nguồn là công khai. Dữ liệu từ vựng do người học nhập được lưu cục bộ, không đẩy lên GitHub. Không lưu thông tin nhạy cảm trong repository.

## Dữ liệu và quyền riêng tư
- Không có server, không có tài khoản, không ghi analytics; từ vựng ở từng trình duyệt/thiết bị riêng.
- Xóa dữ liệu trang/trình duyệt hoặc gỡ PWA có thể làm mất toàn bộ tiến độ. Vào **Cài đặt → Xuất JSON** để sao lưu định kỳ.
- Khi đổi thiết bị, xuất JSON ở máy cũ rồi nhập JSON trên thiết bị mới; nhập sẽ thay thế toàn bộ dữ liệu hiện tại.
- Cập nhật app không tự động xóa IndexedDB nếu giữ nguyên origin/scope và không xóa lưu trữ.
- Giao diện dùng font hệ thống và tải tài nguyên từ cùng trang web.

## Tinh chỉnh
- `styles.css`: màu sắc, giao diện.
- `app.js`: quản lý dữ liệu, bài trắc nghiệm, thống kê.
- `scheduler.js`: thuật toán ôn ngắt quãng.
- `sw.js`: cache offline.
- `manifest.webmanifest`: tên và biểu tượng PWA.

## Giới hạn
- DSR là mô hình dự đoán đơn giản, không phải FSRS chính thức và chưa được hiệu chỉnh bằng dữ liệu quy mô lớn.
- Phương án nhiễu lấy ngẫu nhiên từ danh sách từ cùng kho, không dùng AI/chọn theo ngữ nghĩa; câu hỏi đáng tin hơn khi danh sách phong phú.
- Nhập hàng loạt yêu cầu **đã có nghĩa tiếng Việt**; app offline không tự dịch từ chưa có nghĩa.
- Số lượt ôn trong ngày phụ thuộc ngày tháng trên máy; đổi múi giờ có thể làm thay đổi thống kê ngày.
- Phân loại chất lượng ghi nhớ là ước lượng, không phải thước đo khoa học được xác nhận độc lập.
