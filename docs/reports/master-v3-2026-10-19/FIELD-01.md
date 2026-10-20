# FIELD-01 — Hướng dẫn thử tại máy booth

**Trạng thái:** PREPARED / chờ người vận hành ghi kết quả. Người dùng xác nhận có thiết bị và hai người ngày 19/10/2026. Đây chưa phải bằng chứng đã chạy hay nghiệm thu.

**Sự cố đang điều tra:** Người dùng báo Pose dừng phản hồi ngay sau bật camera trên Chrome/Edge bên ngoài. Agent đã tái hiện với SDK thật và video tổng hợp. Chưa chạy benchmark cho đến khi lỗi khởi động được xử lý và xác nhận lại.

## Chuẩn bị

- Dùng bản đã vượt kiểm tra kỹ thuật; ghi Git HEAD và checksum từ báo cáo. Không xem thay đổi local là release được duyệt.
- Ghi model laptop, CPU/RAM/GPU/driver, Windows, phiên bản trình duyệt, camera thực tế và độ phân giải capture, TV/HDMI, mức zoom và chế độ nguồn. Tài liệu cũ ghi RAM 16GB và 32GB khác nhau: đo máy thực tế.
- Cắm sạc, đặt camera cố định; đánh dấu khoảng cách 1.5/2/2.5/3 m và vị trí hai người.
- Hai người tự nguyện tham gia. Không ghi hình theo mặc định. Chỉ quay video để đo latency khi có đồng ý rõ ràng; ghi nơi lưu, người truy cập và hạn xóa. Dùng mã người chơi thay tên trong CSV.
- Khởi động `npm run dev` rồi mở http://127.0.0.1:5173/ bằng Chrome/Edge. Khi kiểm tra bản đóng gói dùng `npm run build`, `npm run preview`, địa chỉ localhost được terminal in ra.

## Vòng thử an toàn trước benchmark

1. Thử bàn phím không bật camera: P1 A/D và giữ S, P2 Left/Right và giữ Down. Không được có yêu cầu camera trước opt-in.
2. Chọn Co-op, mở setup, chọn scheme P1 BOTH ARMS để thử trước. Đây là lựa chọn thử, chưa phải quyết định default booth.
3. Đứng cách khoảng 2 m, mỗi người ở một nửa **preview đã soi gương**. Đồng ý thông báo, bật camera, đợi model và hiệu chuẩn khi hai người đứng trung tính.
4. Từng người nghiêng trái/phải và thực hiện Catch. Đối chiếu nhãn P1/P2 với đúng robot. P1 scheme cần hai tay; P2 scheme cần một tay; H0 dùng pinch.
5. Một người rời khung khi đang Catch. Người mất tracking phải nhả Catch và dừng. Người còn liên tục được nhận diện chỉ được điều khiển robot của mình.
6. Hai người tiến gần, che khuất hoặc đổi chỗ. Điều khiển không được tự gán lại sau khi trở về. Đứng lại đúng vị trí và bấm CALIBRATE. Nếu chưa đủ điều kiện, dùng STOP CAMERA và bàn phím.
7. Thử V thu/mở PiP; kiểm tra nhãn trạng thái và STOP CAMERA vẫn dùng được. Thử rút camera; bàn phím phải phục hồi.

Nếu có điều khiển nhầm người, Catch bị giữ sau mất tracking, crash, hoặc lỗi worker: dừng vòng thử, ghi scheme/thời điểm/tình huống/trình duyệt và gửi lại. Không tiếp tục 10 vòng endurance khi còn lỗi chặn.

## Ghi số liệu cho G3

Sau vòng an toàn, thử H0/P1/P2 ở 1.5/2/2.5/3 m; điều kiện sáng bình thường trước, sau đó ngược sáng/thiếu sáng. Hai người hiện có đủ cho vòng kỹ thuật đầu tiên; nghiên cứu sở thích sáu người vẫn NOT RUN nếu chưa tuyển đủ.

- Điền `field-observations.csv` bằng quan sát thật. TP: Catch có chủ đích được nhận; FP: nhận Catch khi không có ý định; FN: có ý định nhưng không nhận. Precision = TP/(TP+FP), recall = TP/(TP+FN). Mẫu số bằng 0 ghi N/A.
- Điền `field-metrics.csv`; tách thời gian inference, tần số cập nhật, FPS render và latency cơ thể → robot. HUD inference ms không đo latency cơ thể.
- Không thể chứng minh <=250 ms bằng mắt thường. Dùng quan sát đồng bộ hoặc video có timestamp và đã được đồng ý. Ghi cả độ phân giải thời gian/phương pháp đo; chưa đo thì NOT RUN.
- Kiểm tra TV ở 3–4 m: timer, điểm, cảnh báo P1/P2, CALIBRATE/STOP CAMERA. Ảnh browser 1080p không thay thế thử TV thật.
- Kiểm tra khởi động lạnh với profile mới và mạng ngắt thật; H0 và Pose cần tải model/WASM từ localhost. Không suy ra offline PASS từ việc file tồn tại.
- Chỉ sau vòng an toàn mới chạy 10 round, mỗi round 60 giây, xen kẽ restart/đổi scheme/kết nối lại camera; nghỉ phù hợp giữa các lượt.

Ngưỡng từ master v3: không silent swap; neutral <=250 ms bắt buộc; precision >=90%, recall >=85% ở >=2 m; FPS render p5 >=45; latency cơ thể p95 <=200 ms là mục tiêu cần đánh giá trên máy thực tế. Không điền trước kết quả 0 swap.

## Quyết định G4

Chỉ chủ dự án chọn H0/P1/P2 hoặc NONE — RETEST / KEYBOARD ONLY sau khi có dữ liệu G3. Ghi người duyệt, ngày, bản build, phạm vi, giới hạn và lý do. Hai người thử không tự động tương đương nghiên cứu sáu người hay nghiệm thu booth.

Các ID trong CSV dùng namespace **MASTER-V3**, không trộn với FT-xx/G6 trong protocol CV-02 cũ. [Hợp đồng camera hiện tại](../../gameplay/camera-input-integration.md) ghi chính xác mapping và giới hạn anonymous tracking.
