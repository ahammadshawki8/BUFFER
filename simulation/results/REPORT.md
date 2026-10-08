# BUFFER simulation results

All numbers below are **SIMULATED** with real rainfall. Household values are **ASSUMPTIONS** for
scenario testing, not field measurements (PROJECT.md §88). Regenerate everything with:

```
python -m buffer_sim.experiments && python -m buffer_sim.report
```

## Data and method

- **Rainfall (real):** NASA POWER daily PRECTOTCORR, 1991-06-01 to 2025-05-31 (34 dry seasons), at Koyra, Khulna, Bangladesh (22.34 N, 89.3 E).
- **Water balance, daily:** roof inflow (rain minus a 0.5 mm first flush, x 40.0 m² x runoff 0.8) fills a 3,000 L tank; overflow is lost. Drinking and cooking are always served first.
- **Reliable recharge:** a spell with at least 30 mm of rain over three days.
- **BUFFER's forecast:** climatology 75th percentile of days-to-recharge from the other 33 seasons, plus a reliable 3-day weather forecast. Each season is evaluated with a forecast built only from the *other* seasons, so it never sees its own future.
- **Shortage day:** a day on which drinking and cooking (20 L) cannot be fully met from freshwater.

| Household assumption | Value |
|---|---|
| People | 5 |
| Drinking + cooking | 4.0 L per person per day (20 L) |
| Flexible uses normally taken from stored rainwater | 6.0 L per person per day (30 L) |
| Freshwater tank | 3,000 L |
| Roof catchment | 40.0 m², runoff coefficient 0.8 |
| Protected critical reserve | 3 days (60 L) |
| Alternative source | always available (see the dry-pond test below) |

## The five policies

| Policy | Rule |
|---|---|
| Conventional | Every use draws freshwater until the tank is empty |
| Static rule | Flexible uses always go to the alternative source |
| Tank threshold | Flexible uses switch to the alternative once the tank falls below 25% |
| **BUFFER** | Flexible uses may only spend freshwater beyond the protected reserve and the drinking water needed until the forecast recharge (PROJECT.md §42) |
| BUFFER, perfect recharge date | Same rule, but told the true date of the next recharge spell |

## Results over 34 dry seasons (1991-92 to 2024-25)

| Policy | Mean shortage days per season | Seasons with any shortage | Worst season (days) | Alternative water used (L per season) | Freshwater for flexible uses (L per season) |
|---|---|---|---|---|---|
| Conventional | 70.5 | 34 of 34 | 114 | 2,176 | 8,782 |
| Static rule | 0.5 | 3 of 34 | 9 | 10,958 | 0 |
| Tank threshold | 32.1 | 29 of 34 | 86 | 3,277 | 7,681 |
| **BUFFER** | 0.5 | 3 of 34 | 9 | 5,086 | 5,872 |
| BUFFER, perfect recharge date | 1.0 | 4 of 34 | 16 | 4,208 | 6,750 |

![Freshwater through a median dry season](figures/example_season.png)

![Shortage days in every season](figures/shortage_by_season.png)

## What this shows

1. **The problem is real in this rainfall record.** With conventional use, the household runs out of
   drinking water in **34 of 34** seasons, for **70.5 days** on average.
2. **BUFFER removes almost all of it.** Mean shortage falls to **0.5 days**, and **31 of 34**
   seasons have no shortage at all. That is **70.0 freshwater-days gained per season** and
   **1,367 L** of unmet drinking and cooking water avoided.
3. **BUFFER matches the static rule's reliability while using 54% less alternative water**
   (10,958 L against 5,086 L per season). The static rule protects freshwater by never
   using it for flexible tasks, even in the wet season when the tank overflows. BUFFER only restricts
   use when the forecast says the reserve is at risk, so the household keeps using its best water whenever that is safe.
4. **Planning conservatively beats knowing the date.** BUFFER with the true recharge date does slightly *worse*
   (1.0 days) than BUFFER with the 75th-percentile climatology, because one recharge spell does not
   guarantee steady rain afterwards. A cautious forecast is both deployable and safer.

![Reliability against reliance on alternative water](figures/tradeoff.png)

## Where BUFFER is useful, neutral, and insufficient (PROJECT.md §51)

### Tank size

