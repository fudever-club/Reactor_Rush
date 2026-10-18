# ⚡ REACTOR RUSH — ENERGY CATCH

<div align="center">

[![FU-DEVER Club](https://img.shields.io/badge/DEVELOPED%20BY-FU--DEVER%20CLUB-FF5722?style=for-the-badge&logo=github&logoColor=white)](https://github.com/fudever-club)
[![Phaser Engine](https://img.shields.io/badge/GAME%20ENGINE-PHASER%204.2-brightgreen?style=for-the-badge&logo=javascript)](https://phaser.io/)
[![Google MediaPipe](https://img.shields.io/badge/AI%20VISION-MEDIAPIPE%20GPU-00BCD4?style=for-the-badge&logo=google)](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)
[![TypeScript](https://img.shields.io/badge/LANG-TYPESCRIPT%207-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/BUNDLER-VITE%208-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

**Trò chơi tương tác 2D thời gian thực, tích hợp thị giác máy tính AI (Computer Vision) điều khiển bằng cử chỉ qua Webcam hoặc Bàn phím.**  
*Một sản phẩm nghiên cứu & phát triển bởi **CLB Lập trình FU-DEVER** — Trường Đại học FPT Đà Nẵng.*

[Trải nghiệm ngay](#-cài-đặt--khởi-chạy-dự-án) • [Cơ chế điều khiển](#-hướng-dẫn-điều-khiển) • [Luật chơi & Tính điểm](#-luật-chơi--cách-tính-điểm) • [Kiến trúc kỹ thuật](#-kiến-trúc-hệ-thống--công-nghệ) • [Về FU-DEVER](#-về-câu-lạc-bộ-lập-trình-fu-dever)

</div>

---

## 📖 Giới thiệu tổng quan

**Reactor Rush — Energy Catch** là dự án game web tương tác tốc độ cao, được phát triển nhằm thử nghiệm và tối ưu hóa việc kết hợp giữa **Game Engine 2D (Phaser)** và **Mô hình thị giác máy tính (Google MediaPipe Hand Landmarker)** chạy trực tiếp trên trình duyệt.

Game mang đến trải nghiệm điều khiển đa phương thức đột phá:
- **Motion Control (Cử chỉ bàn tay)**: Nhận diện cử chỉ qua webcam với tăng tốc phần cứng GPU (WebGL), độ trễ cực thấp (~30ms), phản hồi 60 FPS mượt mà.
- **Keyboard Control (Bàn phím truyền thống)**: Mượt mà, nhạy bén và là phương án dự phòng chuẩn chỉ.

---

## 🌟 Tính năng nổi bật

- 🕹️ **2 Chế độ chơi linh hoạt**:
  - **1 Player (Solo)**: Thử thách phản xạ cá nhân với nhân vật P1 (Cyan).
  - **2 Players (Co-op)**: Hai người chơi cùng đứng trước camera hoặc cùng bàn phím phối hợp bắt năng lượng chia làn đối xứng.
- 🖐️ **AI Hand Tracking tối ưu hóa sâu**:
  - Pipeline chạy đa luồng trong **Web Worker**, hoàn toàn không gây nghẽn UI/Game loop.
  - **GPU Acceleration (WebGL)** kèm kỹ thuật **Shader Pre-warmup**, tăng tốc gấp 18 lần so với CPU delegate thông thường.
  - **Visual Landmark Skeleton Overlay**: Hiển thị khung xương và 21 khớp bàn tay thời gian thực với mã màu trực quan (Cyan cho P1, Pink cho P2).
  - **Pinch-to-Catch**: Nhận diện chuẩn xác cử chỉ chụm ngón cái và ngón trỏ với hiệu ứng phát sáng phản hồi tức thì.
  - Cơ chế **Hiệu chuẩn (Calibration)** thông minh lưu trữ tọa độ trung tính của người chơi trước khi bắt đầu.
- 🤖 **2D Cutout Rig Animation**:
  - Hệ thống nhân vật robot P1 Cyan & P2 Pink chuyển động mượt mà qua các trạng thái: *Idle, Move, Catch*.
  - Có trang kiểm thử hoạt ảnh chuyên biệt tại `/animation-test.html`.
- ⚡ **Hệ thống Combo & Tính điểm cuốn hút**:
  - Chuỗi combo liên tiếp giúp nhân hệ số điểm thưởng lên tới **3.0×**.
  - Hiểm họa trừ điểm có cơ chế chống âm và thông báo phản hồi rõ ràng.

---

## 🎮 Hướng dẫn điều khiển

### 1. Bàn phím (Keyboard Controls)

| Người chơi | Di chuyển trái / phải | Bắt năng lượng (Catch) |
|---|---|---|
| **Player 1 (Cyan)** | <kbd>A</kbd> / <kbd>D</kbd> | Giữ <kbd>S</kbd> khi năng lượng chạm tới robot |
| **Player 2 (Pink)** | <kbd>←</kbd> / <kbd>→</kbd> | Giữ <kbd>↓</kbd> khi năng lượng chạm tới robot |

- <kbd>Enter</kbd>: Bắt đầu trận đấu từ Menu chính.
- <kbd>R</kbd> hoặc <kbd>Enter</kbd>: Chơi lại vòng mới tại màn hình kết quả.

---

### 2. Cử chỉ Webcam (Motion Control với MediaPipe)

1. Từ Menu chính, chọn **SET UP WEBCAM CONTROLS**.
2. Chọn chế độ mong muốn: **1 PLAYER (SOLO)** hoặc **2 PLAYERS (CO-OP)**.
3. Tích chọn đồng ý quyền camera (xử lý hoàn toàn tại local trên thiết bị) $\rightarrow$ nhấn **ENABLE CAMERA & LOAD MODEL**.
4. Đưa tay vào khung hình:
   - Hệ thống sẽ nhận diện và vẽ khung xương bàn tay trực tiếp trên camera preview.
   - Di chuyển tay vào vùng chỉ định rồi nhấn **CALIBRATE HAND** (hoặc **CALIBRATE BOTH HANDS**) để khóa điểm trung tính.
5. Nhấn **START WITH CAMERA** để bắt đầu:
   - **Di chuyển**: Đưa bàn tay sang trái hoặc phải so với vị trí đã calibrate.
   - **Bắt (Catch)**: Chụm đầu ngón cái và ngón trỏ lại (Pinch gesture).

---

## ⚡ Luật chơi & Cách tính điểm

- **Thời gian**: Vòng đấu đếm ngược **60 giây**.
- **Quả cầu năng lượng Cyan (Energy Orb)**:
  - Bắt thành công: **+100 điểm**.
  - Cứ mỗi 5 lần bắt trúng liên tiếp: Hệ số nhân combo tăng thêm **+0.5×** (tối đa **3.0×**).
- **Quả cầu hiểm họa đỏ (Hazard Orb)**:
  - Bắt trúng hiểm họa: **−50 điểm** (điểm số không xuống dưới 0) và **reset combo** về 0.
- **Rơi trượt (Miss)**:
  - Quả cầu rơi xuống sàn mà không va chạm robot sẽ tự biến mất, không bị trừ điểm và không làm đứt combo.

---

## 🔬 Kiến trúc hệ thống & Công nghệ

### Tech Stack
- **Game Core**: [Phaser 4.2.1](https://phaser.io/) (WebGL Rendering Pipeline)
- **Ngôn ngữ**: TypeScript 7.0 (Strict mode)
- **Vision AI**: Google MediaPipe Tasks Vision (`@mediapipe/tasks-vision` 1.1.1)
- **Bundler & Tooling**: Vite 8.3, Sharp 0.35
- **Unit Testing**: Node.js Native Test Runner (`node:test`, `node:assert/strict`)

### Sơ đồ luồng xử lý Motion Input (Camera Pipeline)

```mermaid
flowchart LR
    A[Webcam 640x360] -->|ImageBitmap| B[Web Worker]
    B -->|GPU WebGL Inference| C[MediaPipe HandLandmarker]
    C -->|21 Landmarks 3D| D[Main Thread Adapter]
    D -->|Coordinate Mapper & Pinch Ratio| E[Game Input Frame]
    D -->|Realtime Canvas Draw| F[Hand Skeleton Overlay]
    E -->|Deterministic Step| G[Phaser Game Engine]
```

---

## 🚀 Cài đặt & Khởi chạy dự án

### Yêu cầu tiên quyết
- [Node.js](https://nodejs.org/) (phiên bản 18 trở lên).
- Trình duyệt hỗ trợ WebGL và WebCam (Google Chrome, Microsoft Edge, Brave,...).

### Cài đặt từng bước

```bash
# 1. Clone mã nguồn về máy
git clone https://github.com/fudever-club/Reactor_Rush.git
cd Reactor_Rush

# 2. Cài đặt toàn bộ dependencies
npm install

# 3. Khởi chạy máy chủ phát triển cục bộ
npm run dev
```

Truy cập trên trình duyệt: `http://127.0.0.1:5173/`

### Các lệnh hữu ích khác

| Lệnh | Chức năng |
|---|---|
| `npm run dev` | Khởi chạy Vite dev server tại cổng mặc định `5173`. |
| `npm test` | Chạy bộ **45 bài unit tests** tự động toàn diện. |
| `npm run typecheck` | Kiểm tra tính toàn vẹn kiểu dữ liệu TypeScript (`tsc --noEmit`). |
| `npm run build` | Đóng gói phiên bản production tối ưu hóa vào thư mục `dist/`. |
| `npm run preview` | Xem thử bản build production tại local. |
| `npm run assets:export` | Trích xuất và cập nhật sprite sheet nhân vật từ file nguồn qua sharp. |

---

## 📁 Cấu trúc thư mục dự án

```
Reactor_Rush/
├── .agents/                    # Kỹ năng và quy trình phát triển tự động
├── docs/                       # Tài liệu thiết kế, art bible và đặc tả gameplay
│   ├── art/                    # Báo cáo sản xuất hoạt ảnh & hướng dẫn tích hợp Phaser
│   ├── design/                 # Luồng màn hình và roadmap hình ảnh
│   └── gameplay/               # Đặc tả luật chơi Energy Catch & Camera input
├── public/                     # Static assets
│   └── mediapipe/              # File trọng số mô hình hand_landmarker.task
├── scripts/                    # Scripts build và xuất sprite tự động
├── src/                        # Mã nguồn chính của ứng dụng
│   ├── adapters/               # Bộ điều hợp input (Keyboard & MediaPipe Hand Tracking)
│   │   ├── hand-input-mapper.ts        # Ánh xạ tọa độ bàn tay, deadzone & pinch logic
│   │   ├── hand-landmarks-renderer.ts  # Vẽ khung xương 21 khớp tay trên canvas
│   │   ├── keyboard-input-adapter.ts   # Xử lý sự kiện bàn phím
│   │   └── mediapipe-hand-input-adapter.ts # Quản lý webcam stream, worker & lifecycle
│   ├── art/                    # 2D Cutout Rig & parser hoạt ảnh nhân vật
│   ├── gameplay/               # Core game logic độc lập (scoring, timing, collision)
│   ├── workers/                # Web Worker chạy MediaPipe inference với GPU WebGL
│   ├── main.ts                 # Điểm khởi chạy chính & Phaser Scene
│   └── game-style.css          # Giao diện HUD & màn hình cài đặt camera
├── tests/                      # Bộ kiểm thử tự động toàn diện (45 test cases)
├── index.html                  # Giao diện web chính của game
├── animation-test.html         # Công cụ preview 2D Cutout Rig
└── package.json                # Cấu hình dự án & dependencies
```

---

## 🐞 Về Câu Lạc Bộ Lập Trình FU-DEVER

Dự án được khởi xướng và phát triển bởi các thành viên thuộc **CLB Lập Trình FU-DEVER** — Trường Đại học FPT Đà Nẵng, dưới sự đồng hành của linh vật **Bọ cánh cam Buggy** 🐞 cùng Biệt đội DEVER:

- 🌐 **Website chính thức**: [https://fu-dever-landingpage-v2.vercel.app/](https://fu-dever-landingpage-v2.vercel.app/)
- 📘 **Fanpage chính thức**: [https://www.facebook.com/FPTUDever](https://www.facebook.com/FPTUDever)
- 🐙 **GitHub Organization**: [https://github.com/fudever-club](https://github.com/fudever-club)
- ✉️ **Email liên hệ**: `club.dever@gmail.com`
- 📍 **Địa chỉ**: Tòa nhà FPT University, Khu đô thị FPT City, Phường Hòa Hải, Quận Ngũ Hành Sơn, TP. Đà Nẵng

---

## 📄 Bản quyền & Giấy phép

Phát triển với tinh thần mã nguồn mở và chia sẻ học thuật bởi **FU-DEVER Club**. Mọi đóng góp, báo lỗi (issue) và pull request đều được trân trọng và hoan nghênh!
