# BUFFER

**Protect the water you cannot replace.** Adaptive freshwater reserve management for
climate-vulnerable households. Xylem Global Student Innovation Challenge 2026, University track,
Water Access.

BUFFER treats a household's stored rainwater like a battery. It works out how many days of
drinking and cooking water remain, compares that with the next reliable rain, and routes
flexible uses (toilet, floor cleaning, selected washing) to a pre-qualified alternative source
before the critical reserve runs out. Drinking and cooking always get freshwater.

## Results so far (simulated)

34 real dry seasons of rainfall in Koyra, Khulna (NASA POWER, 1991-2025), 5-person household, 3,000 L tank:

| | Without BUFFER | With BUFFER |
|---|---|---|
| Days without enough drinking water, per season | 70.5 | 0.5 |
| Seasons with any shortage | 34 of 34 | 3 of 34 |
| Chance of a shortage in a season (2,000 resampled seasons, noisy demand) | 99.9% | 8.2% |

BUFFER matches the protection of always using the alternative source while using 54% less of it, and
stays protected when the alternative dries up. Household values are assumptions until a field pilot measures them.
Details: [simulation/results/REPORT.md](simulation/results/REPORT.md), [docs/IMPACT.md](docs/IMPACT.md).

## Status

| | |
|---|---|
| **Built and tested** | Simulation on real rainfall, ESP32 controller firmware, 3D dashboard (guided demo, Explore, Live device) |
| **Simulated, not measured** | All household results: household demand, tank size and roof area are assumptions ([research/assumptions.md](research/assumptions.md)) |
| **Not built yet** | The physical bench prototype (parts list ready, about 5,800 BDT). Prototype footage in the submission video is an AI-generated visualisation of the planned setup |
| **In progress** | Three stakeholder conversations: a WASH researcher, an NGO field officer and a coastal household ([research/stakeholder-notes.md](research/stakeholder-notes.md)) |
| **Planned** | Bench tests ([validation/experiments.md](validation/experiments.md)) and a 20-household dry-season pilot ([docs/PILOT_PLAN.md](docs/PILOT_PLAN.md)) |

## What is in this repository

| Path | Contents | Status |
|---|---|---|
| [PROJECT.md](PROJECT.md) | Project brief: problem, research basis, design, plan | |
| [simulation/](simulation/) | Daily water-balance model, 5 policies, sweeps, Monte Carlo, compliance and sensor-outage runs | 10 tests passing |
| [firmware/](firmware/) | ESP32 controller: sensing, planning, valve routing, fail-safes, USB telemetry | 12 native tests passing; builds for ESP32 |
| [dashboard/](dashboard/) | 3D digital twin: guided demo, Explore mode on the model, Live device mode over Web Serial | Builds; scripted browser checks |
| [hardware/](hardware/) | Priced bill of materials, wiring and pin map, serial protocol, household retrofit plan | |
| [validation/](validation/) | Bench test protocol with pass criteria | Not yet run (no physical prototype yet) |
| [research/](research/) | Bibliography, prior-art comparison, assumptions register, stakeholder conversation notes | |
| [docs/](docs/) | Impact, failure modes, deployment and business model, field pilot plan | |
| [xylem_global_student_innovation_challenge_2026_research_corpus.md](xylem_global_student_innovation_challenge_2026_research_corpus.md) | Competition research corpus | |

## Run it

```
# simulation
cd simulation && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m pytest
.venv/Scripts/python -m buffer_sim.experiments && .venv/Scripts/python -m buffer_sim.report

# dashboard
cd dashboard && npm install && npm run dev

# firmware (PlatformIO)
cd firmware && pio test -e native && pio run -e esp32dev
```

In the dashboard, switch between **Guided demo**, **Explore** and **Live device** at the top.
