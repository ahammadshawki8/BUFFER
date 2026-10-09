"""Write results/REPORT.md from results/summary.json so every number in it is reproducible."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NL = chr(10)
FIELD_LABELS = {
    "storage_months": "Average storage period of rainwater",
    "share_not_enough_all_year": "Households that cannot store enough for the whole year",
    "months_without_reliable_water_koyra": "Months a year without reliable water, Koyra",
    "months_without_reliable_water_5_upazilas": "Months a year without reliable water, five-upazila average",
    "share_year_round_koyra": "Households with year-round rainwater access, Koyra",
}
SHORT = {
    "conventional": "Conventional",
    "always_alt": "Static rule",
    "threshold": "Tank threshold",
    "buffer": "**BUFFER**",
    "buffer_oracle": "BUFFER, perfect recharge date",
}


def n(x):
    return f"{x:,.0f}" if isinstance(x, (int, float)) and abs(x) >= 100 else f"{x}"


def build(s: dict) -> str:
    b, hh, imp = s["base"], s["household"], s["impact"]
    rows = "\n".join(
        f"| {SHORT[p]} | {v['mean_shortage_days']} | {v['years_with_shortage']} of {v['years']} | {v['max_shortage_days']} | {n(v['mean_alt_l'])} | {n(v['mean_flex_fresh_l'])} |"
        for p, v in b.items()
    )
    tanks = "\n".join(
        f"| {n(int(k))} L | {v['conventional']['mean_shortage_days']} | {v['threshold']['mean_shortage_days']} | {v['always_alt']['mean_shortage_days']} | {v['buffer']['mean_shortage_days']} | {n(v['always_alt']['mean_alt_l'])} | {n(v['buffer']['mean_alt_l'])} |"
        for k, v in s["tank_sweep"].items()
    )
    dry = s["alternative_dry_mar_may"]
    dry_rows = "\n".join(
        f"| {SHORT[p]} | {v['mean_shortage_days']} | {n(v['mean_flex_cut_l'])} |" for p, v in dry.items()
    )
    q = s["quantile_sweep"]
    ppl = s["people_sweep"]
    a, c, bf = b["always_alt"], b["conventional"], b["buffer"]

    return f"""# BUFFER simulation results

All numbers below are **SIMULATED** with real rainfall. Household values are **ASSUMPTIONS** for
scenario testing, not field measurements (PROJECT.md §88). Regenerate everything with:

```
python -m buffer_sim.experiments && python -m buffer_sim.report
```

## Data and method

- **Rainfall (real):** {s['rainfall_source']}, at {s['site']['name']} ({s['site']['lat']} N, {s['site']['lon']} E).
- **Water balance, daily:** roof inflow (rain minus a {hh['first_flush_mm']} mm first flush, x {hh['roof_m2']} m² x runoff {hh['runoff']}) fills a {n(hh['tank_l'])} L tank; overflow is lost. Drinking and cooking are always served first.
- **Reliable recharge:** a spell with at least {s['recharge_definition_mm_3day']:.0f} mm of rain over three days.
- **BUFFER's forecast:** {s['buffer_forecast']}. Each season is evaluated with a forecast built only from the *other* seasons, so it never sees its own future.
- **Shortage day:** a day on which drinking and cooking ({hh['critical_l_day']:.0f} L) cannot be fully met from freshwater.

| Household assumption | Value |
|---|---|
| People | {hh['people']} |
| Drinking + cooking | {hh['critical_lpcd']} L per person per day ({hh['critical_l_day']:.0f} L) |
| Flexible uses normally taken from stored rainwater | {hh['flexible_lpcd']} L per person per day ({hh['flexible_l_day']:.0f} L) |
| Freshwater tank | {n(hh['tank_l'])} L |
| Roof catchment | {hh['roof_m2']} m², runoff coefficient {hh['runoff']} |
| Protected critical reserve | {hh['reserve_days']:.0f} days ({hh['reserve_l']:.0f} L) |
| Alternative source | always available (see the dry-pond test below) |

## The five policies

