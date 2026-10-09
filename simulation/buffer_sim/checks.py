"""Checks that tie the model to the outside world.

1. field_check: does the model, run on real rainfall with the way households already behave,
   reproduce what field surveys in coastal Bangladesh report?
2. literature_household: the main comparison with household values taken from published studies
   instead of our assumptions.
3. sites: the main comparison at other coastal locations and two different climates.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .data import SITES
from .model import Household, simulate

# Published household values (LITERATURE).
#  - 4 people, 6 L/person/day for drinking + cooking, 40 m2 roof, runoff 0.8: "Construction and Evaluation of
#    Rainwater Harvesting System for Domestic Use in a Remote and Rural Area of Khulna, Bangladesh" (PMC4897113)
#  - 2,000 L tank: the tank each family received in UNDP's Gender-responsive Coastal Adaptation project
#    (https://www.adaptation-undp.org/water-crisis-southwest-bangladesh-paani-apa-rescue)
# Flexible use has no published value for this setting and stays an ASSUMPTION (6 L/person/day).
LITERATURE_HH = Household(people=4, critical_lpcd=6.0, flexible_lpcd=6.0, tank_l=2000.0, roof_m2=40.0, runoff=0.8)

# Published field observations to compare against (LITERATURE).
FIELD = {
    "storage_months": {"value": 4.7, "where": "Sutarkhali, Dacope (Khulna), 116 households", "source": "Environment, Development and Sustainability, 2026, reported by Prothom Alo, 8 Oct 2026"},
    "share_not_enough_all_year": {"value": 0.91, "where": "Sutarkhali, Dacope (Khulna), 116 households", "source": "same study"},
    "months_without_reliable_water_koyra": {"value": 2.84, "where": "Koyra; survey of 66,234 households in Koyra, Dacope, Paikgachha, Assasuni and Shyamnagar", "source": "UNDP Gender-responsive Coastal Adaptation, https://www.adaptation-undp.org/water-crisis-southwest-bangladesh-paani-apa-rescue"},
    "months_without_reliable_water_5_upazilas": {"value": 4.65, "where": "five-upazila average, same survey", "source": "same survey"},
    "share_year_round_koyra": {"value": 0.27, "where": "Koyra", "source": "Cleaner Water, 2025, doi:10.1016/j.clwat.2025.100171"},
}

FIELD_TANKS = (500, 1000, 1500, 2000, 3000)
MONTH = 30.44


def _season_stats(daily: pd.DataFrame, tank_l: float, daily_draw: float) -> pd.DataFrame:
    """Per dry season: how long stored rainwater lasted after the tank was last full, and days without it."""
    rows = []
    for y, g in daily[daily.hydro_year <= 2024].groupby("hydro_year"):
        short = g.crit_short.values > 1e-9
        storage = g.storage.values
        if not short.any():
            rows.append({"hydro_year": y, "lasted_all_year": True, "storage_days": np.nan, "short_days": 0})
            continue
        first = int(np.argmax(short))
        # storage is recorded after the day's draw, so a tank that filled that day reads tank - draw
        full = np.nonzero(storage[:first] >= tank_l - daily_draw - 1.0)[0]
        start = int(full[-1]) if len(full) else 0
        rows.append({"hydro_year": y, "lasted_all_year": False, "storage_days": first - start, "short_days": int(short.sum())})
    return pd.DataFrame(rows)


def field_check(df: pd.DataFrame, est: np.ndarray) -> dict:
    """Current practice: rainwater kept for drinking and cooking only (Ghosh & Ahmed 2022; PROJECT.md §5)."""
    out = {}
    for tank in FIELD_TANKS:
        hh = LITERATURE_HH.with_(tank_l=float(tank), flexible_lpcd=0.0)
        o = simulate(df.rain_mm.values, df.date.dt.month.values, hh, "conventional", est)
        d = pd.DataFrame({**o, "hydro_year": df.hydro_year.values})
        st = _season_stats(d, hh.tank_l, hh.critical)
        out[str(tank)] = {
            "storage_months": round(float(st.storage_days.mean() / MONTH), 1) if st.storage_days.notna().any() else None,
            "share_not_enough_all_year": round(float((~st.lasted_all_year).mean()), 2),
            "months_without_water": round(float(st.short_days.mean() / MONTH), 2),
        }
    return {"observed": FIELD, "modelled_by_tank": out, "household": "4 people, 24 L/day drinking and cooking only, 40 m2 roof (literature)"}


def _compare(df, hh: Household, est: np.ndarray, policies=("conventional", "always_alt", "threshold", "buffer")) -> dict:
    from .experiments import season_table, summarise

    res = {}
    for p in policies:
        o = simulate(df.rain_mm.values, df.date.dt.month.values, hh, p, est)
        res[p] = summarise(season_table(pd.DataFrame({**o, "hydro_year": df.hydro_year.values})))
    return res


def literature_household(df: pd.DataFrame, est: np.ndarray) -> dict:
    base = _compare(df, LITERATURE_HH, est)
    larger = _compare(df, LITERATURE_HH.with_(tank_l=3000.0), est)
    return {"household": LITERATURE_HH.__dict__ | {"critical_l_day": LITERATURE_HH.critical, "flexible_l_day": LITERATURE_HH.flexible}, "tank_2000": base, "tank_3000": larger}


def sites(hh: Household, quantile: float) -> dict:
    from .experiments import prepare
    from .model import climatology_estimate

    out = {}
    for key, meta in SITES.items():
        df = prepare(key)
        est = climatology_estimate(pd.DatetimeIndex(df.date), df.days_to_recharge.values, df.hydro_year.values, quantile)
        res = _compare(df, hh, est)
        # A more cautious forecast (plan for the 90th-percentile recharge date) for less predictable climates.
        est_c = climatology_estimate(pd.DatetimeIndex(df.date), df.days_to_recharge.values, df.hydro_year.values, 0.9)
        res["buffer_cautious"] = _compare(df, hh, est_c, ("buffer",))["buffer"]
        annual = float(df.groupby(df.date.dt.year).rain_mm.sum().mean())
        out[key] = {"name": meta["name"], "group": meta["group"], "annual_rain_mm": round(annual), "results": res}
    return out
