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

## Học ngữ pháp

Mục **Ngữ pháp** bổ sung thư viện A1–C1, bài học tương tác, luyện tập, Xếp câu và Thám tử ngữ pháp. Tiến độ lưu riêng theo tài khoản và xuất hiện trong Hồ sơ. Giáo viên soạn/xuất bản bài và giao bài ngữ pháp hoặc kết hợp từ vựng qua lớp hiện có. Xem [GRAMMAR.md](GRAMMAR.md) để biết cách dùng, mô hình dữ liệu, phiên bản và kiểm tra.

## Hồ sơ cá nhân và điều hướng

Thanh đầu trang giữ bốn mục Tổng quan, Học tập, Thư viện và Lớp học. Học tập chứa học thẻ, kiểm tra, ôn tập và trò chơi; menu ⋯ chứa nhập từ/sao lưu. Bấm avatar → **Hồ sơ cá nhân** để mở `/profile`. Menu tài khoản vẫn có đồng bộ và đăng xuất.

Hồ sơ dùng API Firebase Admin hiện có, xác định chủ hồ sơ bằng token đăng nhập. `personalProfiles/<uid>` lưu tên, username duy nhất, giới thiệu tối đa 160 ký tự và avatar; `profileUsernames/<username>` đặt chỗ tên bằng transaction. Client không được ghi trực tiếp các collection này; vai trò lấy từ hệ thống lớp học và không sửa qua hồ sơ. Ngày tham gia lấy từ Firebase Auth. Tài khoản mới không có lịch học, lớp hay bộ từ mẫu.

Ảnh JPEG/PNG/WebP tối đa 5 MB được cắt vuông, thu nhỏ 256 px và chuyển sang JPEG trước khi lưu cùng hồ sơ trong Firestore (tối đa 100 KB); máy chủ kiểm tra định dạng và kích thước ảnh. Không cần dịch vụ lưu trữ mới. Có xem trước, hủy thay đổi và khôi phục ong mặc định.

Thống kê dùng lượt ôn, kết quả từ và bài tập thực tế, đếm từ và bài hoàn thành không trùng. Lớp học tái sử dụng quyền và dữ liệu lớp hiện có. Chuỗi học tính theo ngày lịch `Asia/Ho_Chi_Minh`: đánh giá flashcard hoặc hoàn tất trò chơi mới ghi ngày học; đăng nhập, xem thẻ hay bắn trúng một từ trong trò chơi chưa hoàn tất không tăng chuỗi. Giữ nguyên lịch sử đã lưu trước bản cập nhật.

Sau khi khởi động Auth/Firestore emulator với project `demo-beelearn`, chạy `npm run test:profile` để kiểm tra lưu hồ sơ, tên trùng, quyền sở hữu, vai trò, ảnh, ngày học và số liệu lớp. Các kiểm tra chỉ chạy trên emulator; không tạo tài khoản thử hay xóa dữ liệu production.

## Giao bài nhanh

Giáo viên bấm **Giao bài** ngay trên thẻ lớp, chọn nội dung và hạn nộp rồi giao trực tiếp. Form tự điền tên, chọn hoạt động phù hợp và mặc định giao cả lớp; lịch, điểm tối thiểu, số lượt, người nhận riêng và các trò chơi nằm trong **Tùy chọn thêm**. Dữ liệu vẫn dùng API bài tập hiện có. `npm run test:assignment` kiểm tra mặc định, bài kết hợp, người nhận, hạn nộp và giữ snapshot bài ôn từ khó.

## Trang chủ, nhập từ và buổi học hằng ngày

Trang chủ hiển thị theo vai trò đã lưu: giáo viên có lớp, tiến độ bài giao và nút thêm nội dung/giao bài; người học có buổi học đề xuất, bài cần làm, ngữ pháp và thư viện cá nhân. Số liệu lấy từ tài khoản và quyền lớp hiện có; tài khoản mới không được thêm từ hay lịch sử mẫu.

