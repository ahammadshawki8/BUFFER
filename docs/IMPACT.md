# BUFFER impact

Every number carries an evidence label (PROJECT.md §88):

- **SIMULATED**: produced by `simulation/` with real NASA POWER rainfall for Koyra, Khulna, 1991-2025
- **LITERATURE**: reported in a cited source
- **ASSUMPTION**: chosen for scenario testing, to be replaced with field values

Full method and every table: [simulation/results/REPORT.md](../simulation/results/REPORT.md).

---

## 1. Per household, per dry season

Reference household (**ASSUMPTION**): 5 people, 3,000 L rainwater tank, 40 m² tin roof,
20 L/day for drinking and cooking, 30 L/day of flexible use normally taken from the tank,
a pond-type alternative source for non-drinking uses.

| Metric | Without BUFFER | With BUFFER | Label |
|---|---|---|---|
| Days without enough drinking and cooking water | **70.5** per season | **0.5** per season | SIMULATED |
| Seasons with any shortage, out of 34 | 34 | 3 | SIMULATED |
| Worst season | 114 days | 9 days | SIMULATED |
| Unmet drinking and cooking water | 1,376 L per season | 9 L per season | SIMULATED |

**Headline: about 70 freshwater-days gained per household per dry season** (SIMULATED).

Under uncertainty (2,000 resampled seasons with day-to-day demand varying ±15% for drinking and ±30% for
flexible use), the chance that a season has any shortage falls from **99.9%** to **8.2%** (SIMULATED).

### Why not just "always use the pond for non-drinking tasks"?

A fixed rule that always sends flexible uses to the alternative source reaches the same reliability
(0.5 shortage days), but it makes the household draw **10,958 L** of lower-quality water every season,
including in the monsoon when the rainwater tank is overflowing. BUFFER restricts use only when the
forecast says the reserve is at risk: **5,086 L, 54% less alternative water**, for the same protection
(SIMULATED). Less pond water used means less carrying and less exposure for washing tasks.

And when the pond itself dries up from March to May, the fixed rule falls back on freshwater and runs
short for **9.0 days** a season, while BUFFER stays at **0.5** (SIMULATED).

### Does the model behave like the real places?

Run the way households already behave (rainwater kept for drinking and cooking) with published household values,
the model reproduces four of five published field figures for household tanks of 500-3,000 L: a 4.7-month storage
period, 91% of households unable to store enough for the year, 2.84 months a year without reliable water in Koyra,
and 27% year-round access. It does not reproduce the five-upazila average of 4.65 months without reliable water,
which is worse than the model gives even for a 500 L tank (SIMULATED vs LITERATURE; simulation/results/REPORT.md).

### With published household values instead of ours

4 people, 6 L/person/day for drinking and cooking, 2,000 L tank (the UNDP coastal adaptation tank): shortage falls
from 88 to 31 days a season. The remaining 31 days cannot be fixed by any routing: a 2,000 L tank does not hold a
dry season of drinking water at 24 L/day. With 3,000 L it falls to 4 days (SIMULATED, LITERATURE inputs).

### At other locations

Across five Bangladeshi coastal sites, conventional use runs short 59-71 days a season and BUFFER 0-0.5 days, using
less than half the alternative water of a fixed rule. In drought-prone Rajshahi and in Chennai (a different monsoon),
BUFFER needs a more cautious forecast setting to stay close to the fixed rule (SIMULATED).

## 2. Where it helps, and where it doesn't (PROJECT.md §51)

| Situation | Result | Label |
|---|---|---|
| Tank 3,000-5,000 L | Shortage removed or nearly removed | SIMULATED |
| Tank 1,000-2,000 L | BUFFER and the fixed rule tie at 13-55 shortage days; storage itself is too small | SIMULATED |
| 7-person household, 3,000 L | 99.9 → 15.7 shortage days | SIMULATED |
| 3-person household, 3,000 L | 20.5 → 0 shortage days | SIMULATED |
| Forecast caution varied (50th-90th percentile) | 0.5-0.9 shortage days; BUFFER does not need a precise forecast | SIMULATED |

For households with small tanks, BUFFER's honest job is to **show the gap early** ("your runway is 40 days,
rain is 75 days away") so NGOs can target storage upgrades where they matter most.

## 3. Who could benefit

This is a beneficiary funnel, not a market-size claim (PROJECT.md §34). Only layers with a source are quantified.

| Layer | Number | Label |
|---|---|---|
| People worldwide without safely managed drinking water | 2.2 billion | LITERATURE (WHO/UNICEF JMP, via the Xylem 2026 Water Access brief) |
| People in coastal Bangladesh affected by freshwater salinisation and contamination | over 35 million | LITERATURE (BRAC/BIGD; broad context, not BUFFER's direct market) |
| Koyra households using rainwater in the monsoon | 100% | LITERATURE (Cleaner Water, 2025) |
| Koyra households keeping year-round access | 27% | LITERATURE (Cleaner Water, 2025) |
| Initial deployment unit | households with an existing rainwater tank and a second, non-drinking source | ASSUMPTION |

The gap between 100% and 27% is the problem BUFFER targets: households already collect rainwater, but
for most of them it does not last through the dry season.

## 4. Scaling, stated carefully

If the simulated per-household result held in the field (it has not yet been measured):

| Deployment | Household shortage-days avoided per dry season |
|---|---|
| One existing programme, e.g. WaterAid's 29 household systems in Paikgacha (LITERATURE: 29 systems, 123 people) | about 2,000 |
| 1,000 households | about 70,000 |
| 10,000 households | about 700,000 |

Label: **SIMULATED x ASSUMPTION**. These are illustrations of scale, not forecasts. Field pilots
(PROJECT.md §47) are needed to measure the real effect, including how often households override routing.

## 5. Sustainability and equity notes

- BUFFER adds no new water source and no treatment chemistry; it increases the useful life of rainwater
  storage that NGOs and households have already paid for.
- It never blocks access: drinking and cooking are always served first, and manual override stays available (PROJECT.md §46).
- It does not judge water safety. The alternative source is used only for uses it was pre-qualified for (PROJECT.md §14).

## Sources

- NASA POWER daily rainfall (PRECTOTCORR), https://power.larc.nasa.gov/
- WHO/UNICEF Joint Monitoring Programme, as cited in the Xylem Global Student Innovation Challenge 2026 Water Access brief
- BRAC Institute of Governance and Development, *Enhancing Safe Drinking Water Security and Climate Resilience Through Rainwater Harvesting*
- *Drinking water management: Challenges and adaptive strategies in salinization-affected coastal communities of Bangladesh*, Cleaner Water, 2025, doi:10.1016/j.clwat.2025.100171
- WaterAid Bangladesh (2025), *Household rainwater harvesting system*
