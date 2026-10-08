"""Run every policy over 34 real dry seasons and the sensitivity sweeps.

python -m buffer_sim.experiments   writes results/summary.json, results/figures/*.png,
                                   and dashboard/src/data/evidence.json
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from .data import SITE, load
from .model import POLICIES, POLICY_LABELS, Household, climatology_estimate, days_to_recharge, simulate

ROOT = Path(__file__).resolve().parent.parent
RESULTS = ROOT / "results"
DASHBOARD_DATA = ROOT.parent / "dashboard" / "src" / "data"

BASE = Household()
QUANTILE = 0.75  # BUFFER plans for a recharge later than in 3 out of 4 past years


def prepare():
    df = load()
    # Hydrological year runs June to May, so each dry season sits inside one year.
    df["hydro_year"] = np.where(df.date.dt.month >= 6, df.date.dt.year, df.date.dt.year - 1)
    df = df[(df.date >= "1991-06-01")].reset_index(drop=True)
    truth = days_to_recharge(df.rain_mm.values)
    df["days_to_recharge"] = truth
    return df


def run_policy(df, hh: Household, policy: str, quantile: float = QUANTILE, est_cache: dict | None = None):
    truth = df.days_to_recharge.values
    if policy == "buffer_oracle":
        est = truth
    else:
        key = quantile
        if est_cache is not None and key in est_cache:
            est = est_cache[key]
        else:
            est = climatology_estimate(pd.DatetimeIndex(df.date), truth, df.hydro_year.values, quantile)
            if est_cache is not None:
                est_cache[key] = est
    out = simulate(df.rain_mm.values, df.date.dt.month.values, hh, policy, est)
    daily = pd.DataFrame(out)
    daily["date"] = df.date.values
    daily["hydro_year"] = df.hydro_year.values
    return daily


def season_table(daily: pd.DataFrame) -> pd.DataFrame:
    years = daily[daily.hydro_year <= 2024].groupby("hydro_year")  # last complete season is Jun 2024 - May 2025
    return pd.DataFrame(
        {
            "shortage_days": years.crit_short.apply(lambda x: int((x > 1e-9).sum())),
            "shortage_l": years.crit_short.sum(),
            "alt_l": years.flex_alt.sum(),
            "flex_fresh_l": years.flex_fresh.sum(),
            "flex_cut_l": years.flex_cut.sum(),
        }
    )


def summarise(t: pd.DataFrame) -> dict:
    return {
        "mean_shortage_days": round(float(t.shortage_days.mean()), 1),
        "median_shortage_days": float(t.shortage_days.median()),
        "max_shortage_days": int(t.shortage_days.max()),
        "years_with_shortage": int((t.shortage_days > 0).sum()),
        "years": int(len(t)),
        "mean_shortage_l": round(float(t.shortage_l.mean())),
        "mean_alt_l": round(float(t.alt_l.mean())),
        "mean_flex_fresh_l": round(float(t.flex_fresh_l.mean())),
        "mean_flex_cut_l": round(float(t.flex_cut_l.mean())),
    }


def compare(df, hh: Household, quantile: float = QUANTILE, policies=POLICIES, cache=None):
    tables = {p: season_table(run_policy(df, hh, p, quantile, cache)) for p in policies}
    return tables, {p: summarise(t) for p, t in tables.items()}


def main():
    import matplotlib

    matplotlib.use("Agg")
    from . import figures

    df = prepare()
    cache: dict = {}
    RESULTS.mkdir(exist_ok=True)

    base_tables, base = compare(df, BASE, cache=cache)

    tanks = [1000, 1500, 2000, 3000, 4000, 5000]
    tank_sweep = {}
    for size in tanks:
        _, s = compare(df, BASE.with_(tank_l=size), cache=cache)
        tank_sweep[size] = s

    quantile_sweep = {}
    for q in (0.5, 0.75, 0.9):
        _, s = compare(df, BASE, quantile=q, policies=("buffer",), cache=cache)
        quantile_sweep[q] = s["buffer"]

    # Ponds and shallow sources often fail late in the dry season.
    _, alt_dry = compare(df, BASE.with_(alt_dry_months=(3, 4, 5)), cache=cache)

    people_sweep = {}
    for people in (3, 5, 7):
        _, s = compare(df, BASE.with_(people=people), cache=cache)
        people_sweep[people] = s

    # The season shown in the dashboard hero chart: the median season for conventional use,
    # so the example is typical rather than cherry-picked.
    conv = base_tables["conventional"]
    median_days = conv.shortage_days.median()
    example_year = int((conv.shortage_days - median_days).abs().idxmin())

    traces = {p: run_policy(df, BASE, p, QUANTILE, cache) for p in ("conventional", "always_alt", "threshold", "buffer")}
    win = (traces["conventional"].date >= f"{example_year}-10-01") & (traces["conventional"].date <= f"{example_year + 1}-06-30")
    rain_win = df.rain_mm[win.values].values
    recharge_rows = df[win.values & (df.days_to_recharge == 0).values & (df.date >= f"{example_year + 1}-03-01").values]
    example = {
        "season": f"{example_year}-{str(example_year + 1)[-2:]}",
        "dates": [d.strftime("%Y-%m-%d") for d in traces["conventional"].date[win]],
        "rain_mm": [round(float(r), 1) for r in rain_win],
        "storage": {p: [round(float(v), 1) for v in traces[p].storage[win]] for p in traces},
        "recharge_date": recharge_rows.date.iloc[0].strftime("%Y-%m-%d") if len(recharge_rows) else None,
    }

    per_year = {
        p: {int(y): int(v) for y, v in base_tables[p].shortage_days.items()} for p in ("conventional", "always_alt", "threshold", "buffer")
    }

    c, b, a = base["conventional"], base["buffer"], base["always_alt"]
    impact = {
        "shortage_days_avoided_per_year": round(c["mean_shortage_days"] - b["mean_shortage_days"], 1),
        "shortage_litres_avoided_per_year": c["mean_shortage_l"] - b["mean_shortage_l"],
        "seasons_without_shortage_conventional": c["years"] - c["years_with_shortage"],
        "seasons_without_shortage_buffer": b["years"] - b["years_with_shortage"],
        "alternative_litres_saved_vs_static_rule": a["mean_alt_l"] - b["mean_alt_l"],
        "alternative_share_saved_vs_static_rule": round(1 - b["mean_alt_l"] / a["mean_alt_l"], 3) if a["mean_alt_l"] else None,
    }

    summary = {
        "site": SITE,
        "rainfall_source": "NASA POWER daily PRECTOTCORR, 1991-06-01 to 2025-05-31 (34 dry seasons)",
        "household": BASE.__dict__ | {"critical_l_day": BASE.critical, "flexible_l_day": BASE.flexible, "reserve_l": BASE.reserve},
        "recharge_definition_mm_3day": 30.0,
        "buffer_forecast": f"climatology {int(QUANTILE * 100)}th percentile of days-to-recharge from the other 33 seasons, plus a reliable 3-day weather forecast",
        "policies": POLICY_LABELS,
        "base": base,
        "impact": impact,
        "tank_sweep": {str(k): v for k, v in tank_sweep.items()},
        "quantile_sweep": {str(k): v for k, v in quantile_sweep.items()},
        "alternative_dry_mar_may": alt_dry,
        "people_sweep": {str(k): v for k, v in people_sweep.items()},
        "per_year_shortage_days": per_year,
        "example_season": example,
    }
    (RESULTS / "summary.json").write_text(json.dumps(summary, indent=2))

    figures.make_all(summary, RESULTS / "figures")

    DASHBOARD_DATA.mkdir(parents=True, exist_ok=True)
    evidence = {k: summary[k] for k in ("site", "rainfall_source", "household", "base", "impact", "tank_sweep", "per_year_shortage_days", "example_season")}
    (DASHBOARD_DATA / "evidence.json").write_text(json.dumps(evidence))
    print(json.dumps({"base": base, "impact": impact}, indent=2))


if __name__ == "__main__":
    main()
