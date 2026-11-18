# Ngữ pháp BeeLearning

## Sử dụng

**Ngữ pháp** trên thanh điều hướng mở thư viện: tìm theo tên/mô tả, lọc cấp độ A1–C1, chủ đề và tiến độ. Bản đầu cung cấp 10 bài hoàn chỉnh, 80 câu/bàn chơi đã biên soạn; không tạo bài rỗng cho các chủ đề chưa có. Cấp độ là thứ tự học gợi ý, không phải chứng nhận phân loại CEFR.

Mỗi bài có bảy phần đọc, bài luyện bốn dạng (trắc nghiệm, điền từ, tìm/sửa lỗi, viết lại câu), Xếp câu và Thám tử ngữ pháp. Xếp câu hỗ trợ kéo thả, chạm, hoàn tác và xếp lại. Độ khó đi theo bài đã chọn: A1/A2 dễ, B1 vừa, B2/C1 khó. Các câu và thứ tự hợp lệ được biên soạn sẵn; không tự ghép câu từ các từ bất kỳ.

Mở bài chỉ ghi nhận bắt đầu. Hoàn thành bài cần xác nhận cả bảy phần và đạt ít nhất 80% ở bài luyện tập. Hai trò chơi lưu lượt riêng. Câu trả lời có giải thích và những đáp án tương đương đã khai báo; chuẩn hóa khoảng trắng, chữ hoa, dấu nháy cong và dấu kết câu. Đây là bộ chấm theo đáp án giới hạn, không đánh giá mọi cách viết tiếng Anh tự do. Với viết lại câu, yêu cầu nêu rõ cấu trúc cần dùng.

**Hồ sơ cá nhân** có tổng hợp ngữ pháp riêng với số từ vựng: bài bắt đầu/hoàn thành, lượt luyện, chính xác, chủ đề cần ôn. Thư viện hiện lần học cuối và chính xác từng bài. Ôn tập gợi ý bài có lỗi hoặc đã hoàn thành nhưng lâu chưa luyện. Bài của giáo viên được giao xuất hiện để học sinh xem lại khi còn quyền truy cập lớp.

## Giáo viên và lớp học

Giáo viên vào **Ngữ pháp → Soạn bài học** để viết bảy phần, tạo các dạng câu hỏi, xem trước, lưu nháp và xuất bản. Mỗi khối câu có đề, đáp án (mỗi dòng một đáp án hợp lệ) và giải thích. Sửa lỗi chỉ rõ phần sai và phần thay thế. Xếp câu dùng khối ngăn bằng `|`; máy chủ kiểm tra mỗi đáp án phải dùng hết đúng các khối. Giáo viên chịu trách nhiệm rà soát ý nghĩa và tính đúng ngữ pháp của nội dung tự soạn. Bản nháp không đầy đủ vẫn lưu được; xuất bản kiểm tra đủ phần đọc, câu hỏi, lựa chọn, vị trí lỗi và đáp án.

Có thể liên kết một bộ từ đang sở hữu với bài tự soạn: từ hiện kèm bài, giáo viên chủ động dùng chúng trong ví dụ/câu hỏi. Không sinh câu ngẫu nhiên. Bài xuất bản dùng lại được trong nhiều lớp.

**Lớp học → Giao bài tập** mở form rút gọn: chọn nội dung và chọn nhanh hạn nộp rồi bấm Giao bài. Tên và hoạt động học được gợi ý sẵn; mọi cấu hình khác nằm trong Tùy chọn thêm. Dùng chính hệ thống bài tập hiện có. Chọn Từ vựng, Ngữ pháp hoặc Kết hợp; mỗi bài giao chọn một bộ từ và/hoặc một bài ngữ pháp, các hoạt động bắt buộc, người nhận, giờ bắt đầu, hạn nộp, mức chính xác và số lượt tối đa cho từng hoạt động (0 là không giới hạn). Muốn giao nhiều bài ngữ pháp, tạo các bài giao tương ứng. Mỗi hoạt động có trạng thái riêng; chỉ hoàn thành tổng khi mọi yêu cầu đều đạt. Giữ hành vi nộp muộn của hệ thống cũ và đánh dấu kết quả muộn.

