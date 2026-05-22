/*
 * BlindGuard AI - Smart Cane Firmware (ESP32)
 * ------------------------------------------------------------
 * Tính năng:
 *  - BLE GATT Server (Nordic UART-style) tương thích với app PWA
 *      Service : 6e400001-b5a3-f393-e0a9-e50e24dcca9e
 *      CMD     : 6e400002-...  (App -> Cane, Write)
 *      NOTIFY  : 6e400003-...  (Cane -> App, Notify)
 *  - BLE Beacon / Advertising để app dùng RSSI cho Find My Cane
 *  - Đọc cảm biến khoảng cách VL53L0X (I2C) hoặc JSN-SR04T (Trig/Echo)
 *  - Điều khiển rung haptic (AO3400 MOSFET + coin motor) qua PWM (LEDC)
 *  - Còi buzzer cho Find Mode
 *  - Nút bấm vật lý (báo lên app + wake từ deep sleep)
 *  - Deep sleep & power management (wake bằng nút bấm hoặc timer)
 *
 * Phần cứng (gợi ý chân, đổi theo board của bạn):
 *   - ESP32 DevKit (hoặc ESP32-C3 / S3)
 *   - Coin motor -> AO3400 (Gate=GPIO25, Drain->Motor->VBAT, Source->GND)
 *   - Buzzer active 3.3V (GPIO26)
 *   - Nút bấm (GPIO33, INPUT_PULLUP, nhấn = LOW) - phải là RTC GPIO để wake
 *   - VL53L0X qua I2C (SDA=GPIO21, SCL=GPIO22, XSHUT tuỳ chọn)
 *   - JSN-SR04T (TRIG=GPIO18, ECHO=GPIO19 qua cầu chia áp 5V->3.3V)
 *   - Đo pin: chia áp 1/2 từ VBAT -> GPIO34 (ADC1)
 *
 * Thư viện cần cài (Arduino Library Manager):
 *   - "NimBLE-Arduino" by h2zero  (nhẹ RAM hơn BLEDevice mặc định)
 *   - "Adafruit_VL53L0X"          (chỉ khi dùng VL53L0X)
 *
 * Build: Arduino IDE 2.x hoặc PlatformIO, board "ESP32 Dev Module".
 * ------------------------------------------------------------
 */

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <esp_sleep.h>
#include <driver/rtc_io.h>

// ====== CẤU HÌNH BIÊN DỊCH ======
#define USE_VL53L0X      1   // 1: dùng VL53L0X (I2C). 0: dùng JSN-SR04T
#define HAS_BUZZER       1
#define DEVICE_NAME      "BlindGuard-Cane"

// Chân GPIO
static const gpio_num_t PIN_BUTTON = GPIO_NUM_33;   // RTC GPIO -> wake source
static const int        PIN_MOTOR  = 25;            // PWM haptic
static const int        PIN_BUZZER = 26;
static const int        PIN_BATT   = 34;            // ADC1_CH6
#if !USE_VL53L0X
static const int        PIN_TRIG   = 18;
static const int        PIN_ECHO   = 19;
#endif

// PWM (LEDC) cho motor
static const int LEDC_CH_MOTOR  = 0;
static const int LEDC_FREQ_HZ   = 5000;
static const int LEDC_RES_BITS  = 8;     // 0-255

// Thời gian
static const uint32_t TELEMETRY_INTERVAL_MS = 500;   // chu kỳ notify
static const uint32_t IDLE_TIMEOUT_MS       = 5UL * 60UL * 1000UL; // 5'  -> deep sleep
static const uint32_t FIND_MODE_INTERVAL_MS = 150;   // gửi nhanh hơn khi Find Mode

// ====== BLE UUID (TRÙNG VỚI src/lib/ble/uuids.ts) ======
#define SVC_UUID    "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CMD_UUID    "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define NTF_UUID    "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

// Lệnh (khớp với Commands trong uuids.ts)
enum : uint8_t {
  CMD_HAPTIC_OFF   = 0x00,
  CMD_HAPTIC_LOW   = 0x01,
  CMD_HAPTIC_MED   = 0x02,
  CMD_HAPTIC_HIGH  = 0x03,
  CMD_FIND_ON      = 0x10,
  CMD_FIND_OFF     = 0x11,
  CMD_PING         = 0xFF,
};

// ====== CẢM BIẾN ======
#if USE_VL53L0X
  #include <Wire.h>
  #include <Adafruit_VL53L0X.h>
  Adafruit_VL53L0X tof;
  bool tofReady = false;
#endif

