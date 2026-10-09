// Pin map and calibration for the BUFFER bench prototype (ESP32 DevKit V1).
// Wiring: hardware/wiring.md
#pragma once

// HC-SR04 ultrasonic level sensors (ECHO through a 5 V -> 3.3 V divider).
#define PIN_TRIG_FRESH 5
#define PIN_ECHO_FRESH 18
#define PIN_TRIG_ALT 19
#define PIN_ECHO_ALT 21

// YF-S201 hall-effect flow sensors (signal through a divider; input-only pins).
#define PIN_FLOW_FRESH 34
#define PIN_FLOW_ALT 35
#define FLOW_PULSES_PER_LITRE 450.0f  // YF-S201 datasheet: F = 7.5 x Q (L/min)

// 2-channel relay module driving the two normally-closed 12 V solenoid valves.
#define PIN_RELAY_FRESH 26  // valve A
#define PIN_RELAY_ALT 27    // valve B
#define RELAY_ACTIVE_LOW 1  // most hobby relay modules switch on a LOW input

// Use-request buttons (to GND, internal pull-ups) and the override switch.
#define PIN_BTN_DRINKING 13
#define PIN_BTN_TOILET 14
#define PIN_BTN_FLOOR 32
#define PIN_BTN_WASHING 33
#define PIN_SW_OVERRIDE 25  // closed = household forces freshwater for every use
#define PIN_SW_ALT_OK 23    // closed = alternative source available (open if the pond is dry)
#define PIN_STATUS_LED 2

// Tank geometry (5 L food-storage container) and the household scale it represents.
#define TANK_HEIGHT_CM 20.0f
#define TANK_AREA_CM2 250.0f
#define TANK_FULL_GAP_CM 4.0f
#define HOUSEHOLD_LITRES_PER_BENCH_LITRE 40.0f  // 5 L bench tank ~ 200 L household reserve

// Household plan (household litres per day). Same values as the dashboard demo.
#define CRITICAL_LPD 20.0f
#define FLEXIBLE_LPD 30.0f
#define RESERVE_L 20.0f
#define DEFAULT_RAIN_DAYS 7.0f

// One request dispenses a metered dose; a dry line or stuck valve times out.
#define DOSE_BENCH_LITRES 0.15f
#define DOSE_TIMEOUT_MS 10000
#define NO_FLOW_CHECK_MS 3000

// Length of a "day" for the daily allowance. 86400000 in a home; shorter for demos.
#define DEFAULT_DAY_MS 86400000UL

#define TELEMETRY_MS 500
#define SERIAL_BAUD 115200
