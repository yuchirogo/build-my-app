// GATT contract giữa app và firmware ESP32 (gậy thông minh)
// Firmware ESP32 cần expose một service với 3 characteristic dưới đây.

export const CANE_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"; // Nordic UART-style

// App -> Cane: ghi 1 byte lệnh (haptic, buzzer, find-mode, …)
export const COMMAND_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

// Cane -> App: notify trạng thái (RSSI, pin, cảm biến ToF, nút)
export const NOTIFY_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

// Bảng lệnh gửi từ app sang gậy (ghi 2 byte: [cmd, level])
export const Commands = {
  HAPTIC_OFF: 0x00,
  HAPTIC_LOW: 0x01,    // rung nhẹ
  HAPTIC_MED: 0x02,    // rung trung bình
  HAPTIC_HIGH: 0x03,   // rung mạnh - cảnh báo nguy hiểm
  FIND_MODE_ON: 0x10,  // bật chế độ tìm gậy: rung + còi mạnh, gửi RSSI tần suất cao
  FIND_MODE_OFF: 0x11,
  PING: 0xff,
} as const;

// Cấu trúc notify từ gậy gửi về (gợi ý firmware):
// Byte 0: type (0x01 = telemetry)
// Byte 1: battery 0-100
// Byte 2-3: rssi (int16 little-endian) - RSSI mà ESP32 tự đo từ phone advertising / hoặc 0 nếu không có
// Byte 4-5: distance_cm (uint16 little-endian) - từ VL53L0X / JSN-SR04T
// Byte 6: flags (bit 0 = nút bấm, bit 1 = đang sạc)
export interface CaneTelemetry {
  batteryPercent: number;
  rssi: number | null;
  distanceCm: number | null;
  buttonPressed: boolean;
  charging: boolean;
}

export function parseTelemetry(view: DataView): CaneTelemetry | null {
  if (view.byteLength < 7 || view.getUint8(0) !== 0x01) return null;
  const battery = view.getUint8(1);
  const rssiRaw = view.getInt16(2, true);
  const distRaw = view.getUint16(4, true);
  const flags = view.getUint8(6);
  return {
    batteryPercent: Math.max(0, Math.min(100, battery)),
    rssi: rssiRaw === 0 ? null : rssiRaw,
    distanceCm: distRaw === 0xffff ? null : distRaw,
    buttonPressed: (flags & 0x01) === 0x01,
    charging: (flags & 0x02) === 0x02,
  };
}
