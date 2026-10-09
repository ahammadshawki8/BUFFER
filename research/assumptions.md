# Assumptions register

Every value BUFFER's results depend on, where it comes from, how sensitive the results are to it,
and how a field pilot would replace it with a measurement (PROJECT.md §86, §88).

| # | Assumption | Value used | Basis | Sensitivity tested | How to validate |
|---|---|---|---|---|---|
| A1 | Household size | 5 people | Typical rural household size used in the brief | 3 and 7 people (REPORT.md) | Household survey |
| A2 | Drinking + cooking water | 4 L per person per day (20 L) | Below the Sphere minimum for all uses; covers drinking (2.5-3 L) and cooking | ±15% daily noise (Monte Carlo) | Diary or flow-meter study of the kitchen tap |
| A3 | Flexible use normally taken from stored rainwater | 6 L per person per day (30 L) | Share of non-drinking use that households report taking from rainwater | ±30% daily noise (Monte Carlo) | Flow metering of the flexible tap for 2-4 weeks |
| A4 | Rainwater tank | 3,000 L | Common household plastic tank sizes in coastal programmes | 1,000-5,000 L sweep | Installation records from partner NGO |
| A5 | Roof catchment and runoff | 40 m², coefficient 0.8, 0.5 mm first flush | Small tin roof; typical tin-roof runoff coefficient | Not swept (storage, not catchment, limits the dry season) | Measure the roof; compare inflow to tank level after rain |
| A6 | Protected reserve | 3 days of drinking water (60 L) | Buffer against forecast error | Implicit in forecast-quantile test | Agree with households and the NGO |
| A7 | Reliable recharge | 30 mm of rain within 3 days | Enough rain on a 40 m² roof to put about 1,000 L back in the tank | Not swept | Compare with observed tank refills |
| A8 | Forecast | 75th-percentile climatology from other seasons + a reliable 3-day forecast | Deployable without internet | 50th and 90th percentile | Back-test against Bangladesh Meteorological Department forecasts |
| A9 | Alternative source availability | Always available | Pond or second tank | Unavailable March-May (pond dries) | Seasonal survey of the household's other sources |
| A10 | Alternative source suitability | Toilet, floor cleaning, selected washing only | PROJECT.md §14; to be pre-qualified per household | Not modelled (quality is outside the model) | Water-quality testing by the partner NGO; local health guidance |
| A11 | Compliance | Automatic valves: 100%; advice only: 40-100% tested | Valves enforce routing | 0-100% sweep | Pilot logs of overrides and advice followed |
| A12 | Rainfall | NASA POWER daily PRECTOTCORR, 0.5° grid, Koyra cell | Gridded reanalysis, not a gauge at the house | One cell, 34 seasons | Compare with the nearest BMD rain gauge (Khulna, Satkhira) |
| A13 | Bench prototype scale | 5 L bench tank = 200 L household reserve (×40) | Demo convenience | n/a | n/a (demonstration only) |
| A14 | Component prices | Retail, October 2026 (hardware/bom.csv) | Bangladeshi online retailers | n/a | Supplier quotes for volume |

## Results that do **not** depend much on these assumptions

- BUFFER's advantage over conventional use holds across every tank size, household size and forecast setting tested.
- BUFFER's advantage over the static rule (less alternative water for the same protection) holds in every run.

## Results that **do** depend on them

- The absolute number of shortage days depends strongly on tank size (A4) and demand (A2, A3).
- The value of advice-only mode depends entirely on compliance (A11), which is unknown until a pilot.
