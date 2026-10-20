# Master plan v3 — Báo cáo thực hiện 19/10/2026

**Baseline:** `3e4a80d52ae52d0d6e0d0c17691242546f03c192`, `main`, remote `https://github.com/fudever-club/Reactor_Rush.git`; working tree sạch lúc bắt đầu. Thay đổi hiện tại là local, chưa commit/push/release.

**Cập nhật20/10 mới nhất:** [Nút Pose calibration](POSE-CALIBRATION-UX-2026-10-20.md) đã triển khai theo duyệt của người dùng: bấm một lần, checklist, chờ8giây/3mẫu ổn định, hủy rõ ràng và START chờ frame mới.147/147 tests, build, review độc lập55/55 và8/8browserUI PASS. Bốn luồng720p có Catch/hiệu chuẩn lại PASS; luồng1080p đầy đủ vẫn timeout do freshness, không được đóng bằng UI-only PASS. Chưa nghiệm thu webcam thật trên revision nút mới.

**Checkpoint Pose trước thay đổi nút:** [Preview và khôi phục điều khiển](POSE-RECOVERY-FIX.md): skeleton vàng đã được người dùng xác nhận hiện lại, nhưng lượt đầu chưa điều khiển tiếp. Đã sửa thêm lỗi khóa vĩnh viễn khi chỉ chờ kết quả: input quá250ms vẫn neutral; chỉ mất liên kết giữa các lần chụp hoặc mất người thật sự mới bắt hiệu chuẩn lại. 136/136 tests, build và reviewer68/68 PASS. Browser cuối P1 Solo1280 PASS, P2 Solo1280 timeout; sáu hàng còn lại chưa chạy. Đang chờ người dùng thử điều khiển trên bản sửa sau cùng.

**Cập nhật Hand mới nhất:** [Sensitivity, zones và hiệu chuẩn lại](HAND-MOVEMENT-FIX.md) đã triển khai theo duyệt của người dùng: MOVE DISTANCE 3–15% (mặc định8%), LEFT–STOP–RIGHT, chặn hiệu chuẩn sát mép và Solo nhiều tay, CALIBRATE trong ván. 121/121 tests, build và hai browser movement scenarios PASS; reviewer riêng50/50 PASS. Người dùng đã xác nhận trên webcam thật: “Đã đi trái/phải và dừng đúng”; nghiệm thu chức năng hai chiều/STOP của lượt sửa này PASS. [Lượt sửa treo Hand trước](HAND-FREEZE-FIX.md) đã được người dùng xác nhận di chuyển/Catch; kết quả đó không thay nghiệm thu hai chiều mới. CPU/Pose/Co-op gates vẫn mở.

**Kết quả checkpoint trước:** STAB-00 đã chạy baseline và bảo toàn nguồn. STAB-01 đã triển khai local, nhưng G1/G2 chưa đóng. Video người dùng xác nhận Pose nhận được người nhưng frame chậm khiến hiệu chuẩn chập chờn; H0 cũng báo mất phản hồi khoảng giây 41. Đã giảm kích thước ảnh CPU cho Pose, bổ sung Hand GPU→CPU recovery một lần và hiệu chuẩn lại trong HUD. Phát lại SDK riêng hiệu chuẩn được; phép thử SDK trong game vẫn có timeout/độ trễ cao. Chưa xác nhận lỗi camera đã hết trên webcam thật.

## Phạm vi và quyền thực hiện

Yêu cầu trực tiếp của người dùng là thực hiện từng phase rồi báo cáo. Đây là quyền thực hiện công việc hiện tại; các câu lệnh trong tài liệu ZIP được xem là tài liệu tham khảo. Không coi chỉ dẫn “first turn audit only” trong handoff là một yêu cầu mới thay thế lời người dùng. Không suy ra quyền hồi tố cho CV-02, duyệt cơ chế chưa được định nghĩa, chọn default booth, xuất bản Stitch hay Git commit/push/release.

[Kế hoạch thực hiện](../../superpowers/plans/2026-10-19-master-v3-stab-01.md) ghi scope, ràng buộc, test và các quyết định. [Baseline JSON](baseline.json) ghi SHA-256 của 125 file tracked và ZIP nguồn. Mỗi bản sao ngoài project đã được so hash với nguồn trước sửa.

**Evidence gốc và rollback:** `C:/Users/qnhat/_Project/ReactorRush-evidence/2026-10-19-master-v3-1792379238706/`. Thư mục `snapshot/` chứa bản trước sửa; `baseline.json`, log RED/GREEN, baseline/final npm logs, browser JSON/ảnh và SDK logs giữ riêng. Hash parity đã kiểm tra; chưa thực hiện restore phá hủy workspace để diễn tập rollback.