**Nhập từ** hỗ trợ dán bảng từ Excel/Google Sheets, CSV/TSV và file `.xlsx` nhiều trang tính. Có xem trước, chọn cột, sửa từ/nghĩa, bỏ dòng và chọn bộ đích trước khi lưu. Giới hạn file 8 MB, tối đa 500 từ mỗi bộ; dòng lỗi phải được sửa, từ trùng được bỏ qua, công thức Excel không được thực thi. File được phân tích ngay trong trình duyệt; chỉ các thẻ đã xác nhận được đồng bộ. Sao lưu JSON cũ vẫn được hỗ trợ.

**Buổi học hằng ngày** ưu tiên từ khó đến hạn, thêm từ mới và một bài luyện ngữ pháp phù hợp. Có thể tải lại hoặc quay về trang chủ rồi tiếp tục đúng vị trí. Kết quả từ dùng cùng lịch ôn và chuỗi học hiện có; điểm ngữ pháp được chấm bằng API hiện có. Tự học không tự hoàn thành bài tập lớp hay đánh dấu đã đọc toàn bộ bài ngữ pháp.

API `dashboardGet` và `daily*` dùng token đăng nhập. Phiên được lưu riêng ở `learningSessions/<uid>` qua máy chủ; client không được đọc/ghi trực tiếp collection này. Không cần mở rộng Firestore rules. Cần Firebase Admin đã cấu hình như phần lớp học.

Kiểm tra mới: `npm run test:import`, `npm run test:learning` và `npm run test:home` (lệnh cuối cần Auth/Firestore Emulator). Bộ kiểm tra bao gồm file Excel thật dạng ZIP/XML, chọn từ ôn, tiếp tục phiên, gửi lại thao tác, quyền chủ sở hữu và tính độc lập với bài tập lớp.

## Hệ thống giao diện

Giao diện dùng cùng màu xanh, nền sáng, thẻ viền mảnh và icon SVG cho các màn hình. Trang chủ chia nội dung chính và nhịp học/lối tắt thành hai cột trên máy tính, một cột trên điện thoại. Thanh điều hướng chính cố định; chọn bộ từ chỉ hiện khi học từ, chơi game hoặc mở thư viện. Dữ liệu và tiến độ vẫn dùng các luồng hiện có.

Các stylesheet `refresh.css`, `workspace-refresh.css`, `practice-refresh.css` và `entry-refresh.css` được nạp sau CSS cũ, lần lượt phụ trách hệ thống chung/trang chủ, lớp-ngữ pháp-hồ sơ, học từ-trò chơi và trang giới thiệu-đăng nhập. Không thay kích thước vật lý hoặc cách chấm điểm trong màn chơi. Đã kiểm tra các trang với dữ liệu giả trên Firebase Emulator ở kích thước máy tính và điện thoại 390px.

Cuộn và tải trang: `motion.css` mở rộng bố cục màn hình lớn, nền trang trí nhẹ, cột nhịp học bám theo trang và smooth scroll gốc của trình duyệt. `src/loading.ts` cung cấp skeleton theo màn hình, thông báo tải cho trình đọc màn hình và chuyển cảnh ngắn chỉ khi đổi màn/tải xong; không chạy lại khi gõ biểu mẫu. Chuyển động tắt theo `prefers-reduced-motion`. Không thêm độ trễ giả hoặc chặn cuộn chuột/cảm ứng.

## Lịch dạy và tài liệu lớp học

Giáo viên mở **Lịch dạy theo tuần** từ trang chủ hoặc danh sách lớp. Có lọc lớp, tuần trước/sau, thêm lịch đơn hoặc lặp 2/4/8/12 tuần, sửa từng buổi, đánh dấu đã dạy và hủy/khôi phục. Giờ nhập theo Việt Nam (UTC+7). Máy chủ kiểm tra trùng giờ giữa tất cả lớp của cùng giáo viên bằng transaction; buổi đã hủy giải phóng khung giờ. Học sinh xem lịch trong lớp đã tham gia, không sửa lịch.

