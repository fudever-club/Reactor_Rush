# Reactor Rush — Autonomous Optimization, 21/10/2026

**Kết luận: tìm được hai cơ hội hiệu năng có bằng chứng; chưa áp dụng chính sách runtime mới. G2 vẫn BLOCKED.**

Đây là vòng nghiên cứu chủ động theo yêu cầu mới, trong phạm vi STAB-01 và chuẩn bị FIELD-01. Không suy diễn ngân sách sáu giờ thành quyền thực hiện ARC-01, WP-02/03, gameplay tương lai hoặc release. Vòng này giữ lại benchmark, dữ liệu và cấu hình thí nghiệm; không giữ thay đổi sản phẩm chưa chứng minh đủ an toàn và đúng phạm vi.

## Revision, môi trường và bảo toàn

- HEAD vẫn `e027110c27014309ead783563c9b4ba7e2e0b77d`. HEAD không đại diện toàn bộ working tree: các thay đổi STAB trước đó vẫn được giữ.
- Toàn bộ **194 file có trước vòng này** được snapshot bên ngoài và xác nhận SHA-256 bằng nhau trước nghiên cứu; kiểm tra cuối vòng không có file nào bị đổi. [Baseline](evidence/baseline.json), [bảo toàn](evidence/preservation.json).
- Runtime SHA-256 giữ nguyên `1ef353185942df71113b5c07cba91e76bff6cf90addaefcf27e6ee68362a347a`; đối chiếu từng thành viên runtime với revision bàn giao trước. Chỉ thêm hai script benchmark và thư mục báo cáo này. Không đổi scoring, timer60s, ngưỡng250ms, watchdog2s, hiệu chuẩn, assets/rigs, dependency hoặc Git metadata.
- Quan sát lại: guest x86_64, Intel Xeon Platinum8573C,5CPU visible/affinity, KVM; quota400000/100000 =4CPU tương đương; memory.max16GiB; còn khoảng30GiB đĩa. Đây là tài nguyên guest/cgroup, không phải cam kết5core vật lý độc quyền. Không lấy BogoMIPS làm clock thực.
- Chromium thực tế dùng ANGLE/SwiftShader Vulkan cho WebGL. Canvas2D fallback được xác nhận bằng context2D và0GL draw trong các lượt tương ứng. Nhãn GPU của fake worker là dữ liệu mô phỏng. [Metadata và hash payload đã phục vụ](evidence/environment.json).

## Thiết kế benchmark

Sáu suite chạy tuần tự, **30 lượt đo hoàn tất**, tổng thời gian suite **433.37s**. Mỗi suite có watchdog120s và thực tế hoàn tất dưới120s; tổng nhiều suite không được mô tả là dưới120s. Mỗi cấu hình có2lượt, browser mới, warm-up2s, thứ tự thuận/ngược để giảm ảnh hưởng thứ tự. Không chạy build/test nặng song song lúc đo. Không cài package/download, không sudo, không benchmark phá huỷ hay xoá cache.

Đầu vào và phạm vi được giữ riêng:

1. **Synthetic gameplay:** Co-op P1,1280×720, video640×360, captureStream yêu cầu24Hz, bitmap giả, worker giả dùng EventTarget/timer130ms trên main thread. Đo rendering/scheduling của scene, không đo inference thật.
2. **SDK thật:** SDK/model/WASM local, bitmap thật, video không người, phase setup; ép CPU delegate cho so sánh renderer/capture. Không chứng minh tracking người hay model/gameplay chạy đồng thời. Suite delegate cuối so sánh GPU-auto→fallback với CPU-first, giữ rendererCanvas.

Báo cáo dùng median giữa2lượt. p95 trong từng lượt là higher empirical quantile `sorted[ceil((n−1)*p)]`; cột p95 là median của hai p95, không phải p95 gộp. JSON giữ từng lượt, min/max, raw timestamps và lỗi. Hai lượt chỉ cho mô tả, không đủ khẳng định ý nghĩa thống kê. CPU tương đương = cgroupusage/elapsed; bao gồm toàn môi trường. rAFHz là nhịp callback quan sát được, không phải FPS màn hình vật lý. Cửa sổ CDP/cgroup/trace lệch nhẹ do lấy mẫu.

## Giả thuyết và quyết định

| Giả thuyết | Thí nghiệm | Kết luận và quyết định |
|---|---|---|
| Overlay/UI là chi phí chính | Tắt riêng từng thành phần | Không có lợi ích lớn nhất quán; không bỏ chức năng để lấy điểm benchmark |
| WebGL software rendering chiếm ngân sách CPU | Chặn một sốGL draw; sau đó thử Canvas fallback hiện hữu | Tác động lớn và lặp lại; giữ như cơ hội renderer, không ship chính sách mới |
| Pump thêm ngoài rAF tránh chờ render | Thêm interval8ms bên cạnh rAF | Vẫn quá hạn/mất hiệu chuẩn; loại can thiệp này. Không phủ nhận mọi replacement scheduler |
| CPU canvas readback giảm chờ bitmap | Cùng kích thước320×180, drawImage/getImageData/createImageBitmap | Không cải thiện ổn định, có thêm kết quả muộn; loại |
| CPU-first tránh vòng GPU thất bại | Cùng rendererCanvas, SDK thật, so sánh policy startup | Lấy kết quả còn mới nhanh hơn rõ rệt tại Cloud này; cần phạm vi/kiểm chứng trước khi đổi policy sản phẩm |