| Tank | Conventional | Tank threshold | Static rule | BUFFER | Alternative used, static rule (L) | Alternative used, BUFFER (L) |
|---|---|---|---|---|---|---|
| 1,000 L | 114.1 | 91.3 | 55.1 | 55.5 | 10,958 | 5,945 |
| 1,500 L | 101.5 | 72.6 | 32.4 | 32.9 | 10,958 | 5,650 |
| 2,000 L | 90.5 | 57.6 | 12.8 | 12.9 | 10,958 | 5,485 |
| 3,000 L | 70.5 | 32.1 | 0.5 | 0.5 | 10,958 | 5,086 |
| 4,000 L | 51.3 | 11.4 | 0.0 | 0.0 | 10,958 | 4,415 |
| 5,000 L | 33.3 | 2.2 | 0.0 | 0.0 | 10,958 | 3,525 |

- **Useful:** from about 3,000 L upward BUFFER brings shortage to zero or near zero while halving reliance on alternative water.
- **Neutral:** for small tanks BUFFER and the static rule give the same reliability, because neither can afford any flexible freshwater.
- **Insufficient:** at 1,000-2,000 L even drinking and cooking alone outlast the stored water in many seasons.
  BUFFER cannot create water; these households need more storage, and BUFFER's runway number tells them how much.

![Shortage days by tank size](figures/tank_sweep.png)

### When the pond dries up (alternative unavailable March to May)

| Policy | Mean shortage days | Flexible water not served (L per season) |
|---|---|---|
| Conventional | 70.5 | 903 |
| Static rule | 9.0 | 287 |
| Tank threshold | 42.4 | 830 |
| **BUFFER** | 0.5 | 1,075 |
| BUFFER, perfect recharge date | 1.0 | 975 |

When the alternative source fails late in the dry season, the static rule and the threshold rule fall back
to freshwater and run out (static rule: 9.0 days). BUFFER still holds shortage to
0.5 days. The cost is honest: about 1,075 L of flexible use per season goes unserved,
which BUFFER makes visible as a choice instead of a surprise.

### Household size

| People | Conventional | Static rule | BUFFER |
|---|---|---|---|
| 3 | 20.5 | 0.0 | 0.0 |
| 5 | 70.5 | 0.5 | 0.5 |
| 7 | 99.9 | 15.0 | 15.7 |

### Forecast caution

| BUFFER plans for the recharge date exceeded in | Mean shortage days | Seasons with shortage | Alternative used (L) |
|---|---|---|---|
| 50% of past seasons (quantile 0.5) | 0.9 | 3 | 4,450 |
| 25% of past seasons (quantile 0.75) | 0.5 | 3 | 5,086 |
| 9% of past seasons (quantile 0.9) | 0.5 | 3 | 5,442 |

Results barely change across forecast settings: BUFFER does not depend on a precise forecast.

## Uncertainty: 2,000 resampled seasons with noisy demand

Each run draws one of the 34 real seasons at random and varies daily demand
(drinking and cooking about ±15%, flexible use about ±30%).

| Policy | Chance of any shortage in a season | Mean shortage days | 90th-percentile season |
|---|---|---|---|
| Conventional | 99.9% | 72.5 | 107 |
| Static rule | 8.2% | 0.6 | 0 |
| Tank threshold | 85.4% | 33.4 | 59 |
| **BUFFER** | 8.2% | 0.6 | 0 |

## Automatic valves against advice only

In advice-only mode (BUFFER Lite) the household decides whether to follow the routing. Here it follows
the advice on a random share of days and uses freshwater for everything on the others.

| Days the advice is followed | Mean shortage days | Seasons with shortage |
|---|---|---|
| 100% | 0.5 | 3 of 34 |
| 80% | 8.1 | 14 of 34 |
| 60% | 28.1 | 30 of 34 |
| 40% | 45.4 | 31 of 34 |
| 0% | 70.5 | 34 of 34 |

Every missed day spends freshwater the household will need later, so the benefit falls quickly:
following the advice 80% of the time already raises shortage from 0.5 to
8.1 days a season. This is the case for automatic valves in the
BUFFER Control tier, and for advice-only mode as an entry product rather than the end state.

## Sensor failure

With the freshwater level sensor down for all of January every season, BUFFER falls back to protecting
freshwater (no flexible allowance), exactly as the firmware does. Mean shortage stays at
**0.5 days**: a month-long outage in the driest stretch costs nothing.

## Limitations

- Household demand, roof area, tank size and reserve are assumptions; they must be replaced with field values.
- NASA POWER is a gridded reanalysis product (0.5 degree), not a rain gauge at the house.
- The model assumes the household follows the routing (automatic valves make this realistic; advisory mode would not).
- Water quality is outside the model: the alternative source is assumed pre-qualified for its permitted uses (PROJECT.md §14).
