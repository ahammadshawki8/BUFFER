// BUFFER bench controller for the ESP32.
//
// Runs fully offline: measures both tanks, plans the freshwater budget until the
// next reliable rain, and opens one valve per request. A laptop is optional; when
// connected over USB it receives one JSON telemetry line every 500 ms and may send
// commands (see docs in hardware/serial-protocol.md).
#include <Arduino.h>

#include "buffer_core.h"
#include "config.h"

using namespace buffer;

// ---------- state ----------

static Tank tank;
static Controller controller;
static LevelFilter level_fresh;
static LevelFilter level_alt;
static float fresh_l = 0;        // household litres in the freshwater tank
static float alt_l = 0;          // household litres in the alternative tank
static bool have_fresh = false;  // at least one good reading since boot
static float rain_days = DEFAULT_RAIN_DAYS;
static unsigned long day_ms = DEFAULT_DAY_MS;
static unsigned long day_started = 0;
static bool alt_cmd_ok = true;   // laptop can also mark the alternative source unavailable

static volatile uint32_t pulses_fresh = 0;
static volatile uint32_t pulses_alt = 0;
static float flow_fresh_lpm = 0;
static float flow_alt_lpm = 0;

struct Dispense {
  Use use = Use::None;
  Source source = Source::None;
  unsigned long started = 0;
  uint32_t start_pulses = 0;
  float rig_litres = 0;
};
static Dispense active;
static char last_event[48] = "boot";

// ---------- hardware helpers ----------

void IRAM_ATTR onFlowFresh() { pulses_fresh++; }
void IRAM_ATTR onFlowAlt() { pulses_alt++; }

static void setRelay(int pin, bool on) { digitalWrite(pin, (on ^ RELAY_ACTIVE_LOW) ? HIGH : LOW); }

// Only one valve may ever be open; both close on any fault (valves are normally closed).
static void setValves(Source s) {
  setRelay(PIN_RELAY_FRESH, s == Source::Fresh);
  setRelay(PIN_RELAY_ALT, s == Source::Alt);
}

static float readDistanceCm(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);
  const unsigned long us = pulseIn(echo, HIGH, 25000);  // ~4 m max
  if (us == 0) return NAN;
  return us * 0.0343f / 2.0f;
}

static bool altAvailable() { return alt_cmd_ok && digitalRead(PIN_SW_ALT_OK) == LOW; }
static bool sensorOk() { return have_fresh && !level_fresh.faulted(); }

static Plan currentPlan() {
  if (!sensorOk()) {
    Plan p;
    p.mode = Mode::Fault;
    return p;
  }
  return plan(fresh_l, rain_days, controller.hh);
}

// ---------- requests ----------

static void startRequest(Use u) {
  if (active.use != Use::None || u == Use::None) return;
  const Plan p = currentPlan();
  const Source s = controller.route(u, p, altAvailable(), sensorOk());
  if (s == Source::None) {
    snprintf(last_event, sizeof last_event, "denied:%s", useName(u));
    return;
  }
  active.use = u;
  active.source = s;
  active.started = millis();
  noInterrupts();
  active.start_pulses = s == Source::Fresh ? pulses_fresh : pulses_alt;
  interrupts();
  active.rig_litres = 0;
  setValves(s);
  snprintf(last_event, sizeof last_event, "open:%s:%s", useName(u), sourceName(s));
}

static void finishRequest(const char* why) {
  setValves(Source::None);
  if (active.source == Source::Fresh && !isCritical(active.use)) {
    controller.addFlexibleFresh(active.rig_litres * HOUSEHOLD_LITRES_PER_RIG_LITRE);
  }
  snprintf(last_event, sizeof last_event, "%s:%s", why, useName(active.use));
  active = Dispense();
}

static void serviceRequest() {
  if (active.use == Use::None) return;
  noInterrupts();
  const uint32_t now_pulses = active.source == Source::Fresh ? pulses_fresh : pulses_alt;
  interrupts();
  active.rig_litres = (now_pulses - active.start_pulses) / FLOW_PULSES_PER_LITRE;
  const unsigned long held = millis() - active.started;
  if (active.rig_litres >= DOSE_RIG_LITRES) finishRequest("done");
  else if (held > NO_FLOW_CHECK_MS && active.rig_litres < 0.005f) finishRequest("noflow");
  else if (held > DOSE_TIMEOUT_MS) finishRequest("timeout");
}