`no-raster` trong rawJSON là tên lịch sử: nó chặn một số WebGL draw submissions, không loại mọi raster/compositor/clear/video. Lượt đầu chưa có counter interception/initial-calibration, nên chỉ là exploratory; suite sau có counter và trạng thái đầu lượt. Lỗi methodology đã được reviewer nêu và sửa; không xoá dữ liệu cũ.

## Renderer: xác nhận dài hơn bằng gameplay tổng hợp

Hai lượt20s/cấu hình, warm-up2s. Tất cả bắt đầu và kết thúc không yêu cầu hiệu chuẩn lại trong suite này.

| Cấu hình | Lượt | rAF Hz | CPU tương đương | Tuổi kết quả p95 (ms) | Kết quả ≥250ms |
|---|---:|---:|---:|---:|---:|
| baseline | 2 | 41.38 | 3.98 | 172.50 | 0 |
| canvas-fallback | 2 | 60.00 | 0.59 | 130.60 | 0 |

So sánh median: **CPU toàn môi trường giảm85.1%**, nhịp rAF tăng45.0%. Canvas không bị cgroup throttle trong các cửa sổ này; baseline bị throttle188/200 và193/200periods. Quota4CPU được sử dụng gần hết dù có5vCPU visible. Đây là hiệu ứng của workload tổng hợp trên SwiftShader, không phải mức tăng hiệu năng đã ship cho game.

Cả baseline vàCanvas đều không vượt250ms trong suite20s này. Tuy nhiên các suite8s trước có spike/mất hiệu chuẩn, gồm baseline3+2kết quả muộn trong so sánh Canvas/timer. Điều đó thể hiện tính không ổn định theo thời điểm; không được dùng suite dài pass để xoá lỗi trước. [Raw suite dài](evidence/long-renderer.json), [raw fallback/timer](evidence/fallback-pump.json), [ablation ban đầu](evidence/ablation.json).

## SDK/model thật: rendering vẫn ảnh hưởng, chưa giải quyết tail latency

Hai lượt8s/cấu hình; CPUdelegate; không người, không gameplay.

| Cấu hình | Lượt | rAF Hz | CPU tương đương | Tuổi kết quả p95 (ms) | Kết quả ≥250ms |
|---|---:|---:|---:|---:|---:|
| baseline | 2 | 19.19 | 3.62 | 144.20 | 2 |
| canvas-fallback | 2 | 35.89 | 2.10 | 83.25 | 2 |

Canvas giảm CPU toàn môi trường42.0% và giảm median của p95 tuổi kết quả42.3%. Nhưng Canvas vẫn có2kết quả≥250ms trong một lượt, tối đa492.7ms; lượt còn lại không có. Baseline mỗi lượt có1kết quả muộn. **Không có bằng chứng đóngG2.** `inferenceMs` là thời gian wall bên trong `detectForVideo`; giảm contention không đồng nghĩa model tính toán nhanh hơn về số phép toán. [Raw SDK](evidence/real-sdk.json).

## Hướng bị loại: CPU readback

Giữ rendererCanvas và CPUmodel, chỉ đổi capture. Hai lượt8s/cấu hình.

| Cấu hình | Lượt | rAF Hz | CPU tương đương | Tuổi kết quả p95 (ms) | Kết quả ≥250ms |
|---|---:|---:|---:|---:|---:|
| canvas-fallback | 2 | 42.06 | 1.97 | 48.65 | 0 |
| canvas-cpu-capture | 2 | 33.16 | 2.22 | 105.15 | 3 |

Default capture có0kết quả muộn; readback có3. Capture default phần lớn khoảng1–5ms; phương án mới từng lên198.2ms total/140.3ms synchronous. Dữ liệu không ủng hộ coi bitmap resize là chi phí lớn nhất ở workload này. Không sửa adapter để áp dụng phương án mới. [Raw capture](evidence/cpu-capture.json).

## Cơ hội startup: CPU-first trên môi trường software-rendered

| Policy, rendererCanvas | Lượt | Kết quả đầu còn mới sau camera request | Median |
|---|---:|---|---:|
| GPU-auto rồi CPU fallback |2|6769.8ms;6999.5ms|6884.65ms|
| CPU-first |2|1217.2ms;1106.6ms|1161.90ms|

Giảm median **83.1%**, tương đương khoảng5.72s. Các giá trị này được suy ra từ raw startup trace bằng tuổi0≤age<250ms. `firstReadyMs` chỉ là SDK ready đầu tiên, có thể làGPUready trước khi stall; không được gọi là camera controls dùng được. Kết quả còn mới vẫn không có người/pose, nên không chứng minh calibration readiness. So sánh bao gồm cả retry và capture sizing phụ thuộcdelegate, không cô lập tốc độ số họcGPU/CPU. Không suy rộng CPU-first sang laptop cóGPUthật. [Raw startup](evidence/delegate-startup.json).

