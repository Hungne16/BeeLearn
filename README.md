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

## Luồng vào trang và dữ liệu tài khoản

Khách thấy landing page; `#demo` dùng năm từ công khai và game có sẵn, chỉ giữ trong bộ nhớ. `#login`/`#register` dùng Google đăng nhập/đăng ký, có chuyển cảnh giữa hai chế độ. App trước đây chưa có form email/password hoặc hình ong riêng; giao diện mới bổ sung hai panel tương ứng và minh họa ong.

Tài khoản mới luôn bắt đầu rỗng, không đọc `seed.json` và không tự nhập dữ liệu khách. Cache vẫn tách theo UID; tài khoản cũ giữ dữ liệu và hàng đợi. Dữ liệu cũ ở `nho-tu-v1` được giữ nguyên để chủ dữ liệu chủ động xác nhận nhập từ mục Tài khoản. Không xóa dữ liệu Firestore để xử lý lỗi seed.

App hỗ trợ đường dẫn `/dashboard`, `/decks`, `/games`, `/classrooms`, `/assignments`, `/profile`, `/demo`, `/login`, `/register` và điều hướng hash tương ứng. Khách vào đường dẫn riêng được đưa đến đăng nhập; có trạng thái kiểm tra phiên và tải tài khoản. Onboarding rút gọn nằm ở dashboard trống và có thể mở lại bằng Tổng quan; nút lớp học theo vai trò đã lưu.

Kiểm tra UI bằng Firebase Emulator: khách không thấy Day 1; cả hai demo game chạy; tạo A sau demo vẫn rỗng; A tạo bộ và học thẻ; đăng xuất về landing; B bắt đầu rỗng không thấy A; đăng nhập lại A khôi phục bộ và tiến độ; vai trò giáo viên vẫn có nút tạo lớp. Không tạo tài khoản thử trên project thật.

## Form đăng nhập và đăng ký

Hai form nằm trong cùng một scene SVG và cùng tồn tại trong DOM. Khung ong và khung form đổi chỗ bằng transform trong 760ms; nút chuyển bị khóa khi đang trượt, form ẩn dùng inert để không nhận focus. Bản điện thoại thu gọn minh họa; reduced-motion tắt chuyển động.

Email/password dùng Firebase Auth có thật: remember-me chọn local/session persistence; quên mật khẩu gọi email reset; đăng ký cập nhật tên và gọi API máy chủ để lưu vai trò. Không tự tạo bộ mẫu. Google vẫn có sẵn. Vai trò chưa gửi thành công được giữ riêng theo UID để thử lại khi đăng nhập; quyền lớp vẫn do máy chủ kiểm tra.

Đã thử trên emulator: sai xác nhận mật khẩu, sai mật khẩu đăng nhập, đăng ký giáo viên, thư viện mới trống, vai trò đúng và đăng nhập lại với phiên tạm.

## Hồ sơ cá nhân và điều hướng

Thanh đầu trang giữ bốn mục Tổng quan, Học tập, Thư viện và Lớp học. Học tập chứa học thẻ, kiểm tra, ôn tập và trò chơi; menu ⋯ chứa nhập từ/sao lưu. Bấm avatar → **Hồ sơ cá nhân** để mở `/profile`. Menu tài khoản vẫn có đồng bộ và đăng xuất.

Hồ sơ dùng API Firebase Admin hiện có, xác định chủ hồ sơ bằng token đăng nhập. `personalProfiles/<uid>` lưu tên, username duy nhất, giới thiệu tối đa 160 ký tự và avatar; `profileUsernames/<username>` đặt chỗ tên bằng transaction. Client không được ghi trực tiếp các collection này; vai trò lấy từ hệ thống lớp học và không sửa qua hồ sơ. Ngày tham gia lấy từ Firebase Auth. Tài khoản mới không có lịch học, lớp hay bộ từ mẫu.

Ảnh JPEG/PNG/WebP tối đa 5 MB được cắt vuông, thu nhỏ 256 px và chuyển sang JPEG trước khi lưu cùng hồ sơ trong Firestore (tối đa 100 KB); máy chủ kiểm tra định dạng và kích thước ảnh. Không cần dịch vụ lưu trữ mới. Có xem trước, hủy thay đổi và khôi phục ong mặc định.

Thống kê dùng lượt ôn, kết quả từ và bài tập thực tế, đếm từ và bài hoàn thành không trùng. Lớp học tái sử dụng quyền và dữ liệu lớp hiện có. Chuỗi học tính theo ngày lịch `Asia/Ho_Chi_Minh`: đánh giá flashcard hoặc hoàn tất trò chơi mới ghi ngày học; đăng nhập, xem thẻ hay bắn trúng một từ trong trò chơi chưa hoàn tất không tăng chuỗi. Giữ nguyên lịch sử đã lưu trước bản cập nhật.

Sau khi khởi động Auth/Firestore emulator với project `demo-beelearn`, chạy `npm run test:profile` để kiểm tra lưu hồ sơ, tên trùng, quyền sở hữu, vai trò, ảnh, ngày học và số liệu lớp. Các kiểm tra chỉ chạy trên emulator; không tạo tài khoản thử hay xóa dữ liệu production.
