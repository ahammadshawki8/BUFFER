"""Write results/REPORT.md from results/summary.json so every number in it is reproducible."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
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

## Limitations

- Household demand, roof area, tank size and reserve are assumptions; they must be replaced with field values.
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