## Giới hạn và cơ hội tiếp theo

- **Đo được:** software rendering cạnh tranh ngân sách CPU4core-equivalent; tác động lớn khi chọn Canvas; tail latency có thể vượt250ms ngay khi không cgroup throttle; GPU-auto có vòng khởi động thất bại trên Cloud này.
- **Chưa xác định đủ:** phần đóng góp riêng của host scheduling, browser/native rendering và WASM vào mọi spike; không gán `(program)` profiler hay một long task thành bằng chứng nguyên nhân duy nhất.
- **Cơ hội mạnh:** chính sách renderer phù hợp software backend; policy CPU-first có kiểm soát cho host khôngGPU; cô lập/cắt chi phí render trước khi cân nhắc kiến trúc capture/inference sâu hơn. Các thay đổi policy/kiến trúc nằm ngoài shipping scope hiện tại.
- **Bước nghiệm chứng cần thiết:** cùng gameplay và model thật với người, hình ảnh/animation tương đương, kiểm thử dài và FIELD targetdevice. Không có physical latency, precision/recall, nhận dạng2người hoặc FPS targetlaptop nào được tạo ra trong vòng này.
- **Điểm dừng nghiên cứu:** các micro-optimization đã thử không giải quyết tail; hai hướng có tác động lớn liên quan policy/ARC và kiểm chứng vật lý còn thiếu. Không tiếp tục sửa vòng lặp hoặc nới250ms để tạo một kết quả pass.

## Kiểm chứng, review và gate

- Automated verification: **173/173Node tests PASS**,0fail/skip; cả2script mới qua `node --check`; `git diff --check` PASS. [Log](evidence/regression-tests.log).
- Build: **NOT RUN trong vòng này**, chỉ thêm harness và báo cáo; build thành công ở bàn giao trước là bằng chứng lịch sử riêng.
- Self-review: đối chiếu hash194file, runtime payload và các kết luận với rawJSON.
- Independent evaluation: distinct reviewer `/root/camera_audit` đọc script và rawdata, không chạy browser/test cạnh tranh; xem [review](independent-review.md). Không coi self-review hoặc scriptpass là review độc lập.
- G0–G10 giữ nguyên disposition từ [bàn giao trước](../cloud-completion-2026-10-20/REPORT.md); không nâng gate nào. G2BLOCKED, G3physicalNOTRUN; không lựa chọn booth thay người dùng, không ARC/WP/future-round/release. [JSON đầy đủ](status.json).

## Tái lập

Dùng package local đã hash trong metadata trên127.0.0.1:4173, Node và Playwright/Chromium đã có sẵn. Không download dependencies. Nếu chạy ở máy khác, thay module/executable/basepath, giữ cấu hình và phân biệt phầncgroupLinux optional.

```sh
RR_MODULES=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules
export CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
node tests/browser/pose-performance-benchmark.mjs OUTPUT/ablation http://127.0.0.1:4173 "$RR_MODULES"
RR_BENCH_VARIANTS=baseline,canvas-fallback,timer-pump node tests/browser/pose-performance-benchmark.mjs OUTPUT/fallback-pump http://127.0.0.1:4173 "$RR_MODULES"
RR_BENCH_SECONDS=20 RR_BENCH_VARIANTS=baseline,canvas-fallback node tests/browser/pose-performance-benchmark.mjs OUTPUT/long-renderer http://127.0.0.1:4173 "$RR_MODULES"
node tests/browser/pose-sdk-performance-benchmark.mjs OUTPUT/real-sdk http://127.0.0.1:4173 "$RR_MODULES"
RR_SDK_CAPTURE_EXPERIMENT=1 node tests/browser/pose-sdk-performance-benchmark.mjs OUTPUT/cpu-capture http://127.0.0.1:4173 "$RR_MODULES"
RR_SDK_DELEGATE_EXPERIMENT=1 node tests/browser/pose-sdk-performance-benchmark.mjs OUTPUT/delegate-startup http://127.0.0.1:4173 "$RR_MODULES"
npm test
```

[Script ablation](../../../tests/browser/pose-performance-benchmark.mjs), [script SDK](../../../tests/browser/pose-sdk-performance-benchmark.mjs). Rawdata ghi cấu hình thực tế lúc chạy; script hiện tại có thêm instrumentation/correctedmetadata sau các suite đầu. Giữ [harness ablationv1](evidence/ablation-harness-v1.mjs) và [harness SDKv1](evidence/sdk-harness-v1.mjs) để không đồng nhất methodology cũ với instrumentation mới. Các bản harness sao lưu dùng cho truy vết; lệnh tái lập dùng script ở thư mụctests để import helper đúng.

Tổng mức cải thiện sản phẩm được tuyên bố trong vòng này: **chưa có**. Mức85.1%CPU và83.1%startup là lợi ích thực nghiệm của cấu hình ứng viên trong phạm vi được mô tả, không phải bảo đảm hoặc tối ưu đã phát hành.