Trong lớp, **Tài liệu & Video** nhận link HTTPS của giáo trình, Drive, YouTube, Vimeo hoặc file MP4/WebM. Giáo viên đặt chương/chủ đề, thứ tự, mô tả và bản nháp/xuất bản; có sửa, ẩn và gỡ mềm. Video hỗ trợ nhúng từ YouTube/Vimeo hoặc trình phát HTML cho link file trực tiếp, luôn có link mở bản gốc. Quyền của file/video tại dịch vụ gốc phải được giáo viên cấp cho học sinh. Theo lựa chọn hiện tại, chưa dùng Firebase Storage và chưa tải file/video trực tiếp lên BeeLearning.

Học sinh chỉ thấy nội dung xuất bản của lớp đang tham gia, tự đánh dấu đã học. Giáo viên xem từng học sinh đã xác nhận; đây không phải đo thời lượng xem video hay điểm kiểm tra. Thay link nội dung tạo phiên bản tiến độ mới. Chức năng này không tự hoàn thành bài tập hay tăng chuỗi học.

API `teaching*` dùng cùng xác thực Firebase Admin và kiểm tra chủ lớp/thành viên. Dữ liệu nằm ở `teachingSessions` và `classrooms/<id>/resources`, client không được đọc/ghi Firestore trực tiếp. Không cần mở quyền Firestore mới. Đường dẫn `#classrooms/<id>/<tab>` giữ đúng mục đang xem sau khi tải lại. `npm run test:teaching` chạy trên Auth/Firestore Emulator, kiểm tra quyền, bản nháp, lịch trùng/lặp, gửi lại, cập nhật đồng thời, tiến độ và thu hồi tư cách thành viên.

## Buổi học có nội dung, kiểm tra cuối bài và việc hôm nay

Khi tạo/sửa một buổi trên lịch, giáo viên chọn tài liệu/video và bài tập đã có của đúng lớp. Liên kết được lưu cùng buổi học (kể cả khi lặp tuần). Học sinh mở buổi học để vào đúng bài giảng hoặc bài tập; bản nháp và bài giao riêng cho người khác được lọc trên máy chủ.

Mỗi bài giảng có thể kèm 3–5 câu trắc nghiệm, 4 lựa chọn/câu, một đáp án đúng, giải thích và ngưỡng đạt do giáo viên đặt. Đáp án nằm trong tài liệu Firestore riêng tư, không gửi trong danh sách hay đề của học sinh. API chấm điểm trên máy chủ, lưu kết quả theo UID/phiên bản, xử lý gửi lại và giữ điểm tốt nhất. “Đã đọc/xem” là xác nhận cá nhân; với bài có kiểm tra, chỉ kết quả đủ điểm mới tính đạt. Đổi nội dung/link/câu hỏi/ngưỡng điểm tạo phiên bản mới và không dùng điểm cũ cho nội dung mới. Bài làm dở giữ lựa chọn trong sessionStorage của trình duyệt hiện tại theo tài khoản và phiên bản.

Trang chủ học sinh ưu tiên **Việc cần làm hôm nay** khi có nội dung từ lớp: lịch hôm nay, bài chưa đạt, bài tập còn thiếu/quá hạn, bài giảng cần chuẩn bị. Có nút mở trực tiếp đúng nội dung; bài đã đạt được loại khỏi danh sách, bài tập lớp vẫn có kết quả riêng. Mục tự học cá nhân vẫn giữ nguyên và thu gọn bên dưới khi đang có việc từ lớp. Các bài sắp mở hiển thị thời gian mở và không cho bắt đầu sớm.

`npm run test:flow` (Auth/Firestore Emulator) kiểm tra liên kết theo lớp, mục tiêu người nhận, giữ kín đáp án, chấm điểm thật, gửi lại, phân biệt đã xem/đã đạt, đổi phiên bản, ẩn bài và thu hồi thành viên. Không cần thay Firestore rules hay dịch vụ lưu trữ. File/video tiếp tục dùng link như lựa chọn hiện tại.
