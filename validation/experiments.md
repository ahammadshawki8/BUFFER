# Bench validation protocol

Tests to run on the physical prototype once it is built (hardware/wiring.md). Each test has a pass
criterion and a results line to fill in. Results go in `validation/results/` as dated CSV files of the
telemetry stream (copy from the dashboard's Live device mode or a serial log).

Status: **not yet run.** The controller logic behind every test already passes its native unit tests
(`firmware/test/test_core`, 12 tests) and compiles for the ESP32 (`pio run -e esp32dev`).

## Setup

- Fill both tanks to the 4 L mark; set `{"day_ms":60000}` so one controller day lasts one minute.
- Connect the dashboard in Live device mode to record telemetry.

## Tests

| # | Test | Procedure | Pass criterion | Result |
|---|---|---|---|---|
| T1 | Level accuracy | Fill each tank in 0.5 L steps from 0.5 to 4.5 L; compare `fresh_l / 40` with the measuring jug | Error ≤ 0.15 L (≤ 6 L household) at every step | |
| T2 | Flow calibration | Run 1 L through each line into a jug, 5 times; read pulses | Pulses per litre within ±5% across runs; update `FLOW_PULSES_PER_LITRE` | |
| T3 | Metered dose | 20 requests per line | Dispensed volume 0.15 L ± 0.02 L | |
| T4 | Routing correctness | 50 mixed requests across NORMAL, PRESERVE and CRITICAL plans (set `rain_days` 2, 7, 10) | 50/50 requests open the valve `Controller::route` specifies; never both valves | |
| T5 | Daily allowance | In PRESERVE with an allowance of about 5.7 L/day, request toilet repeatedly | Freshwater serves flexible requests until `flex_used` reaches the allowance, then the alternative valve takes over; resets at the next day | |
| T6 | Forecast change | Mid-run send `{"rain_days":9}` | Mode stays PRESERVE, `strict` becomes 1, runway rises to about 9 days, flexible requests go to valve B | |
| T7 | Alternative unavailable | Open the alt-available switch | Flexible requests use freshwater only within the allowance, then report `denied` | |
| T8 | Sensor fault | Unplug the freshwater HC-SR04 ECHO wire | Within 5 readings: mode FAULT, LED blinks, drinking still served from valve A, flexible to valve B | |
| T9 | Power cut | Unplug the 12 V adapter during a request | Both valves close; drinking water reachable through the manual bypass | |
| T10 | Stuck valve | Pinch the freshwater line during a request | `noflow` reported after 3 s; valve de-energised | |
| T11 | Override | Close the override switch; request toilet in strict PRESERVE | Freshwater valve opens; telemetry `override:1`; dashboard shows runway cost | |
| T12 | Endurance | 500 requests over 2 hours with random uses | No missed or double-opened valves; no controller reset | |

## Water-level continuity check (for filmed demos)

Each dose is 0.15 L from a 5 L tank, so a whole demo of 10 requests lowers a tank by about 1.5 L (6 cm in the
bench container). Record the tape-mark level before and after any filming so footage stays consistent.
