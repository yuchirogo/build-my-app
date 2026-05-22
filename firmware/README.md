# BlindGuard Cane – ESP32 Firmware

Firmware cho gậy thông minh, chạy song song với PWA BlindGuard AI.

## Tính năng
- **BLE GATT Server** (Nordic UART-style) – tương thích trực tiếp với `src/lib/ble/uuids.ts` của app:
  - Service `6e400001-…`
  - Command (Write) `6e400002-…` – nhận lệnh haptic / find-mode / ping
  - Notify `6e400003-…` – gửi telemetry 7 byte (battery, RSSI, distance, flags)
- **BLE Beacon / Advertising liên tục** (20–40 ms) để app dùng RSSI cho Find My Cane.
- **Haptic** qua MOSFET AO3400 + coin motor (PWM LEDC, 4 mức: off/low/med/high).
- **Buzzer** cho Find Mode (mức HIGH).
- **Cảm biến khoảng cách**:
  - VL53L0X (I2C) – mặc định, bật `#define USE_VL53L0X 1`.
  - JSN-SR04T (Trig/Echo) – đổi sang `0`.
- **Nút bấm** (RTC GPIO33) – báo lên app + wake từ deep sleep.
- **Power management**: sau 5 phút không kết nối và không bấm nút → deep sleep, wake bằng nút bấm.

## Phần cứng (gợi ý)
| Thành phần | Chân ESP32 |
|---|---|
| Coin motor + AO3400 Gate | GPIO25 |
| Buzzer active 3.3V | GPIO26 |
| Nút bấm (PULLUP, nhấn=LOW) | GPIO33 (RTC) |
| VL53L0X SDA / SCL | GPIO21 / GPIO22 |
| JSN-SR04T TRIG / ECHO* | GPIO18 / GPIO19 |
| Đo pin (chia áp 1/2) | GPIO34 |

\* ECHO 5V phải qua cầu chia áp xuống 3.3V.

## Build
1. Arduino IDE 2.x, cài board ESP32 (Espressif).
2. Library Manager cài:
   - `NimBLE-Arduino` (h2zero)
   - `Adafruit_VL53L0X` (nếu dùng ToF)
3. Mở `blindguard_cane/blindguard_cane.ino`, chọn board **ESP32 Dev Module**, Flash size 4MB, Partition “Minimal SPIFFS” hoặc default.
4. Upload.

## Giao thức trùng app
Khớp `src/lib/ble/uuids.ts`:
- Lệnh 2 byte `[cmd, level]`: `0x00..0x03` haptic, `0x10/0x11` find on/off, `0xFF` ping.
- Telemetry 7 byte: `type=0x01 | batt | rssi(LE16) | dist_cm(LE16) | flags`.

## Ghi chú RSSI
Trình duyệt Web Bluetooth thường **không** expose RSSI sau khi đã kết nối. Vì vậy firmware advertising liên tục với interval ngắn để app có thể quét RSSI khi cần. Trường `rssi` trong telemetry để 0 nếu không đo được — app sẽ bỏ qua và dùng RSSI từ phía nó (hoặc ToF distance làm fallback).