## Kết quả theo phase

| Phase | Trạng thái thực tế | Điều kiện tiếp theo |
|---|---|---|
| STAB-00 | Baseline kỹ thuật PASS; đã sao lưu 125 file, chạy locked install/test/typecheck/build | Quyền thực hiện CV-02 lịch sử chưa tìm được; không hồi tố hay sửa nhãn Awaiting Approval cũ |
| STAB-01 | IMPLEMENTED LOCALLY; automated verification và browser fixtures đã chạy; đánh giá mã độc lập có thực hiện | Đóng các hàng browser còn thiếu, thử webcam thật và xác nhận người dùng |
| FIELD-01 | PREPARED / USER TESTING; chưa có bảng số liệu vật lý | Thử lại sau sửa GPU stall, ghi kết quả theo [runbook](FIELD-01.md) |
| WP-02 | Local spec review; production NOT STARTED | Duyệt kế hoạch/frame cụ thể, token palette, baseline trực tiếp trong Stitch |
| WP-03 | BLOCKED bởi handoff art/layout chưa được duyệt | WP-02 handoff, phạm vi asset/manifest/runtime riêng |
| VERT-01 | BLOCKED bởi G4/G5 và nghiệm thu thực tế | Chọn scheme dựa trên dữ liệu, art handoff, kiểm tra vòng demo/TV |
| ARC-01 | NOT STARTED | G1/G2 ổn định và brief kỹ thuật tối thiểu được rà soát; không rewrite engine |
| R02-SPEC | Quyết định cơ chế PENDING | Duo Circuit chỉ là ứng viên; chọn mục tiêu/quy tắc/controls/scoring và duyệt spec |
| R02-DEV | BLOCKED | Spec cơ chế, kế hoạch file và G6 vertical slice |
| R02-QA | NOT STARTED | Round 2 được triển khai đúng spec rồi mới kiểm thử |
| OPS-01 | NOT RELEASE-CERTIFIED | CI/packaging, kiểm tra offline thật, rights/privacy, rehearsal và human GO/NO-GO |
| R03/R04 | DEFERRED | Cool the Core conditional; Final Boss placeholder; không thêm cơ chế |

Không phase nào được tự chuyển sang “accepted/released” chỉ vì test/build đạt.

## Thay đổi STAB-01

- **S01:** thay gán lại theo trái/phải mỗi frame bằng liên kết torso theo thời gian, khoảng cách và độ rộng vai; loại ghép nhập nhằng. Mất continuity, giao cắt/quá gần hoặc người thứ ba được phát hiện yêu cầu hiệu chuẩn rõ ràng. Khi một người mất, chỉ người còn được liên kết liên tục mới có thể tiếp tục.
- **S02:** timeout mặc định 250 ms từ capture, kiểm tra cả mốc bằng; dữ liệu cũ/trả về muộn không làm mới điều khiển. Kiểm tra presence/visibility hữu hạn và nhả Catch khi cổ tay không hợp lệ. Overlay Cyan/Pink dùng liên kết đã được chấp nhận; bản preview recovery mới bổ sung skeleton vàng chưa gán người chơi khi không còn liên kết được chấp nhận.
- **S03:** nhãn Pose riêng P1/P2 phản ánh input được chấp nhận; giữ đúng hint H0/P1/P2 khi đổi phase; chặn callback/promise lỗi từ phiên camera cũ; có CALIBRATE trong HUD, STOP CAMERA và trạng thái vẫn dùng khi thu PiP. Dock và nút nằm trong x=576..704 của canvas 1280x720; video/overlay cùng contain geometry.
- **Lỗi người dùng báo trong lượt này:** GPU khởi tạo thành công nhưng không trả inference đầu trước watchdog 2 giây. Đã tái hiện bằng SDK/model/WASM thật trên video tổng hợp; CPU control có kết quả. Đường recovery mới thay worker GPU bằng worker CPU một lần, giữ stream đã consent, neutral input và xóa calibration. CPU cũng treo thì dừng, không lặp vô hạn. Promise bitmap cũ không được ảnh hưởng request của worker mới. Giới hạn input 250 ms vẫn giữ nguyên.
- **Tài liệu:** README và hợp đồng camera bỏ các khẳng định chưa có bằng chứng về 30 ms/60 FPS/18×/zero false Catch/2–3 m; sửa yêu cầu Node và tách inference ms/update Hz khỏi FPS render/latency cơ thể.