static uint16_t readDistanceCm() {
#if USE_VL53L0X
  if (!tofReady) return 0xFFFF;
  VL53L0X_RangingMeasurementData_t m;
  tof.rangingTest(&m, false);
  if (m.RangeStatus == 4) return 0xFFFF; // out of range
  return (uint16_t)(m.RangeMilliMeter / 10);
#else
  // JSN-SR04T: bắn xung 10us TRIG, đo độ rộng ECHO
  digitalWrite(PIN_TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  uint32_t dur = pulseIn(PIN_ECHO, HIGH, 30000UL); // timeout 30ms (~5m)
  if (dur == 0) return 0xFFFF;
  // distance(cm) = duration(us) * 0.0343 / 2
  uint32_t cm = (dur * 343UL) / 20000UL;
  if (cm == 0 || cm > 500) return 0xFFFF;
  return (uint16_t)cm;
#endif
}

static uint8_t readBatteryPercent() {
  // Chia áp 1/2 -> ADC. VBAT(4.2V full) -> 2.1V tại ADC.
  // ESP32 ADC ~ 3.3V ref, 12-bit.
  const int N = 8;
  uint32_t acc = 0;
  for (int i = 0; i < N; i++) { acc += analogRead(PIN_BATT); delay(2); }
  float v_adc = (acc / (float)N) * (3.3f / 4095.0f);
  float v_bat = v_adc * 2.0f;
  // Map tuyến tính 3.3V (0%) - 4.2V (100%)
  float pct = (v_bat - 3.3f) / (4.2f - 3.3f) * 100.0f;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  return (uint8_t)pct;
}

// ====== TRẠNG THÁI ======
static bool      g_connected   = false;
static bool      g_findMode    = false;
static int8_t    g_lastRssi    = 0;
static uint32_t  g_lastActiveMs= 0;
NimBLECharacteristic* g_notifyChar = nullptr;

// ====== HAPTIC ======
static void setHaptic(uint8_t level) {
  // 0..3 -> 0, 90, 170, 255
  static const uint8_t duty[] = {0, 90, 170, 255};
  if (level > 3) level = 3;
  ledcWrite(LEDC_CH_MOTOR, duty[level]);
#if HAS_BUZZER
  digitalWrite(PIN_BUZZER, level >= 3 ? HIGH : LOW);
#endif
}

// ====== GỬI TELEMETRY ======
// Layout (khớp parseTelemetry trong uuids.ts):
//  [0]   type=0x01
//  [1]   battery 0-100
//  [2-3] rssi int16 LE  (0 nếu chưa có)
//  [4-5] distance_cm uint16 LE (0xFFFF nếu không đo được)
//  [6]   flags: bit0=button, bit1=charging
static void sendTelemetry(bool buttonPressed) {
  if (!g_connected || !g_notifyChar) return;
  uint8_t buf[7];
  buf[0] = 0x01;
  buf[1] = readBatteryPercent();
  int16_t rssi = g_lastRssi;
  buf[2] = (uint8_t)(rssi & 0xFF);
  buf[3] = (uint8_t)((rssi >> 8) & 0xFF);
  uint16_t d = readDistanceCm();
  buf[4] = (uint8_t)(d & 0xFF);
  buf[5] = (uint8_t)((d >> 8) & 0xFF);
  uint8_t flags = 0;
  if (buttonPressed) flags |= 0x01;
  // bit1 charging: cần mạch detect riêng, để 0
  buf[6] = flags;
  g_notifyChar->setValue(buf, sizeof(buf));
  g_notifyChar->notify();
}

// ====== BLE CALLBACKS ======
class ServerCb : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* s, NimBLEConnInfo& info) override {
    g_connected = true;
    g_lastActiveMs = millis();
    Serial.println("[BLE] connected");
    // Yêu cầu kết nối ổn định, tiết kiệm pin
    s->updateConnParams(info.getConnHandle(), 24, 48, 0, 200);
  }
  void onDisconnect(NimBLEServer* s, NimBLEConnInfo& info, int reason) override {
    g_connected = false;
    g_findMode  = false;
    setHaptic(0);
    Serial.printf("[BLE] disconnected (reason=%d), restart advertising\n", reason);
    NimBLEDevice::startAdvertising();
  }
};

class CmdCb : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& info) override {
    std::string v = c->getValue();
    if (v.empty()) return;
    uint8_t cmd = (uint8_t)v[0];
    uint8_t lvl = v.size() > 1 ? (uint8_t)v[1] : 0;
    g_lastActiveMs = millis();
    g_lastRssi = info.getConnHandle() ? 0 : 0; // RSSI thực lấy ở loop()
    switch (cmd) {
      case CMD_HAPTIC_OFF:  setHaptic(0); break;
      case CMD_HAPTIC_LOW:  setHaptic(1); break;
      case CMD_HAPTIC_MED:  setHaptic(2); break;
      case CMD_HAPTIC_HIGH: setHaptic(3); break;
      case CMD_FIND_ON:
        g_findMode = true;
        setHaptic(3);
        break;
      case CMD_FIND_OFF:
        g_findMode = false;
        setHaptic(0);
        break;
      case CMD_PING:
        sendTelemetry(false);
        break;
      default: break;
    }
  }
};

