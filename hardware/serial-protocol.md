# Serial protocol: controller ↔ dashboard

USB serial, 115200 baud, one JSON object per line. The controller works without a laptop;
the link only mirrors its state and accepts a few commands.

## Telemetry (controller → laptop, every 500 ms)

```json
{"t":125400,"fresh_l":186.4,"alt_l":151.0,"sensor_ok":1,"alt_ok":1,"rain_days":7.0,
 "mode":"PRESERVE","strict":0,"runway":7.0,"gap":0.0,"allowance":5.71,"draw":25.71,
 "conv_runway":3.73,"flex_used":0.0,"valve_a":0,"valve_b":1,"flow_a":0.00,"flow_b":0.82,
 "request":"toilet","source":"alt","override":0,"critical":20.0,"flexible":30.0,"reserve":20.0,
 "event":"open:toilet:alt"}
```

| Field | Meaning |
|---|---|
| `t` | Milliseconds since boot |
| `fresh_l`, `alt_l` | Household-equivalent litres in each tank (rig litres × scale) |
| `sensor_ok` | 0 when the freshwater level sensor has failed five readings in a row |
| `alt_ok` | Alternative source usable (switch closed and not disabled by command) |
| `rain_days` | Days until the next reliable recharge, counting down each controller day |
| `mode` | `NORMAL`, `PRESERVE`, `CRITICAL` or `FAULT` |
| `strict` | 1 when no freshwater is left for flexible use |
| `runway`, `gap` | Days until the reserve floor at the planned draw; days short of the recharge |
| `allowance`, `draw` | Freshwater allowed for flexible use per day; total planned freshwater per day |
| `conv_runway` | Runway if every use drew freshwater (for comparison) |
| `flex_used` | Freshwater already spent on flexible uses today |
| `valve_a`, `valve_b` | 1 while open |
| `flow_a`, `flow_b` | Measured flow, L/min (rig scale) |
| `request`, `source` | Use being served and the source chosen |
| `override` | 1 while the household override switch forces freshwater |
| `critical`, `flexible`, `reserve` | The household plan the controller is using |
| `event` | Last event: `open:<use>:<source>`, `done:<use>`, `noflow:<use>`, `timeout:<use>`, `denied:<use>` |

## Commands (laptop → controller)

| Command | Effect |
|---|---|
| `{"request":"toilet"}` | Same as pressing a use button (`kitchen`, `toilet`, `floor`, `washing`) |
| `{"rain_days":9}` | Update the recharge forecast (from a weather forecast or climatology) |
| `{"day_ms":60000}` | Shorten the controller day for a demonstration (minimum 10 s) |
| `{"alt":0}` | Mark the alternative source unavailable (`1` to restore) |
