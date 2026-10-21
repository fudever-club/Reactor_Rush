# Solo Pose — tự hiệu chuẩn lại sau mất tracking

**Trạng thái: triển khai và kiểm tra cục bộ hoàn tất; chờ chơi thử vật lý trên Dell. Chưa nâng G2/G3.**

## Yêu cầu và phạm vi

Người dùng yêu cầu giảm việc phải bấm CALIBRATE mỗi lần mấtbody, chọn rõ **Solo trước; Co-op giữ thủ công**. Người dùng cũng xác nhận ở xa vẫn hiệu chuẩn xong và chơi được. Vì vậy không kết luận model/camera hỏng ở xa và không sửa model, confidence/shoulder thresholds hoặc độ phân giải capture. [Phản hồi định tính](../field-feedback-2026-10-21.md) không được chuyển thành benchmark hay physicalPASS.

Baseline: HEAD`e850a9c80449efa16c4f802b7bd7fd6e464ed4b8`, cùng feedbackMarkdown đã tồn tại trước sửa. Backup7target SHA-256 bằng nhau trước ghi; previewfixture được backup bổ sung trước cập nhật. [Baseline](evidence/baseline.json). Báo cáo ghi nhận snapshot trước commit của feature; commit chứa báo cáo là revision bàn giao. Các báo cáo Cloud trước là revision lịch sử riêng.

## Hành vi mới

1. Camera consent, hiệu chuẩn đầu tiên và START vẫn bằng nút bấm; không tự mở camera hoặc bắt đầu round.
2. Sau lần hiệu chuẩn thành công trong cùng sessionSolo, nếu mất association, điều khiển bị neutralize như trước. Khi đúng một người quay lại vùngSolo, thấy rõ hai vai và cổ tay, cảhai tay hạ thấp hơn vai, hệ thống thu mẫu trung tính.
3. Cần tối thiểu6mẫu trong ít nhất1000ms capturetime. Center nằm trong0.025so với anchor, shoulderwidth biến thiên≤15%; capturegap phải<250ms và từngresultage<250ms. Tư thế di chuyển, tay giơ/không rõ, người dư, thiếubody, ngoài vùng, mẫu quáhạn/duplicate/future hoặc gap thật làm đặt lại tiến trình.
4. Khi hoàn tất, lưu neutralcenter mới và tạo associationSolo ẩn danh mới. Mẫu hoàn tất không tạo movement/Catch; cử chỉ cóchủđích ở mẫu sau mới điều khiển theo mapping cũ. Không chứng minh đây là cùng người trước đó; người khác đứng một mình đúng điều kiện cũng có thể tiếp quảnSolo.
5. HUD cóAUTO RECOVERY/HOLD STILL và phầntrăm tiếntrình; hiện riêng cảnh báo extra-person, position, confidence, missingbody và slowframes. NútCALIBRATE vẫn có thể ghi đè tựphục hồi. Cancel một yêu cầu thủcông không tự khởi độnglại auto.
6. Co-op luôn giữ thủcông. STOP/error/restartcamera/modechange không mang tiếntrình cũ sang sessionkhác; CPUfallback vẫn đòi calibration thủcông. Schemechange resetdwell. Không nới250ms, đổi timer60s, scoring, Catch mapping, rigs/assets, dependency hoặc renderer/delegatepolicy.

