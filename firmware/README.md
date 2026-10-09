# BUFFER controller firmware (ESP32)

Runs the BUFFER bench prototype on its own, with no laptop or internet needed:

- measures both tanks with HC-SR04 ultrasonic sensors (median filter, fault latch)
- plans the freshwater budget until the next reliable rain, with the same rule as `simulation/` and `dashboard/`
- serves each use request from the right source through one of two 12 V solenoid valves, metered by a YF-S201 flow sensor
- keeps a daily account of freshwater spent on flexible uses
- obeys a household override switch and an "alternative available" switch
- on a level-sensor fault, keeps drinking water flowing and protects the freshwater reserve
- streams JSON telemetry over USB for the dashboard's Live device mode ([protocol](../hardware/serial-protocol.md))

## Layout

| Path | Contents |
|---|---|
| `lib/buffer_core/` | Hardware-free controller logic: plan, routing, level filter, tank volume |
| `src/main.cpp` | ESP32 program: sensors, valves, buttons, serial link |
| `include/config.h` | Pin map, tank geometry, household plan, timing |
| `test/test_core/` | Unity tests for `buffer_core`, run on this computer |

## Build, test, flash

Install [PlatformIO Core](https://platformio.org/install/cli), then from this folder:

```
pio test -e native            # 12 controller logic tests (needs a host C++ compiler)
pio run -e esp32dev           # build for the ESP32 DevKit V1
pio run -e esp32dev -t upload # flash over USB
pio device monitor            # watch the telemetry
```

Current build: RAM 6.8%, flash 23.1% of an ESP32-WROOM-32.

Wiring and calibration: [hardware/wiring.md](../hardware/wiring.md). Bench tests: [validation/experiments.md](../validation/experiments.md).