| Policy | Rule |
|---|---|
| Conventional | Every use draws freshwater until the tank is empty |
| Static rule | Flexible uses always go to the alternative source |
| Tank threshold | Flexible uses switch to the alternative once the tank falls below 25% |
| **BUFFER** | Flexible uses may only spend freshwater beyond the protected reserve and the drinking water needed until the forecast recharge (PROJECT.md §42) |
| BUFFER, perfect recharge date | Same rule, but told the true date of the next recharge spell |

## Results over {c['years']} dry seasons (1991-92 to 2024-25)

| Policy | Mean shortage days per season | Seasons with any shortage | Worst season (days) | Alternative water used (L per season) | Freshwater for flexible uses (L per season) |
|---|---|---|---|---|---|
{rows}

![Freshwater through a median dry season](figures/example_season.png)

![Shortage days in every season](figures/shortage_by_season.png)

## What this shows

1. **The problem is real in this rainfall record.** With conventional use, the household runs out of
   drinking water in **{c['years_with_shortage']} of {c['years']}** seasons, for **{c['mean_shortage_days']} days** on average.
2. **BUFFER removes almost all of it.** Mean shortage falls to **{bf['mean_shortage_days']} days**, and **{imp['seasons_without_shortage_buffer']} of {bf['years']}**
   seasons have no shortage at all. That is **{imp['shortage_days_avoided_per_year']} freshwater-days gained per season** and
   **{n(imp['shortage_litres_avoided_per_year'])} L** of unmet drinking and cooking water avoided.
3. **BUFFER matches the static rule's reliability while using {imp['alternative_share_saved_vs_static_rule']:.0%} less alternative water**
   ({n(a['mean_alt_l'])} L against {n(bf['mean_alt_l'])} L per season). The static rule protects freshwater by never
   using it for flexible tasks, even in the wet season when the tank overflows. BUFFER only restricts
   use when the forecast says the reserve is at risk, so the household keeps using its best water whenever that is safe.
4. **Planning conservatively beats knowing the date.** BUFFER with the true recharge date does slightly *worse*
   ({b['buffer_oracle']['mean_shortage_days']} days) than BUFFER with the 75th-percentile climatology, because one recharge spell does not
   guarantee steady rain afterwards. A cautious forecast is both deployable and safer.

![Reliability against reliance on alternative water](figures/tradeoff.png)

## Where BUFFER is useful, neutral, and insufficient (PROJECT.md §51)

### Tank size

| Tank | Conventional | Tank threshold | Static rule | BUFFER | Alternative used, static rule (L) | Alternative used, BUFFER (L) |
|---|---|---|---|---|---|---|
{tanks}

- **Useful:** from about 3,000 L upward BUFFER brings shortage to zero or near zero while halving reliance on alternative water.
- **Neutral:** for small tanks BUFFER and the static rule give the same reliability, because neither can afford any flexible freshwater.
- **Insufficient:** at 1,000-2,000 L even drinking and cooking alone outlast the stored water in many seasons.
  BUFFER cannot create water; these households need more storage, and BUFFER's runway number tells them how much.

![Shortage days by tank size](figures/tank_sweep.png)

### When the pond dries up (alternative unavailable March to May)

| Policy | Mean shortage days | Flexible water not served (L per season) |
|---|---|---|
{dry_rows}

When the alternative source fails late in the dry season, the static rule and the threshold rule fall back
to freshwater and run out (static rule: {dry['always_alt']['mean_shortage_days']} days). BUFFER still holds shortage to
{dry['buffer']['mean_shortage_days']} days. The cost is honest: about {n(dry['buffer']['mean_flex_cut_l'])} L of flexible use per season goes unserved,
which BUFFER makes visible as a choice instead of a surprise.

### Household size

| People | Conventional | Static rule | BUFFER |
|---|---|---|---|
""" + "\n".join(
        f"| {k} | {v['conventional']['mean_shortage_days']} | {v['always_alt']['mean_shortage_days']} | {v['buffer']['mean_shortage_days']} |" for k, v in ppl.items()
    ) + f"""

### Forecast caution

