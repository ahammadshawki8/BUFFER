# Failure modes and safeguards

A controller that sits between a family and its drinking water must fail safely. The rule BUFFER
follows everywhere: **when in doubt, keep drinking water reachable and protect the freshwater reserve.**

Severity, likelihood and detection are scored 1 (low) to 5 (high); RPN = S × L × D (higher means act first).

| # | Failure | Effect on the household | S | L | D | RPN | Safeguard (where it is implemented) |
|---|---|---|---|---|---|---|---|
| F1 | Level sensor gives no echo or nonsense readings | Plan based on a wrong volume | 4 | 3 | 1 | 12 | Median-of-five filter rejects outliers; after 5 bad readings the controller enters FAULT, protects freshwater (no flexible allowance) and blinks the status LED (`buffer_core` LevelFilter, `Controller::route`). Simulated: a January-long outage adds no shortage days (REPORT.md) |
| F2 | Sensor reads too high (dirt, condensation) | Over-estimates water, allows too much flexible use | 4 | 2 | 3 | 24 | Flow-metered draw is checked against the level drop over each day; mismatch flags recalibration (pilot task). Conservative 75th-percentile forecast and protected reserve absorb moderate error |
| F3 | Valve stuck closed | Requested water does not arrive | 3 | 2 | 1 | 6 | No-flow detection after 3 s closes the valve and reports `noflow` (firmware `serviceRequest`); manual bypass tap on the freshwater line |
| F4 | Valve stuck open | Tank drains to the outlet | 4 | 1 | 2 | 8 | Metered dose with a 10 s timeout de-energises the relay; normally-closed valves close without power |
| F5 | Power cut | No automatic routing | 3 | 4 | 1 | 12 | Valves fail closed; manual bypass tap keeps drinking water available; solar + battery option in the field design |
| F6 | Controller crash or hang | Routing stops | 3 | 2 | 2 | 12 | Valves close when the relay output drops; production firmware adds the ESP32 task watchdog |
| F7 | Both valves open at once | Lines could mix | 5 | 1 | 1 | 5 | `setValves` can only ever energise one valve; field design adds a check valve where the two lines meet |
| F8 | Recharge forecast wrong (rain later than planned) | Reserve used up before rain | 5 | 3 | 2 | 30 | Plans for the 75th-percentile recharge date, keeps a protected reserve, replans every day as the forecast changes. Monte Carlo: 8.2% of seasons see any shortage, mostly from tanks too small for drinking water alone |
| F9 | Alternative source dries up | Flexible uses lose their source | 3 | 4 | 2 | 24 | Household marks it unavailable (switch or dashboard); BUFFER then limits flexible freshwater instead of draining the reserve. Simulated: 0.5 shortage days against 9.0 for a static rule |
| F10 | Alternative water unsafe for an assigned use | Health risk | 5 | 2 | 4 | 40 | BUFFER never judges water quality; uses are assigned only after pre-qualification by the NGO and local health guidance (PROJECT.md §14); drinking and cooking are hard-wired to freshwater and cannot be re-routed |
| F11 | Household overrides routing often | Reserve not protected | 3 | 3 | 1 | 9 | Override is always allowed (PROJECT.md §46); the dashboard shows its runway cost at once; the pilot logs overrides to learn why |
| F12 | Household misunderstands the display | Wrong decisions in advice-only mode | 3 | 3 | 3 | 27 | Three-colour lights with icons, Bangla card, walk-through at installation; usability test in the pilot (PILOT_PLAN.md) |

## Highest-priority risks

1. **F10 water quality (RPN 40).** Not solvable by electronics. Handled by process: pre-qualification of the
   alternative source and a fixed rule that drinking and cooking are always freshwater.
2. **F8 forecast error (RPN 30).** Handled by conservative planning; quantified in the Monte Carlo runs.
3. **F12 and F9 (RPN 27, 24).** Handled by interface design and the availability switch; to be measured in the pilot.