Thống kê giáo viên hiển thị kết quả học sinh, độ chính xác hoạt động, số học sinh/lượt sai từng chủ đề và lịch sử từng lượt. Lịch sử ngữ pháp mới có câu trả lời đã nộp. Chỉ giáo viên lớp hoặc chính học sinh được xem; không cung cấp lịch học cá nhân không liên quan.

## Lưu trữ, quyền và phiên bản

- Dùng Firebase Auth và `/api/classroom` hiện tại; không cần cấu hình dịch vụ hay biến môi trường mới.
- Định nghĩa hệ thống ở `server/grammar-curriculum.js`, tách khỏi tiến độ.
- `grammarLessons/<id>` lưu chủ sở hữu, bản nháp và bản xuất bản; `versions/<version>` lưu phiên bản bất biến. Bài giao giữ snapshot đầy đủ tại document assignment hiện có. Sửa hoặc xuất bản lại không thay đổi bài giao/lượt làm đã bắt đầu.
- `grammarProgress/<uid>/lessons/<id>` lưu phần đã học, kết quả, lỗi thường gặp và ngày học. `grammarAttempts/<id>` lưu snapshot lượt học, trạng thái, câu trả lời và phản hồi để gửi lại không cộng trùng. ID lượt dựa trên UID và request ID; mỗi câu nộp một lần trong một lượt.
- Máy chủ xác minh token, quyền lớp, đối tượng nhận bài, thời gian mở, giới hạn lượt, quyền giáo viên và quyền sở hữu nội dung. Điểm do máy chủ tính; client chỉ gửi câu trả lời hoặc thứ tự khối. Các API lấy bài, thư viện, bắt đầu và câu tiếp theo loại đáp án/giải thích riêng của câu chưa nộp.
- Quy tắc Firestore mặc định chặn toàn bộ đọc/ghi trực tiếp các collection ngữ pháp. Chỉ API Admin truy cập chúng. Không mở rộng rules hoặc cho học sinh sửa đáp án/tiến độ.
- Câu luyện được chấm ghi vào collection ngày học `users/<uid>/activity` hiện có, đồng thời cập nhật tín hiệu đồng bộ để header và thiết bị khác tải lại. Mở bài và chỉ đọc không tăng chuỗi. Chuỗi tiếp tục theo ngày Việt Nam.
- Thêm dữ liệu khi có thao tác thật, không seed lịch sử cá nhân, không reset dữ liệu cũ, không thay bộ từ hoặc trò chơi từ vựng.

## Kiểm tra

Chạy Auth/Firestore emulator với project `demo-beelearn`, sau đó:

```sh
npm run build
npm test
npm run test:firebase
npm run test:classrooms
npm run test:profile
npm run test:grammar
```

`test:firebase` xóa dữ liệu **emulator** để kiểm tra rules; không chạy trên Firebase thật. Kiểm tra ngữ pháp tạo tài khoản riêng trên emulator: nội dung/đáp án, sáu dạng tương tác, tiến độ thật, chấm phía máy chủ, gửi lại, cách ly người dùng, draft/publish, snapshot, bài kết hợp, giờ mở, giới hạn lượt và thu hồi thành viên.

## Tham khảo quy tắc

Phần giải thích tiếng Việt và câu thực hành được viết riêng; mỗi bài hệ thống có đường dẫn nguồn đối chiếu British Council LearnEnglish. Các nguồn chính:

- [Present Simple](https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2/present-simple)
- [Conditionals](https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/conditionals-zero-first-second)
- [Third and Mixed Conditionals](https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/conditionals-third-mixed)
- [Comparisons](https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/comparative-superlative-adjectives)
- [Participle Clauses](https://learnenglish.britishcouncil.org/free-resources/grammar/c1/participle-clauses)
- [Emphasis, Cleft Sentences and Inversion](https://learnenglish.britishcouncil.org/free-resources/grammar/c1/emphasis-cleft-sentences-inversion-auxiliaries)
