import { describe, expect, it } from "vitest";
import { Kalman1D, rssiToMeters, metersToProximity } from "@/lib/ble/kalman";

describe("Kalman1D", () => {
  it("returns first measurement as-is", () => {
    const k = new Kalman1D();
    expect(k.update(-60)).toBe(-60);
  });

  it("smooths noisy RSSI toward true value", () => {
    const k = new Kalman1D();
    const truth = -65;
    const noisy = [-50, -80, -60, -70, -65, -68, -62, -66, -64, -65];
    let last = 0;
    for (const v of noisy) last = k.update(v);
    // Sau 10 mẫu phải hội tụ trong khoảng ±5 dBm quanh truth
    expect(Math.abs(last - truth)).toBeLessThan(5);
  });

  it("reset clears state", () => {
    const k = new Kalman1D();
    k.update(-60);
    k.reset();
    expect(k.update(-40)).toBe(-40);
  });
});

describe("rssiToMeters", () => {
  it("returns ~1m at txPower", () => {
    expect(rssiToMeters(-59)).toBeCloseTo(1, 1);
  });
  it("weaker signal = larger distance", () => {
    const near = rssiToMeters(-60);
    const far = rssiToMeters(-85);
    expect(far).toBeGreaterThan(near);
  });
  it("rssi=0 returns -1 (invalid)", () => {
    expect(rssiToMeters(0)).toBe(-1);
  });
});

describe("metersToProximity", () => {
  it("buckets distances vào tiếng Việt", () => {
    expect(metersToProximity(0.5)).toBe("rất gần");
    expect(metersToProximity(2)).toBe("gần");
    expect(metersToProximity(5)).toBe("vừa");
    expect(metersToProximity(12)).toBe("xa");
  });
});
