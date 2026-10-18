# Reactor Rush — Energy Catch

> Trò chơi tương tác 2D thời gian thực, hỗ trợ điều khiển đa phương thức: **Bàn phím** hoặc **Cử chỉ bàn tay qua Webcam (Google MediaPipe Hand Landmarker)** với khả năng tăng tốc phần cứng GPU (WebGL).

---

## 🌟 Tính năng nổi bật

- **Đa dạng chế độ chơi**:
  - **1 Player (Solo)**: Thử thách kỹ năng cá nhân với 1 người chơi (Player 1 Cyan).
  - **2 Players (Co-op)**: Hợp tác 2 người chơi cùng lúc (P1 Cyan và P2 Pink) trên cùng một màn hình.
- **Theo dõi cử chỉ bàn tay AI (MediaPipe Hand Tracking)**:
  - Tích hợp `@mediapipe/tasks-vision` chạy trong Web Worker đa luồng.
  - Hỗ trợ tăng tốc GPU (WebGL), giảm độ trễ xử lý xuống chỉ còn ~30ms, mang lại trải nghiệm mượt mà 60 FPS.
  - Vẽ khung xương và 21 khớp tay (Hand Skeleton Overlay) thời gian thực trên webcam preview (Cyan cho P1, Pink cho P2).
  - Hiệu ứng phát sáng trực quan khi thực hiện cử chỉ chụm ngón tay (Pinch to Catch).
  - Quy trình hiệu chuẩn (Calibration) linh hoạt cho cả Solo lẫn Co-op.
- **Hệ thống nhân vật 2D Cutout Rig**:
  - Nhân vật robot P1 Cyan & P2 Pink với các chuyển động hoạt ảnh (Idle, Move, Catch).
  - Trang kiểm tra hoạt ảnh chuyên biệt tại `/animation-test.html`.
- **Gameplay nhịp độ nhanh & cuốn hút**:
  - Vòng chơi đếm ngược 60 giây kịch tính.
  - Cơ chế tính điểm combo tăng dần theo chuỗi bắt thành công.
  - Bảng tổng kết điểm cá nhân và điểm toàn đội (Team Total) chi tiết.

---

## 🎮 Hướng dẫn điều khiển

### 1. Điều khiển bằng Bàn phím (Mặc định)

| Người chơi | Di chuyển trái / phải | Bắt năng lượng (Catch) |
|---|---|---|
| **Player 1 (Cyan)** | <kbd>A</kbd> / <kbd>D</kbd> | Giữ phím <kbd>S</kbd> khi năng lượng chạm tới robot |
| **Player 2 (Pink)** | <kbd>←</kbd> / <kbd>→</kbd> | Giữ phím <kbd>↓</kbd> khi năng lượng chạm tới robot |

- <kbd>Enter</kbd>: Bắt đầu trò chơi từ màn hình Menu.
- <kbd>R</kbd> hoặc <kbd>Enter</kbd>: Chơi lại vòng mới từ màn hình kết quả.

---

### 2. Điều khiển bằng Cử chỉ Webcam (Motion Beta)

1. Tại Menu chính, nhấn nút **SET UP WEBCAM CONTROLS**.
2. Chọn chế độ **1 PLAYER (SOLO)** hoặc **2 PLAYERS (CO-OP)**.
3. Tích chọn đồng ý quyền xử lý camera trên thiết bị cục bộ, sau đó nhấn **ENABLE CAMERA & LOAD MODEL**.
4. Giơ bàn tay vào khung hình:
   - Khung xương bàn tay (Skeleton) sẽ hiển thị ngay trên video webcam.
   - Đưa tay vào vùng chỉ định rồi nhấn **CALIBRATE HAND** (hoặc **CALIBRATE BOTH HANDS**) để lưu vị trí trung tính.
5. Nhấn **START WITH CAMERA** để vào màn chơi:
   - **Di chuyển**: Đưa bàn tay sang trái / phải so với vị trí đã calibrate.
   - **Bắt (Catch)**: Chụm đầu ngón cái và ngón trỏ lại với nhau (Pinch).

---

## ⚡ Luật chơi & Cách tính điểm

- **Mục tiêu**: Thu thập tối đa năng lượng Cyan và né tránh hiểm họa đỏ trong vòng **60 giây**.
- **Năng lượng Cyan (Energy Orb)**:
  - Bắt thành công: **+100 điểm**.
  - Cứ mỗi 5 lần bắt trúng liên tiếp, hệ số nhân điểm (Multiplier) tăng thêm **+0.5×** (tối đa **3.0×**).
- **Hiểm họa đỏ (Hazard)**:
  - Bắt phải hiểm họa: **−50 điểm** (điểm số không âm, tối thiểu là 0) và **reset chuỗi combo** về 0.
