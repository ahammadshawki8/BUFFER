# BUFFER

**Protect the water you cannot replace.** Adaptive freshwater reserve management for
climate-vulnerable households. Xylem Global Student Innovation Challenge 2026, University track,
Water Access.

BUFFER treats a household's stored rainwater like a battery. It works out how many days of
drinking and cooking water remain, compares that with the next reliable rain, and routes
flexible uses (toilet, floor cleaning, selected washing) to a pre-qualified alternative source
before the critical reserve runs out.

## Results so far

Simulated over 34 real dry seasons of rainfall in Koyra, Khulna (NASA POWER, 1991-2025), for a
5-person household with a 3,000 L tank:

| | Without BUFFER | With BUFFER |
|---|---|---|
| Days without enough drinking water, per season | 70.5 | 0.5 |
| Seasons with any shortage | 34 of 34 | 3 of 34 |

BUFFER matches the protection of always using the alternative source while using 54% less of it.
Details: [simulation/results/REPORT.md](simulation/results/REPORT.md) and [docs/IMPACT.md](docs/IMPACT.md).

## Repository

| Path | Contents |
|---|---|
| [PROJECT.md](PROJECT.md) | Full project brief: problem, research basis, design, plan |
| [simulation/](simulation/) | Daily water-balance model, baselines, sensitivity runs, report and figures |
| [dashboard/](dashboard/) | 3D digital-twin dashboard: guided demo and Explore mode driven by the model |
| [docs/IMPACT.md](docs/IMPACT.md) | Impact numbers with evidence labels and beneficiary funnel |
| [xylem_global_student_innovation_challenge_2026_research_corpus.md](xylem_global_student_innovation_challenge_2026_research_corpus.md) | Competition research corpus |

## Run

```
cd simulation && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m buffer_sim.experiments && .venv/Scripts/python -m buffer_sim.report

cd ../dashboard && npm install && npm run dev
```

In the dashboard, switch between **Guided demo** and **Explore** at the top. Explore lets you change
household size, storage, demand, rain date and the alternative source, and watch BUFFER replan.