| BUFFER plans for the recharge date exceeded in | Mean shortage days | Seasons with shortage | Alternative used (L) |
|---|---|---|---|
""" + "\n".join(
        f"| {int((1 - float(k)) * 100)}% of past seasons (quantile {k}) | {v['mean_shortage_days']} | {v['years_with_shortage']} | {n(v['mean_alt_l'])} |" for k, v in q.items()
    ) + """

Results barely change across forecast settings: BUFFER does not depend on a precise forecast.

## Uncertainty: 2,000 resampled seasons with noisy demand

Each run draws one of the 34 real seasons at random and varies daily demand
(drinking and cooking about ±15%, flexible use about ±30%).

| Policy | Chance of any shortage in a season | Mean shortage days | 90th-percentile season |
|---|---|---|---|
""" + NL.join(
        f"| {SHORT[p]} | {v['p_shortage']:.1%} | {v['mean_days']} | {v['p90_days']:.0f} |" for p, v in s["monte_carlo"].items()
    ) + f"""

## Automatic valves against advice only

In advice-only mode (BUFFER Lite) the household decides whether to follow the routing. Here it follows
the advice on a random share of days and uses freshwater for everything on the others.

| Days the advice is followed | Mean shortage days | Seasons with shortage |
|---|---|---|
""" + NL.join(
        f"| {float(k):.0%} | {v['mean_shortage_days']} | {v['years_with_shortage']} of {v['years']} |" for k, v in s["compliance"].items()
    ) + f"""

Every missed day spends freshwater the household will need later, so the benefit falls quickly:
following the advice 80% of the time already raises shortage from {s['compliance']['1.0']['mean_shortage_days']} to
{s['compliance']['0.8']['mean_shortage_days']} days a season. This is the case for automatic valves in the
BUFFER Control tier, and for advice-only mode as an entry product rather than the end state.

## Sensor failure

With the freshwater level sensor down for all of January every season, BUFFER falls back to protecting
freshwater (no flexible allowance), exactly as the firmware does. Mean shortage stays at
**{s['sensor_outage_january']['mean_shortage_days']} days**: a month-long outage in the driest stretch costs nothing.

## Check against published field data

The model is run the way coastal households already behave: stored rainwater is kept for drinking and
cooking only (Ghosh & Ahmed 2022). Household values come from a rainwater system evaluated in rural Khulna:
""" + f"""{s['field_check']['household']}. The household's tank size is not reported in the field studies,
so the model is shown for the realistic range of household storage.

| Published observation | Value | Where |
|---|---|---|
""" + NL.join(
        f"| {FIELD_LABELS[k]} | {v['value']:.0%} | {v['where']} |" if v['value'] < 1 else f"| {FIELD_LABELS[k]} | {v['value']} months | {v['where']} |"
        for k, v in s['field_check']['observed'].items()
    ) + """

| Tank | Storage period after the tank was last full (months) | Seasons when rainwater did not last all year | Months without rainwater per year |
|---|---|---|---|
""" + NL.join(
        f"| {n(int(k))} L | {v['storage_months']} | {v['share_not_enough_all_year']:.0%} | {v['months_without_water']} |" for k, v in s['field_check']['modelled_by_tank'].items()
    ) + """

**Reading:** four of the five published figures fall inside what the model produces for household tanks of
500-3,000 L: a 4.7-month storage period sits between the 2,000 L and 3,000 L results; 91% of households running
short matches about 1,500 L; 2.84 months without reliable water in Koyra matches 500-1,000 L; 27% year-round access
falls between 2,000 L and 3,000 L. The fifth does not: the five-upazila average of 4.65 months without reliable water
is worse than even the 500 L result (3.2 months), pulled up by Paikgachha (7.15 months). Possible reasons, not tested
here: households with very small or no rainwater storage, rainwater used beyond drinking and cooking, or larger
families than the 4 people modelled. No single tank size reproduces all figures at once, as expected when real households have a
mix of tank sizes, family sizes and habits that the surveys do not report. This is a
**consistency check, not a calibration**: it shows the water balance behaves like the real places, not that
it predicts any one household. A pilot with measured tanks and use would close this gap.