static ServerCb  g_serverCb;
static CmdCb     g_cmdCb;

// ====== SETUP / DEEP SLEEP ======
static void goToDeepSleep() {
  Serial.println("[PM] entering deep sleep...");
  setHaptic(0);
  NimBLEDevice::deinit(true);
  // Wake khi nút bấm xuống LOW
  rtc_gpio_pullup_en(PIN_BUTTON);
  rtc_gpio_pulldown_dis(PIN_BUTTON);
  esp_sleep_enable_ext0_wakeup(PIN_BUTTON, 0);
  delay(100);
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);
  delay(50);
  Serial.println("\n[BlindGuard Cane] boot");

  // GPIO
  pinMode(PIN_BUTTON, INPUT_PULLUP);
#if HAS_BUZZER
  pinMode(PIN_BUZZER, OUTPUT); digitalWrite(PIN_BUZZER, LOW);
#endif
  // PWM motor
  ledcSetup(LEDC_CH_MOTOR, LEDC_FREQ_HZ, LEDC_RES_BITS);
  ledcAttachPin(PIN_MOTOR, LEDC_CH_MOTOR);
  setHaptic(0);

  // ADC pin
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_BATT, ADC_11db);

  // Cảm biến
#if USE_VL53L0X
  Wire.begin(21, 22);
  tofReady = tof.begin();
  Serial.printf("[TOF] VL53L0X %s\n", tofReady ? "ok" : "FAIL");
#else
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
#endif

  // BLE
  NimBLEDevice::init(DEVICE_NAME);
  NimBLEDevice::setPower(ESP_PWR_LVL_P3);  // -ish, đủ xa, vẫn tiết kiệm
  NimBLEServer* server = NimBLEDevice::createServer();
  server->setCallbacks(&g_serverCb);

  NimBLEService* svc = server->createService(SVC_UUID);
  NimBLECharacteristic* cmdChar = svc->createCharacteristic(
      CMD_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  cmdChar->setCallbacks(&g_cmdCb);

  g_notifyChar = svc->createCharacteristic(
      NTF_UUID, NIMBLE_PROPERTY::NOTIFY | NIMBLE_PROPERTY::READ);

  svc->start();

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(SVC_UUID);
  adv->enableScanResponse(true);
  // Beacon-friendly: advertising liên tục để app dùng RSSI
  adv->setMinInterval(0x20); // 20 ms
  adv->setMaxInterval(0x40); // 40 ms
  NimBLEDevice::startAdvertising();
  Serial.println("[BLE] advertising");

  g_lastActiveMs = millis();
}

// Tự debounce nút
static bool readButton() {
  static uint32_t lastMs = 0;
  static bool lastState = false;
  bool now = (digitalRead(PIN_BUTTON) == LOW);
  if (now != lastState && millis() - lastMs > 30) {
    lastMs = millis();
    lastState = now;
  }
  return lastState;
}

void loop() {
  static uint32_t lastTelem = 0;
  uint32_t now = millis();

  // Đọc RSSI của kết nối hiện tại (nếu có) để gửi cho app làm Find Mode
  if (g_connected) {
    NimBLEServer* s = NimBLEDevice::getServer();
    if (s && s->getConnectedCount() > 0) {
      auto peer = s->getPeerInfo(0);
      int r = NimBLEDevice::getServer()->getPeerMTU(peer.getConnHandle()) > 0
                ? peer.getConnHandle() : 0;
      (void)r;
      // NimBLE không expose RSSI realtime đơn giản trên mọi version,
      // dùng API getRssi nếu có:
      int rssi = 0;
      #ifdef NIMBLE_CPP_VERSION_MAJOR
      rssi = NimBLEDevice::getServer()->getPeerInfo(0).getConnHandle();
      #endif
      // Fallback: để 0 -> app sẽ tự đo qua advertising scan của trình duyệt.
      g_lastRssi = (int8_t)rssi;
    }
  }

  bool btn = readButton();
  if (btn) g_lastActiveMs = now;

  uint32_t interval = g_findMode ? FIND_MODE_INTERVAL_MS : TELEMETRY_INTERVAL_MS;
  if (g_connected && now - lastTelem >= interval) {
    lastTelem = now;
    sendTelemetry(btn);
  }

  // Khi không kết nối + không tương tác đủ lâu -> deep sleep
  if (!g_connected && now - g_lastActiveMs > IDLE_TIMEOUT_MS) {
    goToDeepSleep();
  }

  // Light sleep ngắn để tiết kiệm pin nhưng vẫn đáp ứng BLE stack
  delay(20);
}
