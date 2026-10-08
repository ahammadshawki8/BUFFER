import numpy as np
import pandas as pd

from buffer_sim.model import Household, days_to_recharge, flexible_allowance, simulate

HH = Household(tank_l=200, reserve_days=1)  # the dashboard scenario: 200 L, 20 + 30 L/day, 20 L reserve


def run(policy, days=20, rain=None, est=7.0, hh=HH):
    rain = np.zeros(days) if rain is None else rain
    months = np.full(days, 1)
    return simulate(rain, months, hh, policy, np.full(days, est))


def first_short_day(out):
    idx = np.nonzero(out["crit_short"] > 0)[0]
    return int(idx[0]) if len(idx) else None


def test_conventional_runs_dry_on_day_4():
    out = run("conventional")
    # 200 L at 50 L/day lasts four full days; critical demand fails on day index 4
    assert first_short_day(out) == 4


def test_buffer_reaches_day_7_recharge_with_reserve():
    out = run("buffer", est=7.0)
    assert first_short_day(out) is None or first_short_day(out) >= 7
    assert out["storage"][6] >= HH.reserve - 1e-9


def test_buffer_never_spends_reserve_on_flexible_use():
    out = run("buffer", est=9.0)
    for t in range(9):
        assert out["storage"][t] >= HH.reserve - 1e-9 or out["flex_fresh"][t] == 0


def test_water_balance_closes():
    rng = np.random.default_rng(1)
    rain = rng.gamma(0.3, 15, 400)
    out = run("conventional", days=400, rain=rain)
    hh = HH
    used = hh.critical * 400 - out["crit_short"].sum() + out["flex_fresh"].sum()
    start = hh.tank_l
    assert abs(start + out["inflow"].sum() - out["spill"].sum() - used - out["storage"][-1]) < 1e-6


def test_allowance_is_bounded():
    for s in (0, 50, 200, 5000):
        a = flexible_allowance("buffer", s, HH, 5.0, True)
        assert 0 <= a <= HH.flexible


def test_days_to_recharge():
    rain = np.zeros(10)
    rain[6] = 40
    d = days_to_recharge(rain)
    assert d[0] == 4  # spell starting on day 4 covers day 6 within its three-day window
    assert d[6] == 0


def test_alternative_unavailable_cuts_flexible_service_for_buffer():
    hh = HH.with_(alt_dry_months=(1,))
    out = run("buffer", est=9.0, hh=hh)
    assert out["flex_alt"].sum() == 0
    assert out["flex_cut"].sum() > 0


def test_ignoring_all_advice_equals_conventional():
    rng = np.random.default_rng(3)
    rain = rng.gamma(0.3, 15, 300)
    months = np.full(300, 1)
    est = np.full(300, 7.0)
    a = simulate(rain, months, HH, "buffer", est, comply=np.zeros(300, dtype=bool))
    b = simulate(rain, months, HH, "conventional", est)
    assert np.allclose(a["storage"], b["storage"])


def test_sensor_fault_spends_no_flexible_freshwater():
    out = simulate(np.zeros(10), np.full(10, 1), HH, "buffer", np.full(10, 2.0), sensor_fault=np.ones(10, dtype=bool))
    assert out["flex_fresh"].sum() == 0
    assert out["crit_short"].sum() == 0  # drinking water still served


def test_demand_noise_scales_needs():
    out = simulate(np.zeros(3), np.full(3, 1), HH, "conventional", np.full(3, 7.0), crit_mult=np.full(3, 2.0))
    assert out["storage"][0] == HH.tank_l - 2 * HH.critical - HH.flexible