// ---------- buttons ----------

struct Button {
  int pin;
  Use use;
  bool last;
};
static Button buttons[] = {
    {PIN_BTN_DRINKING, Use::Drinking, true},
    {PIN_BTN_TOILET, Use::Toilet, true},
    {PIN_BTN_FLOOR, Use::Floor, true},
    {PIN_BTN_WASHING, Use::Washing, true},
};

static void pollButtons() {
  for (auto& b : buttons) {
    const bool now = digitalRead(b.pin);
    if (b.last && !now) startRequest(b.use);  // falling edge: pressed
    b.last = now;
  }
  controller.override_mode = digitalRead(PIN_SW_OVERRIDE) == LOW ? Override::ForceFresh : Override::Auto;
}

// ---------- serial link ----------
// Commands are single JSON-like lines, for example:
//   {"request":"toilet"}  {"rain_days":9}  {"day_ms":60000}  {"alt":0}

static void handleCommand(const char* line) {
  const char* p;
  if ((p = strstr(line, "\"request\""))) {
    char name[16] = {0};
    if (sscanf(p, "\"request\" : \"%15[^\"]\"", name) == 1 || sscanf(p, "\"request\":\"%15[^\"]\"", name) == 1) startRequest(parseUse(name));
  }
  if ((p = strstr(line, "\"rain_days\""))) {
    float v;
    if (sscanf(p, "\"rain_days\" : %f", &v) == 1 || sscanf(p, "\"rain_days\":%f", &v) == 1) rain_days = v < 0 ? 0 : v;
  }
  if ((p = strstr(line, "\"day_ms\""))) {
    unsigned long v;
    if (sscanf(p, "\"day_ms\" : %lu", &v) == 1 || sscanf(p, "\"day_ms\":%lu", &v) == 1) day_ms = v < 10000 ? 10000 : v;
  }
  if ((p = strstr(line, "\"alt\""))) {
    int v;
    if (sscanf(p, "\"alt\" : %d", &v) == 1 || sscanf(p, "\"alt\":%d", &v) == 1) alt_cmd_ok = v != 0;
  }
}

static void pollSerial() {
  static char buf[128];
  static size_t n = 0;
  while (Serial.available()) {
    const char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (n) {
        buf[n] = 0;
        handleCommand(buf);
        n = 0;
      }
    } else if (n < sizeof buf - 1) {
      buf[n++] = c;
    }
  }
}

static void sendTelemetry() {
  const Plan p = currentPlan();
  const Plan c = conventional(fresh_l, rain_days, controller.hh);
  Serial.printf(
      "{\"t\":%lu,\"fresh_l\":%.1f,\"alt_l\":%.1f,\"cap_l\":%.1f,\"sensor_ok\":%d,\"alt_ok\":%d,\"rain_days\":%.1f,"
      "\"mode\":\"%s\",\"strict\":%d,\"runway\":%.2f,\"gap\":%.2f,\"allowance\":%.2f,\"draw\":%.2f,"
      "\"conv_runway\":%.2f,\"flex_used\":%.2f,\"valve_a\":%d,\"valve_b\":%d,\"flow_a\":%.2f,\"flow_b\":%.2f,"
      "\"request\":\"%s\",\"source\":\"%s\",\"override\":%d,\"critical\":%.1f,\"flexible\":%.1f,\"reserve\":%.1f,"
      "\"event\":\"%s\"}\n",
      millis(), fresh_l, alt_l, volumeLitres(tank, tank.full_gap_cm), sensorOk(), altAvailable(), rain_days, modeName(p.mode), p.strict, p.runway_days,
      p.gap_days, p.allowance_lpd, p.draw_lpd, c.runway_days, controller.flexibleUsedToday(),
      active.source == Source::Fresh, active.source == Source::Alt, flow_fresh_lpm, flow_alt_lpm, useName(active.use),
      sourceName(active.source), controller.override_mode == Override::ForceFresh, controller.hh.critical_lpd,
      controller.hh.flexible_lpd, controller.hh.reserve_l, last_event);
}

