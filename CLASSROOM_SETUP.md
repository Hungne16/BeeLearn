# Kích hoạt lớp học trên BeeLearn

Code lớp học dùng Firebase Authentication hiện có, Firestore hiện có và API Vercel `/api/classroom`. Các màn học cá nhân và trò chơi không bị thay thế. Không cần triển khai Firebase Cloud Functions.

## Bước còn cần trên project thật

Vercel hiện chưa có biến môi trường. API cần thông tin xác thực Firebase Admin **ở máy chủ**, khác với cấu hình Web SDK công khai.

1. Mở Firebase project `beelearn-1079b` → Project settings → Service accounts → Firebase Admin SDK.
2. Chủ tài khoản tự tạo/tải thông tin xác thực máy chủ. Đây là khóa bí mật; không gửi vào chat, không commit Git và không đưa vào thư mục `public`.
3. Trong Vercel project `beelearning` → Environment Variables → Production, thêm:

| Tên biến | Giá trị từ thông tin xác thực Firebase |
| --- | --- |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Trường `client_email` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Toàn bộ trường `private_key`, giữ phần BEGIN/END và xuống dòng; có thể dùng chuỗi có `\n` |

Đặt private key ở dạng Secret/Sensitive nếu Vercel cung cấp lựa chọn. Không thêm tiền tố PUBLIC/VITE. Project được cố định trong code là `beelearn-1079b` để tránh ghi nhầm project.

4. Redeploy bản mới nhất sau khi thêm biến. Biến môi trường mới không áp dụng cho deployment đã build trước đó.
5. Dùng hai tài khoản Google khác nhau để kiểm tra: giáo viên chọn vai trò → tạo lớp → giao bài; học sinh chọn vai trò → nhập mã → học; giáo viên xem Thống kê.

Liên kết cài đặt:
- Firebase: https://console.firebase.google.com/u/0/project/beelearn-1079b/settings/serviceaccounts/adminsdk
- Vercel: https://vercel.com/vumanhhung03012004-6233s-projects/beelearning/settings/environment-variables

Nếu dùng service account riêng, chỉ cấp quyền cần cho Firestore (Cloud Datastore User); không cấp Owner/Editor chỉ để chạy API này. Thu hồi/luân chuyển khóa theo quy trình quản trị của bạn. Không dùng khóa người khác hoặc token phiên trình duyệt để thay thế.

## Phân quyền và dữ liệu

- `classroomProfiles/{uid}`: vai trò chọn lần đầu, chỉ máy chủ ghi.
- `classrooms/{classId}` và các nhánh `members`, `assignments`, `assignments/{assignmentId}/results/{uid}`: lớp, thành viên, bài tập và kết quả.
- `classCodes/{code}`: mã mời ngẫu nhiên, có thể đổi/vô hiệu hóa.
- `classEnrollments/{hash}`: một đăng ký duy nhất cho mỗi cặp lớp–học sinh.
- `classAttempts/{attemptId}/events/{eventId}`: lượt học và mã câu trả lời để chống ghi trùng.
- Các collection mới bị Firestore Rules hiện tại từ chối truy cập trực tiếp từ trình duyệt. **Không mở rules allow-all.** Mọi truy cập đi qua API xác minh Firebase ID token, quyền sở hữu lớp, tư cách thành viên và người nhận bài.
- Đề bài giữ bản sao từ vựng tại thời điểm xuất bản. Chỉnh bộ gốc không đổi bài đã giao.
- Client không được ghi cờ hoàn thành, độ chính xác hoặc điểm. Máy chủ kiểm tra câu trả lời trong bộ từ của lượt học, tính tiến độ, số đúng/sai, điểm, độ chính xác và thời điểm hoàn thành. Flashcard là tự đánh giá nhớ/chưa nhớ; đây không phải hệ thống thi có giám sát/chống gian lận trình duyệt.
- Mỗi game được máy chủ chọn ngẫu nhiên tối đa 8/12/20 từ theo cấu hình giáo viên, dùng lại game có sẵn ở độ khó Khó (3 mạng cho Shooter). Hoàn thành đủ từ trong lượt và đạt ngưỡng mới qua hoạt động. Các lần làm chưa đạt vẫn có trong lịch sử.
- Bài nộp sau hạn vẫn học được và đánh dấu hoàn thành muộn. Lớp lưu trữ chỉ đọc: không nhận thành viên/lượt học/kết quả mới.
- Học cá nhân không làm tăng tiến độ bài tập. Học bài được giao vẫn tăng nhịp học cá nhân nhưng kết quả bài nằm ở collection lớp riêng.
- Hàng đợi câu trả lời trên trình duyệt chỉ là cơ chế thử gửi lại khi mất mạng. Lớp, bài tập và kết quả chính thức nằm trên Firestore. Cần có mạng để bắt đầu lượt học mới.
- Bài mới/nhắc hạn hiển thị trong lớp; danh sách tự cập nhật mỗi 30 giây và khi quay lại tab. Không gửi email hay thông báo trình duyệt ngoài ý muốn.
- Vai trò lớp học được chọn một lần. Giáo viên và học sinh đều giữ toàn bộ học cá nhân. Giáo viên chỉ quản lý lớp họ tạo.

## Chạy và kiểm thử cục bộ

```sh
npm ci
npm run build
npm test
firebase emulators:start --only firestore,auth --project demo-beelearn
```

Ở terminal khác, trong repo:

```sh
npm run test:firebase
npm run test:classrooms
node scripts/serve.mjs --emulator
```

Mở `http://127.0.0.1:5181/?emulator=1`. Chế độ emulator của frontend chỉ được phép trên localhost; API chỉ bật emulator khi chạy local, không phải Vercel. Bài test xóa dữ liệu **chỉ trong Firestore Emulator demo-beelearn**, không đụng project thật.

Đã kiểm tra: vai trò và token, quyền chủ lớp, chặn người ngoài, duyệt/tham gia trùng, giao riêng, giữ bản từ vựng, chống nộp trùng, từ ngoài đề, finish giả không có đáp án, độ chính xác không đạt, lịch sử riêng tư, đổi mã, gỡ thành viên, lưu trữ; toàn bộ kiểm tra học cá nhân/lịch ôn/game/giữ chuỗi vẫn chạy.
