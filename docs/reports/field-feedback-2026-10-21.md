# FIELD-01 — Phản hồi chơi thử ngày21/10/2026

**Evidence class: USER-REPORTED / QUALITATIVE. Chưa phải benchmark hoặc nghiệm thu gate.**

## Môi trường do người dùng mô tả

- Laptop Dell Vostro5510, CPU Intel Corei5 thế hệ11. Người dùng nhớ model gần với11320H; SKU cụ thể chưa xác minh.
- Revision thực tế được chơi, browser/version, CPU/GPUdelegate, camera/capture resolution, khoảng cách, ánh sáng và số người chơi: chưa xác nhận.
- HEAD của checkout dùng để phân tích phản hồi: `e850a9c80449efa16c4f802b7bd7fd6e464ed4b8`. Không suy ra đây là revision đã được người dùng chơi thử.

## Quan sát người dùng báo

- Có kiểm tra lại; hệ thống ổn định hơn lần trước nhưng còn nhạy với việc mất vai/ra khỏi khung hình.
- Pose One Arm và Pose Two Arm đều hoạt động khá tốt ở gần camera; bắt năng lượng rõ hơn và chuyển động mượt hơn.
- Khi vai hơi ra ngoài khung, xuất hiện trạng thái không nhận thấybody.
- Khi đứng xa, mô tả khung đầu đến nửa thân, có khó khăn bắt đầu/giữ tracking và thông báo BODY FOUND / CALIBRATE. Sau vài lần hiệu chỉnh có thể bắt được. Chưa đủ thông tin phân biệt calibration thất bại với tracking mất ngay saucalibration.
- Sau mấtbody phải bấm hiệu chuẩn lại. Người dùng cần tự hiệu chuẩn/phục hồi để vận hành booth không cần người đứng bấm liên tục.
- Người dùng sẵn sàng cung cấp dữ liệu chuyển động hoặc chuyển thiết bị để hỗ trợ kiểm chứng.

Pose One Arm/Two Arm là hai scheme cử chỉ, không chứng minh đã test hai người/Co-op. Không có số đo precision/recall, latency, FPS, số lầnmấttracking hay khoảng cách được ghi nhận. Không nângG2/G3 hoặc chọn schemebooth từ phản hồi này.

## Kết quả đọc code, tách khỏi quan sát vật lý

[Hợp đồng hiện tại](../gameplay/camera-input-integration.md) chủ động yêu cầu calibration mới sau mất liên tục/association; không tự khôi phụcslot. Mapper vẫn neutralizeinput khi mất tracking hoặc samplequáhạn250ms. Candidatepreview có thể nhìn thấybody trong khi điều khiển vẫn đangkhóa.

Trong [adapter](../../src/adapters/mediapipe-pose-input-adapter.ts), trạng thái READY_TO_CALIBRATE cần samplecònmới, bodycount/shoulder/position hợp lệ cho calibration. Vì vậy thông báo BODY FOUND / CALIBRATE tự nó chưa chứng minh model không detectbody.

[Mapper](../../src/adapters/pose-input-mapper.ts) kiểm tra hai vai và confidence; shoulderwidth tối thiểu0.04 theo normalizedpreviewwidth. CPUcapture có giới hạnlongedge320px. Vai mất, body nhỏ ở xa, confidence thấp hoặc samplemuộn đều là giả thuyết cần đo, chưa được gán nguyên nhân từ phản hồi.

## Yêu cầu mới và thông tin còn thiếu

Người dùng yêu cầu giảm phụ thuộc nút CALIBRATE bằng tự hiệu chuẩn/phục hồi. Đây là thay đổi mong muốn so với hợp đồngmanual hiện tại, chưa được implement trong ghi nhận này. Cần xác định phạm viSolo/Co-op và hành vi booth khi người khác thay người chơi trước khi chốt association/recoverypolicy. Không thể coi người quay lại là cùng người chỉ từ skeletonẩn danh.

Đã hỏi người dùng:

1. Tự hiệu chuẩn choSolo trước hay cảSolo/Co-op?
2. Ở xa, saubấmCALIBRATE thì không đủ3/3, timeout, hay hiệu chuẩn xong rồi nhanh chóngmấtlại? Khoảng cách và delegateHUD nếu có.

Khi có dữ liệu bổ sung, thử tách detection, samplefreshness, calibrationstability và associationloss theo [FIELD-01](master-v3-2026-10-19/FIELD-01.md). Không yêu cầu thayGPU ngay; tái hiện trên chínhmáyDell giúp xác định vấn đề thực tế tốt hơn trước.

## Kiểm chứng ghi nhận

Documentation-only: xác nhậnlinks nội bộ và SHA-256của cácnguồn trước/sau ghi nhận. Runtime/build/tests: NOT RUN, không thaycode. Independent evaluation: NOT RUN. Self-review: phân biệt lời người dùng, quan sát source và giả thuyết chưa đo. Không commit/push trong bướcghi nhận này.

## Người dùng làm rõ sau ghi nhận

- Phạm vi được chọn: **Solo trước, giữ Co-op thủ công**.
- Khi ở xa: **hiệu chuẩn xong và chơi được**. Không ghi nhận đây là lỗi khôngthểdetectbody ởxa; nguyênnhân camera/model vẫn chưa được đo.
- Triển khai phục hồi Solo được theo dõi riêng trong [báocáo](solo-pose-recovery-2026-10-21/REPORT.md). Các phần “chưa implement/còn thiếu” phía trên mô tả thời điểm ghi nhận ban đầu. Phản hồi định tính không thay đổi thành benchmark hoặc gatePASS.
