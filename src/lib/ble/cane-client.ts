import {
  CANE_SERVICE_UUID,
  COMMAND_CHAR_UUID,
  NOTIFY_CHAR_UUID,
  Commands,
  CaneTelemetry,
  parseTelemetry,
} from "./uuids";

// Web Bluetooth types chưa có trong lib mặc định
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice: (opts: any) => Promise<any>;
      getDevices?: () => Promise<any[]>;
    };
  }
}

const STORAGE_KEY = "blindguard_cane_device_id";

type Listener = (t: CaneTelemetry) => void;
type StateListener = (connected: boolean) => void;

export class CaneClient {
  private device: any = null;
  private commandChar: any = null;
  private notifyChar: any = null;
  private telemetryListeners = new Set<Listener>();
  private stateListeners = new Set<StateListener>();
  private reconnectTimer: number | null = null;
  private shouldReconnect = false;

  static isSupported(): boolean {
    return typeof navigator !== "undefined" && !!navigator.bluetooth;
  }

  isConnected(): boolean {
    return !!this.device?.gatt?.connected;
  }

  onTelemetry(fn: Listener): () => void {
    this.telemetryListeners.add(fn);
    return () => this.telemetryListeners.delete(fn);
  }

  onStateChange(fn: StateListener): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  private emitState() {
    const c = this.isConnected();
    this.stateListeners.forEach((l) => l(c));
  }

  /** Mở dialog ghép nối (chỉ chạy trong user gesture) */
  async pair(): Promise<void> {
    if (!CaneClient.isSupported()) {
      throw new Error("Trình duyệt không hỗ trợ Web Bluetooth");
    }
    const device = await navigator.bluetooth!.requestDevice({
      filters: [{ services: [CANE_SERVICE_UUID] }, { namePrefix: "BlindGuard" }],
      optionalServices: [CANE_SERVICE_UUID],
    });
    this.device = device;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, device.id ?? "");
    }
    device.addEventListener("gattserverdisconnected", this.handleDisconnect);
    await this.connectGatt();
  }

  /** Thử reconnect thiết bị đã ghép trước (không cần user gesture) */
  async reconnectKnown(): Promise<boolean> {
    if (!CaneClient.isSupported() || !navigator.bluetooth?.getDevices) return false;
    const savedId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!savedId) return false;
    try {
      const devices = await navigator.bluetooth.getDevices();
      const dev = devices.find((d: any) => d.id === savedId);
      if (!dev) return false;
      this.device = dev;
      dev.addEventListener("gattserverdisconnected", this.handleDisconnect);
      await this.connectGatt();
      return true;
    } catch {
      return false;
    }
  }

  private async connectGatt() {
    if (!this.device) throw new Error("Chưa có thiết bị");
    this.shouldReconnect = true;
    const server = await this.device.gatt.connect();
    const service = await server.getPrimaryService(CANE_SERVICE_UUID);
    this.commandChar = await service.getCharacteristic(COMMAND_CHAR_UUID);
    this.notifyChar = await service.getCharacteristic(NOTIFY_CHAR_UUID);
    await this.notifyChar.startNotifications();
    this.notifyChar.addEventListener("characteristicvaluechanged", this.handleNotify);
    this.emitState();
  }

  private handleNotify = (event: any) => {
    const value: DataView = event.target.value;
    const telemetry = parseTelemetry(value);
    if (telemetry) this.telemetryListeners.forEach((l) => l(telemetry));
  };

  private handleDisconnect = () => {
    this.commandChar = null;
    this.notifyChar = null;
    this.emitState();
    if (this.shouldReconnect) this.scheduleReconnect();
  };

  private scheduleReconnect(attempt = 1) {
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    const delay = Math.min(30000, 1000 * 2 ** Math.min(attempt, 5));
    this.reconnectTimer = window.setTimeout(async () => {
      if (!this.shouldReconnect || !this.device) return;
      try {
        await this.connectGatt();
      } catch {
        this.scheduleReconnect(attempt + 1);
      }
    }, delay);
  }

  async disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      this.device?.gatt?.disconnect();
    } catch {}
    this.emitState();
  }

  forgetDevice() {
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    this.device = null;
  }

  async sendCommand(cmd: number, level = 0): Promise<void> {
    if (!this.commandChar) throw new Error("Chưa kết nối gậy");
    const data = new Uint8Array([cmd, level]);
    // writeValueWithoutResponse nhanh hơn cho lệnh haptic liên tục
    if (this.commandChar.writeValueWithoutResponse) {
      await this.commandChar.writeValueWithoutResponse(data);
    } else {
      await this.commandChar.writeValue(data);
    }
  }

  // Helpers ngắn gọn
  haptic(level: 0 | 1 | 2 | 3) {
    const map = [Commands.HAPTIC_OFF, Commands.HAPTIC_LOW, Commands.HAPTIC_MED, Commands.HAPTIC_HIGH];
    return this.sendCommand(map[level]);
  }
  findModeOn() { return this.sendCommand(Commands.FIND_MODE_ON); }
  findModeOff() { return this.sendCommand(Commands.FIND_MODE_OFF); }
}