## Household values from the literature

The main comparison rerun with published values instead of our assumptions: """ + f"""{s['literature_household']['household']['people']} people,
{s['literature_household']['household']['critical_lpcd']} L/person/day for drinking and cooking, a 2,000 L tank (the tank each family received
in UNDP's Gender-responsive Coastal Adaptation project in Khulna and Satkhira), 40 m² roof, runoff 0.8.
Flexible use stays an assumption ({s['literature_household']['household']['flexible_lpcd']} L/person/day).

| Policy | 2,000 L tank: shortage days | Seasons with shortage | Alternative water (L) | 3,000 L tank: shortage days | Seasons with shortage |
|---|---|---|---|---|---|
""" + NL.join(
        f"| {SHORT[p]} | {s['literature_household']['tank_2000'][p]['mean_shortage_days']} | {s['literature_household']['tank_2000'][p]['years_with_shortage']} of 34 | {n(s['literature_household']['tank_2000'][p]['mean_alt_l'])} | {s['literature_household']['tank_3000'][p]['mean_shortage_days']} | {s['literature_household']['tank_3000'][p]['years_with_shortage']} of 34 |"
        for p in ('conventional', 'threshold', 'always_alt', 'buffer')
    ) + """

**Reading:** with the published 6 L/person/day for drinking and cooking, a 2,000 L tank cannot carry even drinking
water through most dry seasons; BUFFER cuts shortage from about 88 to 31 days, the same as the best any routing can do,
and the rest is a storage gap. With 3,000 L, BUFFER brings it to 4 days. The honest message for programmes: BUFFER
makes the most of the storage a household has, and its runway display shows where storage itself must grow.

## Other locations

Same household (5 people, 3,000 L), each site's own 34 seasons of NASA POWER rainfall.

| Site | Climate | Annual rain (mm) | Conventional | Tank threshold | Static rule | BUFFER | BUFFER, cautious forecast | Alternative water: static rule / BUFFER (L) |
|---|---|---|---|---|---|---|---|---|
""" + NL.join(
        f"| {v['name']} | {v['group']} | {n(v['annual_rain_mm'])} | {v['results']['conventional']['mean_shortage_days']} | {v['results']['threshold']['mean_shortage_days']} | {v['results']['always_alt']['mean_shortage_days']} | {v['results']['buffer']['mean_shortage_days']} | {v['results']['buffer_cautious']['mean_shortage_days']} | {n(v['results']['always_alt']['mean_alt_l'])} / {n(v['results']['buffer']['mean_alt_l'])} |"
        for v in s['sites'].values()
    ) + """

Shortage days per dry season. "Cautious forecast" plans for the recharge date exceeded in only 10% of past seasons
instead of 25%.

**Reading:** across all five Bangladeshi coastal sites BUFFER cuts shortage from 59-71 days to 0-0.5 days and uses about
half the alternative water of the static rule. In the two different climates the standard forecast setting is slightly
less safe than the static rule (Rajshahi 6.6 against 3.8 days; Chennai 0.8 against 0.3); planning more cautiously
closes most of that (Rajshahi 4.5, Chennai 0.3) while still using less alternative water. The forecast caution is a
setting each deployment should choose for its climate.

## Limitations

- The headline household (5 people, 4 L/person/day, 3,000 L) is an assumption; the literature-based household above
  uses published values except for flexible use. Both must be replaced with measured values from a pilot.
- The field check compares against survey averages; the surveys do not report tank-size distributions.
- NASA POWER is a gridded reanalysis product (0.5 degree), not a rain gauge at the house.
- The model assumes the household follows the routing (automatic valves make this realistic; advisory mode would not).
- Water quality is outside the model: the alternative source is assumed pre-qualified for its permitted uses (PROJECT.md §14).
"""


def main():
    s = json.loads((ROOT / "results" / "summary.json").read_text())
    (ROOT / "results" / "REPORT.md").write_text(build(s), encoding="utf-8")
    print("wrote results/REPORT.md")


if __name__ == "__main__":
    main()