// ---------- Arduino entry points ----------

void setup() {
  Serial.begin(SERIAL_BAUD);
  pinMode(PIN_RELAY_FRESH, OUTPUT);
  pinMode(PIN_RELAY_ALT, OUTPUT);
  setValves(Source::None);  // closed before anything else runs

  pinMode(PIN_TRIG_FRESH, OUTPUT);
  pinMode(PIN_ECHO_FRESH, INPUT);
  pinMode(PIN_TRIG_ALT, OUTPUT);
  pinMode(PIN_ECHO_ALT, INPUT);
  pinMode(PIN_FLOW_FRESH, INPUT);  // GPIO34/35 have no pull-ups; the sensor board provides one
  pinMode(PIN_FLOW_ALT, INPUT);
  attachInterrupt(digitalPinToInterrupt(PIN_FLOW_FRESH), onFlowFresh, FALLING);
  attachInterrupt(digitalPinToInterrupt(PIN_FLOW_ALT), onFlowAlt, FALLING);
  for (auto& b : buttons) pinMode(b.pin, INPUT_PULLUP);
  pinMode(PIN_SW_OVERRIDE, INPUT_PULLUP);
  pinMode(PIN_SW_ALT_OK, INPUT_PULLUP);
  pinMode(PIN_STATUS_LED, OUTPUT);

  tank.height_cm = TANK_HEIGHT_CM;
  tank.area_cm2 = TANK_AREA_CM2;
  tank.full_gap_cm = TANK_FULL_GAP_CM;
  tank.scale = HOUSEHOLD_LITRES_PER_RIG_LITRE;
  controller.hh.critical_lpd = CRITICAL_LPD;
  controller.hh.flexible_lpd = FLEXIBLE_LPD;
  controller.hh.reserve_l = RESERVE_L;
  day_started = millis();
}

void loop() {
  static unsigned long last_sense = 0, last_flow = 0, last_tx = 0;
  static uint32_t prev_fresh = 0, prev_alt = 0;
  static bool sense_fresh_next = true;
  const unsigned long now = millis();

  pollSerial();
  pollButtons();
  serviceRequest();

  // Alternate the two ultrasonic sensors so their pings never overlap.
  if (now - last_sense >= 60) {
    last_sense = now;
    float d, filtered;
    if (sense_fresh_next) {
      d = readDistanceCm(PIN_TRIG_FRESH, PIN_ECHO_FRESH);
      if (level_fresh.push(d, filtered)) {
        fresh_l = volumeLitres(tank, filtered);
        have_fresh = true;
      }
    } else {
      d = readDistanceCm(PIN_TRIG_ALT, PIN_ECHO_ALT);
      if (level_alt.push(d, filtered)) alt_l = volumeLitres(tank, filtered);
    }
    sense_fresh_next = !sense_fresh_next;
  }

  if (now - last_flow >= 500) {
    noInterrupts();
    const uint32_t f = pulses_fresh, a = pulses_alt;
    interrupts();
    const float minutes = (now - last_flow) / 60000.0f;
    flow_fresh_lpm = (f - prev_fresh) / FLOW_PULSES_PER_LITRE / minutes;
    flow_alt_lpm = (a - prev_alt) / FLOW_PULSES_PER_LITRE / minutes;
    prev_fresh = f;
    prev_alt = a;
    last_flow = now;
  }

  // Each controller day: reset the flexible allowance and count down to the rain.
  if (now - day_started >= day_ms) {
    day_started = now;
    controller.newDay();
    rain_days = rain_days > 1 ? rain_days - 1 : 0;
  }

  // Status LED: steady = automatic, blinking = sensor fault.
  digitalWrite(PIN_STATUS_LED, sensorOk() ? HIGH : ((now / 250) % 2));

  if (now - last_tx >= TELEMETRY_MS) {
    last_tx = now;
    sendTelemetry();
  }
}
