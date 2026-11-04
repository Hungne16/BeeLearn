# BeeLearn

Ứng dụng học từ vựng tiếng Anh với flashcard, ôn tập cách quãng và hai trò chơi. Giao diện tiếng Việt, hỗ trợ máy tính và điện thoại.

## Tính năng

- Flashcard có hình minh họa, phiên âm, ví dụ và phát âm bằng Web Speech API.
- Học thẻ, tự kiểm tra và ôn các từ đến hạn.
- Lật thẻ chọn nghĩa và bắn từ vựng bằng Canvas.
- Tạo/sửa bộ từ, thêm từ và nhập CSV/JSON.
- Lưu tiến độ, thống kê và bản sao lưu JSON.
- Thanh điều hướng cố định trên mọi màn hình.
- Nhịp học: lịch tháng, chuỗi hiện tại, kỷ lục, mốc 3/7/14/30/100 ngày và mục tiêu 10 lượt/ngày. Trả lời ít nhất 1 lượt/ngày (thẻ hoặc trò chơi) để giữ chuỗi; bỏ trọn một ngày sẽ bắt đầu chuỗi mới. Kỷ lục vẫn được giữ.
- Nút chuỗi trên thanh đầu trang mở lịch từ mọi màn hình; các ngày trong lịch tuần mở chi tiết ngày. Thống kê chuỗi được tính từ lịch sử hoạt động đã đồng bộ Firebase, không cần lưu riêng.
- Tạo/sửa/xóa bộ từ và thẻ, nhập CSV/JSON ngay cả khi thư viện trống, sao lưu/khôi phục có xác nhận trong web. Trò chơi tự tạm dừng khi mở hộp thoại.

## Chạy trên máy

Cần Node.js 22 trở lên.

```sh
npm ci
npm run build
npm test
```

Phục vụ thư mục `dist` bằng một HTTP server, ví dụ nếu máy có Python:

```sh
python -m http.server 8080 --directory dist
```

Mở `http://localhost:8080`. Không mở `index.html` bằng đường dẫn `file://` vì ứng dụng tải dữ liệu bằng `fetch` và dùng ES modules.

## Deploy lên Vercel

1. Import repository `Hungne16/BeeLearn` vào Vercel.
2. Giữ Root Directory là thư mục gốc của repo.
3. Cấu hình đã có trong `vercel.json`:
   - Framework: Other.
   - Install Command: `npm ci`.
   - Build Command: `npm run build`.
   - Output Directory: `dist`.
4. Chọn Node.js 22.x hoặc mới hơn rồi Deploy.

Đã cấu hình Firebase project `beelearn-1079b`; không cần biến môi trường để build. Tên miền `beelearning-ten.vercel.app` đã được thêm vào Firebase Auth. Nếu đổi tên miền, thêm **đúng hostname mới** vào Firebase Console → Authentication → Settings → Authorized domains. Ví dụ hostname không chứa `https://` hoặc đường dẫn. Chưa thêm tên miền thì Google đăng nhập sẽ báo `unauthorized-domain`.

## Dữ liệu và Firebase

- Bộ từ mẫu: `public/seed.json` (30 từ IT trong Day 1).
- Chưa đăng nhập: bộ từ và tiến độ lưu trên máy bằng `localStorage`, khóa `nho-tu-v1`.
- Đăng nhập Google: đồng bộ bộ từ, lịch ôn, lượt học và kết quả trò chơi vào Firestore theo UID riêng. Header hiển thị tình trạng đồng bộ.
- Mỗi tài khoản có bản lưu và hàng đợi riêng trong trình duyệt (`beelearn-cloud:<uid>`). Mất mạng vẫn lưu trên máy và thử gửi lại khi có mạng. Đăng xuất trở về dữ liệu khách, giữ nguyên bản lưu của tài khoản.
- Tài khoản cloud trống sẽ nhận dữ liệu máy ở lần đăng nhập đầu. Nếu cloud đã có dữ liệu, dùng nút **Gộp dữ liệu máy này** trong tài khoản để thêm dữ liệu khách; không tự ghi đè cloud.
- Đồng bộ dùng transaction và mã thao tác để thử lại không cộng trùng; thay đổi các trường khác nhau của thẻ được gộp, thẻ đã xóa không bị thay đổi cũ tạo lại. Khi sửa cùng một trường, thao tác được ghi sau cùng thắng.
- Firestore lưu từng bộ từ trong một document (giới hạn Firebase 1 MiB/document); chia bộ từ lớn thành nhiều bộ nhỏ. Định kỳ xuất JSON làm bản sao lưu độc lập.
- Dữ liệu trên tên miền `chatgpt.site` không tự chuyển sang tên miền Vercel. Trước khi đổi trang, bấm **Sao lưu** ở trang cũ. Trên trang mới, vào **Quản lý → Nhập CSV / JSON** và nhập bản sao lưu để khôi phục.
- Firebase Authentication (Google) và Firestore đã được cấu hình. `src/firebase-config.ts` chứa cấu hình Web công khai, không phải khóa quản trị. `firestore.rules` chỉ cho UID sở hữu truy cập nhánh `users/<uid>`. Quy tắc đã được xuất bản trên project.
- Muốn cập nhật rules bằng CLI sau này: đăng nhập đúng tài khoản có quyền project, rồi `firebase deploy --only firestore:rules --project beelearn-1079b`. Không cần Firebase Admin SDK hoặc service account trong frontend.
- Không commit service-account key, private key hoặc file `.env` vào repo.

## Cấu trúc

```text
src/                 TypeScript: flashcard, tiến độ, dashboard, điều hướng, games
public/              HTML, CSS, hình minh họa và bộ từ mẫu
scripts/build.mjs    Sao chép public, kiểm tra TypeScript và bundle Firebase bằng esbuild
dist/                Kết quả build, không đưa lên Git
vercel.json          Cấu hình deploy
test.mjs             Kiểm tra lịch ôn và CSV
game-test.mjs        Kiểm tra đáp án, va chạm và bố cục mục tiêu
```

Sửa file trong `src/` hoặc `public/`, sau đó chạy lại `npm run build`. Không sửa trực tiếp các file trong `dist/`.

## Kiểm tra Firebase cục bộ

Cài Firebase CLI và Java hỗ trợ emulator. Chạy sau build:

```sh
firebase emulators:exec --only firestore,auth --project demo-beelearn "npm run test:firebase"
```

Kiểm tra quyền chủ sở hữu, chặn truy cập chéo, dữ liệu sai định dạng, hai thiết bị sửa thẻ và gửi lại thao tác. Để chạy giao diện với emulator, khởi động `firebase emulators:start --only firestore,auth --project demo-beelearn`, phục vụ `dist` rồi mở localhost kèm `?emulator=1`. Chế độ này chỉ được bật trên localhost/127.0.0.1; không chạm dữ liệu thật.

## Lớp học

Thêm mục **Lớp học**: vai trò giáo viên/học sinh, tạo/tham gia/duyệt lớp, mã và link mời, giao bộ từ có thời hạn, bài riêng cho học sinh, dùng flashcard và hai game hiện có, thống kê/lịch sử kết quả, ôn từ khó và lưu trữ lớp. Học cá nhân vẫn độc lập.

API máy chủ cần hai biến Firebase Admin trong Vercel; xem [CLASSROOM_SETUP.md](CLASSROOM_SETUP.md). Nếu chưa cấu hình, trang lớp học báo chưa kích hoạt; các chức năng học cá nhân vẫn hoạt động. Không mở quyền Firestore để thay thế API.