Xem [hợp đồng hiện hành](../../gameplay/camera-input-integration.md#solo-automatic-recovery-2026-10-21) và [bổ sung FIELD-01](../master-v3-2026-10-19/FIELD-01.md#bổ-sung-solo-auto-recovery-21102026).

## Kiểm chứng

| Kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| Node fullsuite |191/191PASS,0fail/skip|Automated; gồm18test mới so với173baseline |
| Typecheck/build |PASS|Giữ cảnh báo bundle lớn đã có |
| Browser Solo/Co-op mới |6/6PASS|P1/P2; Solo80/130ms worker; Co-op80ms; injected350ms stale; video/bitmap/worker tổng hợp |
| Camera lifecycle |13/13PASS|H0/P1/P2consent, disconnect, error, latepermission và keyboardblur; injected |
| Preview/manual override |8/8PASS|Solo/Co-op, P1/P2,1280×720 và1920×1080; tổng hợp |
| Independent execution |66adapter+16scenePASS|Reviewer riêng; thêm reproduction delayed-delivery; không phải browser/physicalrun độc lập |
| Dell với auto recovery mới |NOT RUN|Người dùng cần chạy gói mới; phản hồi trước là build cũ/chưa xác địnhrevision |

Nguồn/log/rawdata: [JSON trạng thái](status.json), [unit](evidence/node-tests.json), [build](evidence/build.json), [browser auto](evidence/solo-recovery-browser.json), [lifecycle](evidence/lifecycle.json), [preview](evidence/preview-recovery.json).

## Lỗi được bắt trong vòng sửa

- Các testfeature banđầu thất bại trước implementation, sau đó65adaptertestPASS. Reviewer tìm đượcP1: deliveryexpiry đang xoá progress dù capture liên tục140ms vàresultage130ms; thêm regression thất bại rồi sửa. Hiện deliveryexpiry vẫn neutralizeinput/clearpreview nhưng giữanchor cho đến khi các capturetimestamp sau chứng minh continuity hoặcgap thật. Test riêng và reviewerreproduction đềuPASS; đây không phải gracewindow hay nới250ms.
- P2HUD che nguyênnhân extra-person bằng nhãnlowerarms chung. BrowserregressionFAIL trước sửa, sau sửaPASS cho cảextra-person vàslowframes.
- Previewfixture cũ chờ chữBODY FOUND ởSolo, không phù hợp guidanceSolo mới. Giữ failureartifact rồi cập nhật assertion hướngdẫn, không sửa productionbehavior để khớp nhãn cũ. Vẫn kiểm tra amberpreview, neutral khi tay đanggiơ, manualoverrideCatch và cleanup.

[REDunit](evidence/unit-red.json), [REDdelivery](evidence/delivery-red.json), [REDUI](evidence/ui-blocker-red.json), [legacy assertion failure](evidence/legacy-preview-assertion-failure.json). Không xoá thất bại khỏi bằngchứng hoặc dùng PASSscript để tự gọi là evaluationđộc lập. [Review riêng](independent-review.md).

## Gói thử và cách kiểm tra trên Dell

Gói`Reactor-Rush-Solo-Auto-Recovery-Test.zip` là localtechnicalcandidate, không phải release. Có26payloadfile; hashmanifest, byte với build vàZIPCRC đã kiểm. [Thông tin archive](evidence/archive.json).

Giải nén, mở terminal tại thư mục và chạy`node serve.mjs` rồi vào localhostđược in ra. CầnNode22.18+; không cầnnpm install. ChọnSolo và thử riêngOneArm/TwoArm. BấmCALIBRATE/START lần đầu, thực hiệnCatch, ra khỏi khung rồi quaylại. Hạ cảhai tay trong khung, đứngyên khoảng1giây và quan sátAUTO RECOVERY tựtrởvề điều khiển. Thử thêm việc giơtay khi quaylại, cóngười đi ngang, và chuyểnCo-op để xác nhận vẫn thủcông. Cần thấy cảvai/cổtay cho nhánhauto; framing chỉ thấy vai mà khuấtcổtay chưa đủ để tự phục hồi trungtính. ManualCALIBRATE vẫn dùng được.

Không gọi1giây là cam kết phục hồi wallclock: nó là dwell tối thiểu trên capturetimestamp; mẫu khôngđạt sẽ reset và cần lâu hơn. Không nhận dạngdanh tính, không tự reset điểm/round và không chứng minh tracking/latency ở khoảngcách cụ thể. G2/G3 chưa được nghiệmthu.

## Tái lập kỹ thuật

```sh
npm test
npm run build
node scripts/serve-build.mjs dist 4174
# Terminal khác; dùng modulePlaywright/Chromium có sẵn trong Cloud:
CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node tests/browser/solo-pose-recovery-smoke.mjs OUTPUT http://127.0.0.1:4174 /opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules
```

[Hash runtime/current sources](evidence/runtime.json) phân biệt revisionmới với baseline;86/89runtime-member files giữ nguyên,3file được đổi đúng phạmvi: Poseadapter, sharedoptionalmetricstype và sceneHUD. [Index bằngchứng](evidence-index.json) giữ SHA-256của các artifact. Self-review: kiểmtra policy với yêu cầu, sourcehash và links. Independentreview có giới hạn riêng như mô tả; không phát hành; commit/push được thực hiện theo yêu cầu riêng của người dùng sau bước kiểm tra.
