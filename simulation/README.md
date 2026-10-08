# BUFFER simulation

Daily household water-balance model that tests BUFFER's allocation rule against three
baselines over 34 real dry seasons of rainfall from Koyra, Khulna (NASA POWER, 1991-2025).

Results, figures and the full write-up: [results/REPORT.md](results/REPORT.md).

## Run

```
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt      # macOS/Linux: .venv/bin/pip
.venv/Scripts/python -m pytest                     # model tests
.venv/Scripts/python -m buffer_sim.experiments      # all runs, figures, dashboard data
.venv/Scripts/python -m buffer_sim.report           # results/REPORT.md
.venv/Scripts/python -m buffer_sim.data             # re-download rainfall (optional)
```

## Layout

| Path | What it is |
|---|---|
| `buffer_sim/model.py` | Household parameters, water balance, the five allocation policies |
| `buffer_sim/experiments.py` | Base case, tank/household/forecast/dry-pond sweeps, impact numbers |
| `buffer_sim/figures.py` | Report and slide figures |
| `buffer_sim/report.py` | Generates `results/REPORT.md` from `results/summary.json` |
| `data/raw/` | NASA POWER daily rainfall, Koyra (22.34 N, 89.30 E) |
| `results/` | `summary.json`, `REPORT.md`, `figures/` |

`experiments.py` also writes `../dashboard/src/data/evidence.json`, which the dashboard shows.
