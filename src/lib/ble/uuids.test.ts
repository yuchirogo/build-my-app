import { describe, expect, it } from "vitest";
import {
  Commands,
  CANE_SERVICE_UUID,
  COMMAND_CHAR_UUID,
  NOTIFY_CHAR_UUID,
  parseTelemetry,
} from "@/lib/ble/uuids";

describe("BLE UUID contract", () => {
  it("dùng UUID Nordic UART-style cố định (phải khớp firmware ESP32)", () => {
    expect(CANE_SERVICE_UUID).toBe("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
    expect(COMMAND_CHAR_UUID).toBe("6e400002-b5a3-f393-e0a9-e50e24dcca9e");
    expect(NOTIFY_CHAR_UUID).toBe("6e400003-b5a3-f393-e0a9-e50e24dcca9e");
  });

  it("opcode haptic theo thứ tự tăng dần", () => {
    expect(Commands.HAPTIC_OFF).toBe(0x00);
    expect(Commands.HAPTIC_LOW).toBe(0x01);
    expect(Commands.HAPTIC_MED).toBe(0x02);
    expect(Commands.HAPTIC_HIGH).toBe(0x03);
  });

  it("opcode find-mode và ping", () => {
    expect(Commands.FIND_MODE_ON).toBe(0x10);
    expect(Commands.FIND_MODE_OFF).toBe(0x11);
    expect(Commands.PING).toBe(0xff);
  });
});

function buildTelemetry(opts: {
  type?: number;
  battery?: number;
  rssi?: number;
  distanceCm?: number;
  flags?: number;
}): DataView {
  const buf = new ArrayBuffer(7);
  const v = new DataView(buf);
  v.setUint8(0, opts.type ?? 0x01);
  v.setUint8(1, opts.battery ?? 0);
  v.setInt16(2, opts.rssi ?? 0, true);
  v.setUint16(4, opts.distanceCm ?? 0, true);
  v.setUint8(6, opts.flags ?? 0);
  return v;
}

describe("parseTelemetry", () => {
  it("parse đúng frame hợp lệ", () => {
    const v = buildTelemetry({
      battery: 87,
      rssi: -64,
      distanceCm: 250,
      flags: 0b11,
    });
    const t = parseTelemetry(v)!;
    expect(t.batteryPercent).toBe(87);
    expect(t.rssi).toBe(-64);
    expect(t.distanceCm).toBe(250);
    expect(t.buttonPressed).toBe(true);
    expect(t.charging).toBe(true);
  });

  it("rssi=0 → null (firmware báo không đo được)", () => {
    const v = buildTelemetry({ rssi: 0 });
    expect(parseTelemetry(v)!.rssi).toBeNull();
  });

  it("distance=0xFFFF → null (sensor out of range)", () => {
    const v = buildTelemetry({ distanceCm: 0xffff });
    expect(parseTelemetry(v)!.distanceCm).toBeNull();
  });

  it("type byte sai → null (bỏ qua frame lạ)", () => {
    const v = buildTelemetry({ type: 0x99 });
    expect(parseTelemetry(v)).toBeNull();
  });

  it("frame quá ngắn → null", () => {
    const v = new DataView(new ArrayBuffer(3));
    v.setUint8(0, 0x01);
    expect(parseTelemetry(v)).toBeNull();
  });

  it("battery bị kẹp về [0,100]", () => {
    const v = buildTelemetry({ battery: 200 });
    expect(parseTelemetry(v)!.batteryPercent).toBe(100);
  });
});