**Giới hạn identity:** skeleton vô danh không chứng minh danh tính. Nếu thay người ở đúng vị trí mà không có bất kỳ gián đoạn quan sát được nào, hệ thống không thể chứng minh đó là người cũ. Không có nhận diện khuôn mặt/ReID và không thêm chúng trong lượt này.

## Bằng chứng và gate

- **Baseline automated:** Node 25.9.0, npm 11.12.1, Windows 11 Pro; `npm ci`, 67/67 tests, typecheck/build exit 0. Node hiện tại thuộc dải engine lockfile; Node 24 LTS được khuyến nghị nhưng chưa chạy riêng trong lượt này.
- **Checkpoint automated trước sửa Hand movement:** 102/102 tests; build bao gồm typecheck exit 0 trên revision sau sửa Hand recovery/hint. Kết quả trong [gate-report.json](gate-report.json), log `camera-final-tests.log` và `camera-final-build.log`. Build có advisory bundle Phaser >500 kB; test scene harness có cảnh báo API stripTypeScriptTypes experimental. Các cảnh báo không bị đổi thành kết quả performance.
- **Browser fixture:** 10 kịch bản PASS ở lượt thứ hai: H0/P1/P2 Co-op tại viewport 1280x720 và 1920x1080; ba scheme Solo; permission-denied→keyboard. Có đo rectangles/capture, minimize/restore, Pose Catch/crossing/recalibrate/stall và teardown/fallback. Fake worker/video không chứng minh model thật hay accuracy. Các captures này có trước lượt sửa recovery/readiness cuối; không dùng làm PASS cho revision cuối. Xem [ảnh P1 720p](browser/P1-1280.png) và [browser JSON](browser/browser-results.json).
- **Browser revision cuối:** H0-1280 và P1-1280 PASS; P2-1280 timeout tại bước chờ ACCEPTED IDLE sau hiệu chuẩn lại. Lượt chạy bị giới hạn 30 giây ở công cụ trước đó không hoàn tất; không ghi PASS. Kết quả hiện tại [browser-latest-results.json](browser/browser-latest-results.json) được giữ riêng, không thay kết quả 10 PASS cũ.
- **Browser lần đầu:** năm kịch bản đạt rồi P2-1080 timeout chờ Catch sau screenshot. Host bị ngắt cập nhật đủ để cơ chế 250 ms latch; script đã thêm hiệu chuẩn tường minh sau screenshot khi cần. Lưu cả kết quả FAIL ban đầu, không xóa bằng chứng.
- **SDK thật:** probe dùng video tổng hợp và worker/model/WASM thật tái hiện GPU stall, CPU control và recovery. Probe regression riêng kiểm tra kết quả worker và local resource requests; không dùng người hay webcam thật.
- **Self-review:** implementer đối chiếu core, rigs/manifest, quyền camera, source mapping và trạng thái tài liệu.
- **Independent evaluation:** reviewer riêng đã chạy các lượt targeted 38/38, 17/17, mới nhất 42/42 và 7/7 scene tests. Các finding về nút hiệu chuẩn H0 giữa ván, hint sau khôi phục và Pose readiness đều đã tái hiện RED rồi sửa GREEN; reviewer xác nhận đóng. Không còn finding mở trong scope code được review. Reviewer không tự chạy SDK/browser probe và không chứng nhận field readiness; blocker performance vẫn mở.
- **Human acceptance:** Hand Solo/GPU ở lượt sửa treo trước đã được người dùng xác nhận di chuyển và Catch. Lượt sensitivity/zones mới đã được người dùng xác nhận trái/phải/STOP đúng trên2026-10-19. Video và ván chơi đó chưa phải benchmark vật lý có kiểm soát; Pose/Co-op và nghiệm thu toàn phase vẫn PENDING.

## Video và storyboard nội bộ

Theo lời làm rõ của người dùng, storyboard phục vụ agent đọc video, không tạo Excel/spreadsheet để bàn giao. Đã giải mã 1464 frame (1920×1020, 30 fps, video khoảng 48,77 giây), lấy 50 ảnh theo thời gian và 5 trang contact sheet ngoài project. Video gốc không bị sửa; SHA-256 `e7e1886e881a115830f84981e55d1891d0ab2bb37de2afbaa3619e8875f38fa3`.