- **Rơi trượt (Miss)**:
  - Quả cầu rơi khỏi sàn mà không chạm vào robot sẽ không bị trừ điểm và không làm đứt chuỗi combo.

---

## 🛠️ Công nghệ sử dụng

- **Game Engine**: [Phaser 4.2.1](https://phaser.io/)
- **Ngôn ngữ**: TypeScript 7.x
- **Build Tool**: [Vite 8.3](https://vitejs.dev/)
- **Computer Vision & AI**: [Google MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) (`@mediapipe/tasks-vision` v1.1.1)
- **Kiến trúc luồng**: Web Worker cho AI inference + OffscreenCanvas/WebGL GPU acceleration.
- **Kiểm thử**: Node.js Test Runner native (`node:test`, `node:assert/strict`).

---

## 🚀 Cài đặt & Khởi chạy dự án

### Yêu cầu môi trường
- [Node.js](https://nodejs.org/) (phiên bản 18 trở lên).
- Trình duyệt hiện đại hỗ trợ WebGL và WebCam (Chrome, Edge, Brave,...).

### Các bước thực hiện

1. **Clone repository về máy**:
   ```bash
   git clone https://github.com/fudever-club/Reactor_Rush.git
   cd Reactor_Rush
   ```

2. **Cài đặt các thư viện cần thiết**:
   ```bash
   npm install
   ```

3. **Khởi động môi trường phát triển (Dev Server)**:
   ```bash
   npm run dev
   ```
   Mở trình duyệt và truy cập vào đường dẫn: `http://127.0.0.1:5173/`

4. **Trang xem thử hoạt ảnh nhân vật (Animation Test Tool)**:
   Truy cập: `http://127.0.0.1:5173/animation-test.html`

---

## 📋 Các lệnh Script có sẵn

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Khởi chạy Vite dev server tại địa chỉ `127.0.0.1:5173`. |
| `npm test` | Chạy bộ 45 bài kiểm thử tự động (Unit Tests) với Node test runner. |
| `npm run typecheck` | Kiểm tra cú pháp và tính toàn vẹn kiểu dữ liệu TypeScript (`tsc --noEmit`). |
| `npm run build` | Kiểm tra kiểu và đóng gói ứng dụng cho production vào thư mục `dist/`. |
| `npm run preview` | Chạy thử bản build production tại local. |
| `npm run assets:export`| Trích xuất và cập nhật sprites nhân vật từ file nguồn qua sharp. |

---

## 📁 Cấu trúc thư mục

```
Reactor Rush/
├── .agents/                    # Cấu hình kỹ năng và quy trình phát triển agent
├── docs/                       # Tài liệu thiết kế, art bible và đặc tả gameplay
│   ├── art/                    # Báo cáo sản xuất hoạt ảnh & tích hợp Phaser
│   ├── design/                 # Luồng màn hình và roadmap hình ảnh
│   └── gameplay/               # Đặc tả luật chơi Energy Catch & Camera input
├── public/                     # Static assets được phục vụ trực tiếp
│   └── mediapipe/              # File mô hình hand_landmarker.task
├── scripts/                    # Scripts build và xuất sprite tự động
├── src/                        # Mã nguồn chính của ứng dụng
│   ├── adapters/               # Bộ chuyển đổi input (Keyboard & MediaPipe Hand Tracking)
│   │   ├── hand-input-mapper.ts        # Ánh xạ tọa độ bàn tay & tính toán pinch
│   │   ├── hand-landmarks-renderer.ts  # Vẽ khung xương bàn tay trên canvas
│   │   ├── keyboard-input-adapter.ts   # Xử lý sự kiện bàn phím
│   │   └── mediapipe-hand-input-adapter.ts # Điều phối video stream & worker
│   ├── art/                    # Cutout Rig & parser hoạt ảnh nhân vật
│   ├── gameplay/               # Core logic tính điểm, va chạm và thời gian
│   ├── workers/                # Web Worker chạy MediaPipe inference
│   ├── main.ts                 # Điểm khởi chạy chính & Phaser Scene
│   └── game-style.css          # Giao diện HUD & màn hình cài đặt camera
├── tests/                      # Bộ kiểm thử tự động toàn diện
├── index.html                  # Giao diện chính của game
├── animation-test.html         # Công cụ preview 2D Cutout Rig
└── package.json                # Cấu hình dự án & dependencies
```

---

## 📄 Bản quyền & Đóng góp

Dự án được phát triển bởi **FU-DEVER Club**. Mọi đóng góp, báo lỗi (issue) và pull request đều được hoan nghênh!
