# BeeLearn

Ứng dụng học từ vựng tiếng Anh với flashcard, ôn tập cách quãng và hai trò chơi. Giao diện tiếng Việt, hỗ trợ máy tính và điện thoại.

## Tính năng

- Flashcard có hình minh họa, phiên âm, ví dụ và phát âm bằng Web Speech API.
- Học thẻ, tự kiểm tra và ôn các từ đến hạn.
- Lật thẻ chọn nghĩa và bắn từ vựng bằng Canvas.
- Tạo/sửa bộ từ, thêm từ và nhập CSV/JSON.
- Lưu tiến độ, thống kê và bản sao lưu JSON.
- Thanh điều hướng cố định trên mọi màn hình.

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

Phiên bản hiện tại không cần biến môi trường và chưa kết nối Firebase.

## Dữ liệu và Firebase

- Bộ từ mẫu: `public/seed.json` (30 từ IT trong Day 1).
- Bộ từ và tiến độ được lưu bằng `localStorage`, khóa `nho-tu-v1`.
- Dữ liệu trên tên miền `chatgpt.site` không tự chuyển sang tên miền Vercel. Trước khi đổi trang, bấm **Sao lưu** ở trang cũ. Trên trang mới, vào **Quản lý → Nhập CSV / JSON** và nhập bản sao lưu để khôi phục.
- Firebase Authentication / Firestore chưa được tích hợp. Có thể thêm khi có project Firebase và quy tắc truy cập phù hợp.
- Không commit service-account key, private key hoặc file `.env` vào repo.

## Cấu trúc

```text
src/                 TypeScript: flashcard, tiến độ, dashboard, điều hướng, games
public/              HTML, CSS, hình minh họa và bộ từ mẫu
scripts/build.mjs    Sao chép public và biên dịch TypeScript
dist/                Kết quả build, không đưa lên Git
vercel.json          Cấu hình deploy
test.mjs             Kiểm tra lịch ôn và CSV
game-test.mjs        Kiểm tra đáp án, va chạm và bố cục mục tiêu
```

Sửa file trong `src/` hoặc `public/`, sau đó chạy lại `npm run build`. Không sửa trực tiếp các file trong `dist/`.