- Khoảng 0–35 giây: Pose CPU trả frame không đều; nút CALIBRATE có lúc sáng. Tại 30 giây: 1 pose, sample age 203 ms, inference trung bình 393 ms, 4 Hz; lời nhắc yêu cầu CALIBRATE. Đây không phải trường hợp model hoàn toàn không thấy người.
- Khoảng 36 giây chuyển H0; khoảng 41 giây báo hand model stopped responding và dừng camera. Đã thêm một lần thay worker GPU bằng CPU, giữ stream đã consent, xóa hiệu chuẩn và có nút CALIBRATE trong HUD khi đang chơi; lần treo tiếp theo dừng và dùng keyboard.
- Pose CPU capture giới hạn cạnh dài 320 pixel, giữ tỷ lệ ảnh và tọa độ chuẩn hóa; GPU giữ kích thước gốc. Kiểm thử định lượng đầu vào gồm 640×360→320×180 và 640×480→320×240. Không nới ngưỡng freshness 250 ms.
- Phát lại một ảnh webcam cắt từ giây 30, dùng SDK/model/WASM thật trong trang đo riêng: nhận 1 pose, khoảng 8 Hz, các mẫu cuối 108–119 ms, hiệu chuẩn thành công. Đây là ảnh tĩnh lặp lại, không xác nhận tracking chuyển động hay latency cơ thể.
- Phát lại trong game headless: một lượt bị watchdog CPU ở frame đầu; lượt chẩn đoán chỉ kéo dài watchdog trong fixture cho khoảng 4 Hz, inference cuối 263–275 ms, readiness chập chờn và hiệu chuẩn cuối thất bại. Không áp dụng việc kéo dài watchdog đó vào production. Phép thử tạm ngủ render không hoàn tất trước timeout công cụ; không ghi PASS.

Evidence: thư mục ngoài project `video-analysis/` chứa index/storyboard, `cpu-replay-results.json`, `app-pose-cpu-results.json`, `app-pose-coldstart-diagnostic.json` và các probe. Không đưa hình người trong recording vào public assets hoặc upload ra ngoài.

| Gate | Disposition |
|---|---|
| G0 | Technical baseline/preservation PASS; historical CV-02 approval discrepancy remains documented |
| G1 | Deterministic safety cases PASS; overall PARTIAL — chưa đóng hết focus/permission/worker browser scenarios và giới hạn identity phải giữ rõ |
| G2 | Các fixture và Hand movement scenarios đã chạy; overall PARTIAL/BLOCKED — Hand Solo/GPU đã được người dùng xác nhận cả trái/phải/STOP trên bản zones mới; chưa đầy đủ results/replay, 10 start/stop, browser permission revoke, CPU/GPU path theo mọi scheme |
| G3 | NOT RUN by agent; user testing, chưa có số liệu xác thực |
| G4 | PENDING HUMAN CHOICE; P1 chỉ provisional trial |
| G5–G10 | BLOCKED/NOT RUN theo dependency; không chứng nhận art, vertical slice hay release |

## Đối chiếu nguồn và quyết định còn mở

| Loại thông tin | Nguồn được giữ làm thẩm quyền |
|---|---|
| Sản phẩm/Direction A | DESIGN.md |
| Rig/art construction/token đề xuất | ART_BIBLE.md; manifest cho metadata/status; animation reports cho runtime evidence đã ghi |
| Timer/controls/scoring | docs/gameplay/energy-catch-mvp.md và core hiện tại; không sửa gameplay trong lượt này |
| Camera thực thi | adapter/worker/mapper và test/log hiện tại; camera-input-integration.md được sửa theo mã |
| Visual concepts | roadmap/screen flow/WP-02 DRAFT; chưa thành runtime art |
| Bản master v3 | ZIP nguồn có SHA trong baseline; dependency/gate không tự tương đương quyền hay nghiệm thu |

WP-02 cũ còn cấm thêm webcam trong scope, trong khi master v3 yêu cầu bố trí PiP và Solo hiện có. Cần chốt amendment cho visual spec trước khi authoring. Palette `#55DFFF/#FF78BD` và `#00F0FF/#FF4D79` chưa được chọn; không tự khóa token. Chưa đọc frame trực tiếp trong editor, không dùng ngoại lệ WP-01 làm technical PASS cho WP-02.

Các ruling được ghi rõ: triển khai tuần tự tại checkout người dùng với snapshot ngoài vì không tự ghi Git metadata; yêu cầu trực tiếp hiện tại cho phép thực hiện STAB-00/STAB-01; đổi auto-recovery thành explicit calibration theo hợp đồng safety; ưu tiên sửa hai finding lifecycle ảnh hưởng integration bằng test hồi quy. Đổi chính sách recovery tăng thao tác cho host; chi phí nếu đánh giá quá chặt là friction, không phải nới an toàn.

Không thay đổi luật Energy Catch, art/rig/animation, manifests, models, dependencies hay Git commit/remotes. Danh sách file và kiểm tra hash cuối nằm trong gate JSON. Rollback source/copy parity PASS; live restore rehearsal NOT RUN.
