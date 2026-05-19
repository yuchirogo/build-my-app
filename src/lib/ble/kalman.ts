// Kalman filter 1D cho làm mượt RSSI / khoảng cách
// RSSI dao động mạnh do multipath fading, cần lọc trước khi suy ra khoảng cách
export class Kalman1D {
  private x: number | null = null;
  private p = 1;
  constructor(private q = 0.05, private r = 4) {}

  update(measurement: number): number {
    if (this.x === null) {
      this.x = measurement;
      return measurement;
    }
    // Predict
    this.p += this.q;
    // Update
    const k = this.p / (this.p + this.r);
    this.x = this.x + k * (measurement - this.x);
    this.p = (1 - k) * this.p;
    return this.x;
  }

  reset() {
    this.x = null;
    this.p = 1;
  }
}

/**
 * Suy ra khoảng cách (mét) từ RSSI bằng log-distance path-loss model.
 * txPower: RSSI ở 1m (calib trước, mặc định -59 cho ESP32 BLE)
 * n: path-loss exponent (2 ngoài trời thoáng, 3-4 trong nhà)
 */
export function rssiToMeters(rssi: number, txPower = -59, n = 2.5): number {
  if (rssi === 0) return -1;
  return Math.pow(10, (txPower - rssi) / (10 * n));
}

export function metersToProximity(m: number): "rất gần" | "gần" | "vừa" | "xa" {
  if (m < 1) return "rất gần";
  if (m < 3) return "gần";
  if (m < 8) return "vừa";
  return "xa";
}
