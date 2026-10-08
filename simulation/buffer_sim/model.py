"""Daily household water balance and the allocation policies BUFFER is compared against.

Evidence labels (PROJECT.md §88): every household parameter below is an ASSUMPTION
chosen for scenario testing unless a source is given. Rainfall is real (NASA POWER).
"""
from __future__ import annotations

from dataclasses import dataclass, replace

import numpy as np


@dataclass(frozen=True)
class Household:
    people: int = 5
    critical_lpcd: float = 4.0  # drinking + cooking, litres per person per day
    flexible_lpcd: float = 6.0  # toilet, floor cleaning, selected washing normally taken from stored rainwater
    tank_l: float = 3000.0  # freshwater storage
    roof_m2: float = 40.0  # tin-roof catchment draining to the tank
    runoff: float = 0.8  # share of rain on the roof that reaches the tank
    first_flush_mm: float = 0.5  # first rain of each wet day diverted to waste
    reserve_days: float = 3.0  # protected critical reserve, in days of critical demand
    alt_dry_months: tuple[int, ...] = ()  # months in which the alternative source is unavailable

    @property
    def critical(self) -> float:
        return self.people * self.critical_lpcd

    @property
    def flexible(self) -> float:
        return self.people * self.flexible_lpcd

    @property
    def reserve(self) -> float:
        return self.reserve_days * self.critical

    def with_(self, **kw) -> "Household":
        return replace(self, **kw)


# A "reliable recharge" is a rain spell that substantially refills the tank:
# at least this much rain over three consecutive days.
RECHARGE_MM_3DAY = 30.0
NO_RECHARGE = 365  # cap for "not within the next year"

POLICIES = ("conventional", "always_alt", "threshold", "buffer", "buffer_oracle")

POLICY_LABELS = {
    "conventional": "Conventional (all uses from freshwater)",
    "always_alt": "Static rule (alternative whenever possible)",
    "threshold": "Tank threshold (switch below 25%)",
    "buffer": "BUFFER (forecast-aware reserve)",
    "buffer_oracle": "BUFFER with perfect forecast (upper bound)",
}


def days_to_recharge(rain: np.ndarray) -> np.ndarray:
    """True number of days from each day until the next reliable recharge spell starts."""
    n = len(rain)
    three = np.convolve(rain, np.ones(3), mode="full")[2:][:n]  # rain[t] + rain[t+1] + rain[t+2]
    event = three >= RECHARGE_MM_3DAY
    out = np.full(n, NO_RECHARGE, dtype=float)
    nxt = None
    for t in range(n - 1, -1, -1):
        if event[t]:
            nxt = t
        if nxt is not None:
            out[t] = min(NO_RECHARGE, nxt - t)
    return out


def climatology_estimate(dates, truth: np.ndarray, hydro_year: np.ndarray, quantile: float, horizon: int = 3) -> np.ndarray:
    """What a deployed controller could know: for each day, the given quantile of
    'days until reliable recharge' on the same calendar day in all *other* years,
    overridden by a short-range weather forecast (assumed reliable for `horizon` days)."""
    doy = np.minimum(dates.dayofyear.values, 365) - 1
    years = np.unique(hydro_year)
    table = np.full((len(years), 365), np.nan)
    for i, y in enumerate(years):
        m = hydro_year == y
        table[i, doy[m]] = truth[m]
    est = np.empty_like(truth)
    for i, y in enumerate(years):
        others = np.delete(table, i, axis=0)
        q = np.nanquantile(others, quantile, axis=0)
        m = hydro_year == y
        est[m] = q[doy[m]]
    near = truth <= horizon
    est[near] = truth[near]
    return est


def flexible_allowance(policy: str, s: float, hh: Household, est_days: float, alt_ok: bool) -> float:
    """Litres of freshwater the policy lets flexible tasks use today."""
    if policy == "conventional":
        return hh.flexible
    if not alt_ok and policy in ("always_alt", "threshold"):
        return hh.flexible  # static rules fall back to freshwater when the alternative is gone
    if policy == "always_alt":
        return 0.0
    if policy == "threshold":
        return hh.flexible if s >= 0.25 * hh.tank_l else 0.0
    # BUFFER (PROJECT.md §42): only water beyond the reserve and the critical
    # demand expected until recharge may be spent on flexible use.
    h = max(1.0, est_days)
    spare = s - hh.reserve - hh.critical * h
    return float(np.clip(spare / h, 0.0, hh.flexible))


def simulate(
    rain: np.ndarray,
    months: np.ndarray,
    hh: Household,
    policy: str,
    est_days: np.ndarray,
    start_full: bool = True,
    crit_mult: np.ndarray | None = None,
    flex_mult: np.ndarray | None = None,
    comply: np.ndarray | None = None,
    sensor_fault: np.ndarray | None = None,
) -> dict[str, np.ndarray]:
    """Run one policy day by day.

    crit_mult / flex_mult: daily demand multipliers (demand uncertainty).
    comply: False on days the household ignores BUFFER's advice and uses freshwater for everything.
    sensor_fault: True on days the level sensor is down; BUFFER then protects freshwater
    (no flexible allowance), as the firmware does.
    """
    n = len(rain)
    storage = np.zeros(n)
    inflow = np.zeros(n)
    spill = np.zeros(n)
    crit_short = np.zeros(n)
    flex_fresh = np.zeros(n)
    flex_alt = np.zeros(n)
    flex_cut = np.zeros(n)
    s = hh.tank_l if start_full else 0.0
    for t in range(n):
        q = max(0.0, rain[t] - hh.first_flush_mm) * hh.roof_m2 * hh.runoff
        inflow[t] = q
        s += q
        if s > hh.tank_l:
            spill[t] = s - hh.tank_l
            s = hh.tank_l
        alt_ok = months[t] not in hh.alt_dry_months
        need_c = hh.critical * (crit_mult[t] if crit_mult is not None else 1.0)
        need_f = hh.flexible * (flex_mult[t] if flex_mult is not None else 1.0)
        if policy.startswith("buffer") and sensor_fault is not None and sensor_fault[t]:
            allow = 0.0  # level unknown: no flexible freshwater (flexible goes to the alternative or waits)
        else:
            allow = flexible_allowance(policy, s, hh, est_days[t], alt_ok)
        if comply is not None and not comply[t]:
            allow = hh.flexible  # advice ignored today
        allow *= need_f / hh.flexible if hh.flexible else 0.0

        crit = min(s, need_c)  # drinking and cooking always come first
        s -= crit
        crit_short[t] = need_c - crit

        f = min(s, allow)
        s -= f
        flex_fresh[t] = f
        rest = need_f - f
        if alt_ok:
            flex_alt[t] = rest
        else:
            flex_cut[t] = rest
        storage[t] = s
    return {
        "storage": storage,
        "inflow": inflow,
        "spill": spill,
        "crit_short": crit_short,
        "flex_fresh": flex_fresh,
        "flex_alt": flex_alt,
        "flex_cut": flex_cut,
    }
