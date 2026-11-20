# ĐK.Language — Ứng dụng học từ vựng offline

Ứng dụng web **không cần framework, không cần npm**, hỗ trợ iPhone/Android/máy tính; có thể chỉnh sửa miễn phí bằng VS Code.

## Chức năng
- Thêm/sửa/xóa từ và nhập hàng loạt qua `từ; nghĩa`, `từ | nghĩa`, `từ - nghĩa` hoặc tab. Tối thiểu **4 từ và 4 nghĩa khác nhau** để tạo đề.
- Tự nhớ trước khi lật đáp án hoặc làm trắc nghiệm 4 đáp án. Chọn luyện Anh → Việt, Việt → Anh hoặc luân phiên hai chiều.
- Nghe phát âm Anh–Mỹ ở tốc độ 1× và 0,75× trong kho từ và khi luyện. Nghe offline cần giọng English (United States) cục bộ mà trình duyệt có thể sử dụng.
- Ôn từ đến hạn trước từ mới. Mức Quên đưa từ trở lại sau 2 phút. Mức Khó trong giai đoạn học lại lên lịch sau 10 phút. Mỗi nút hiển thị thời gian ôn tiếp theo. Luyện thêm không dời lịch chính.
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
1. Tạo repository GitHub mới (ví dụ `Đăng Khôi`).
2. Upload **toàn bộ nội dung thư mục** (index.html, app.js, scheduler.js, sw.js, styles.css, manifest.webmanifest, icons/...) vào thư mục gốc repository.
3. Vào **Settings → Pages → Build and deployment → Deploy from a branch** → `main` → `/ (root)` → Save.
4. Đợi GitHub Pages cấp URL `https://TEN-TAI-KHOAN.github.io/lexiflow/`. Mở URL bằng Safari (iPhone) hoặc Chrome (Android); chọn **Share → Add to Home Screen** / **Install app**.
5. Khi thay đổi code, tăng số phiên bản của `CACHE` trong `sw.js` thành một phiên bản mới (`lexiflow-v1.3`, `v1.4`...) để cập nhật tài nguyên offline. Đợi bản deploy hoàn tất và đóng/mở lại ứng dụng để nhận bản mới.

**Chú ý:** GitHub Pages cần repository public với nhiều gói miễn phí; mã nguồn là công khai. Dữ liệu từ vựng do người học nhập được lưu cục bộ, không đẩy lên GitHub. Không lưu thông tin nhạy cảm trong repository.

## Dữ liệu và quyền riêng tư
- ĐK.Language tiếp tục dùng kho IndexedDB và định dạng bản sao lưu của LexiFlow. Bản cập nhật dùng cùng URL. Đóng các cửa sổ ứng dụng cũ rồi mở lại khi có mạng để tải phiên bản mới.
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

## Cơ sở phương pháp

- Luyện tự truy xuất đáp án theo nghiên cứu của [Roediger và Karpicke](https://pubmed.ncbi.nlm.nih.gov/16507066/).
- Chia các lượt ôn theo thời gian theo tổng quan của [Cepeda và cộng sự](https://pubmed.ncbi.nlm.nih.gov/16719566/). Khoảng 2 và 10 phút là lựa chọn triển khai của ứng dụng để ôn lại từ khó hoặc vừa quên.
