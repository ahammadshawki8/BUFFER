"""Figures for the report and slides. Colours match the dashboard."""
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

INK = "#17313B"
FRESH = "#2F7ED8"
ALT = "#C98B2B"
RISK = "#D2483C"
GREY = "#8A9BA3"

COLOURS = {"conventional": RISK, "always_alt": ALT, "threshold": GREY, "buffer": FRESH, "buffer_oracle": "#7FB2EA"}
SHORT = {
    "conventional": "Conventional",
    "always_alt": "Static rule",
    "threshold": "Tank threshold",
    "buffer": "BUFFER",
    "buffer_oracle": "BUFFER (perfect forecast)",
}


def _style(ax):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.spines["left"].set_color("#B9C7CC")
    ax.spines["bottom"].set_color("#B9C7CC")
    ax.tick_params(colors=INK, labelsize=9)
    ax.yaxis.label.set_color(INK)
    ax.xaxis.label.set_color(INK)
    ax.grid(axis="y", color="#E3EAEC", linewidth=0.8)
    ax.set_axisbelow(True)


def example_season(s, out: Path):
    ex = s["example_season"]
    dates = pd.to_datetime(ex["dates"])
    fig, (ax, axr) = plt.subplots(2, 1, figsize=(10, 5.6), sharex=True, gridspec_kw={"height_ratios": [3.2, 1]})
    for p in ("conventional", "threshold", "buffer"):
        ax.plot(dates, ex["storage"][p], color=COLOURS[p], lw=2.2 if p == "buffer" else 1.6, label=SHORT[p])
    ax.axhline(s["household"]["reserve_l"], color=INK, ls=(0, (1, 3)), lw=1.2)
    ax.text(dates[3], s["household"]["reserve_l"] + 40, "Protected critical reserve", color=INK, fontsize=8)
    if ex["recharge_date"]:
        r = pd.Timestamp(ex["recharge_date"])
        ax.axvline(r, color="#5F8FB5", ls="--", lw=1.3)
        ax.text(r, ax.get_ylim()[1] * 0.96, "  Reliable recharge", color="#3F6F95", fontsize=8, va="top")
    ax.set_ylabel("Freshwater in tank (L)")
    ax.set_title(f"Freshwater through the {ex['season']} dry season, Koyra rainfall (median season)", color=INK, fontsize=11, loc="left", pad=26)
    ax.legend(frameon=False, fontsize=9, loc="lower left", bbox_to_anchor=(0, 1.0), ncol=3)
    _style(ax)
    axr.bar(dates, ex["rain_mm"], color="#7FA8C9", width=1)
    axr.set_ylabel("Rain (mm)")
    _style(axr)
    fig.tight_layout()
    fig.savefig(out / "example_season.png", dpi=180)
    plt.close(fig)


def per_year(s, out: Path):
    py = s["per_year_shortage_days"]
    years = sorted(int(y) for y in py["conventional"])
    x = np.arange(len(years))
    fig, ax = plt.subplots(figsize=(11, 4))
    w = 0.4
    ax.bar(x - w / 2, [py["conventional"][str(y)] if str(y) in py["conventional"] else py["conventional"][y] for y in years], w, color=RISK, label="Conventional")
    ax.bar(x + w / 2, [py["buffer"][str(y)] if str(y) in py["buffer"] else py["buffer"][y] for y in years], w, color=FRESH, label="BUFFER")
    ax.set_xticks(x, [f"{y}-{str(y + 1)[-2:]}" for y in years], rotation=90, fontsize=8)
    ax.set_ylabel("Days without drinking water")
    ax.set_title("Critical shortage days in each dry season, 1991-2025", color=INK, fontsize=11, loc="left")
    ax.legend(frameon=False, fontsize=9)
    _style(ax)
    fig.tight_layout()
    fig.savefig(out / "shortage_by_season.png", dpi=180)
    plt.close(fig)


def tank_sweep(s, out: Path):
    sizes = sorted(int(k) for k in s["tank_sweep"])
    fig, ax = plt.subplots(figsize=(7.5, 4.2))
    for p in ("conventional", "threshold", "always_alt", "buffer"):
        ax.plot(sizes, [s["tank_sweep"][str(k)][p]["mean_shortage_days"] for k in sizes], marker="o", color=COLOURS[p], label=SHORT[p], lw=2 if p == "buffer" else 1.5)
    ax.set_xlabel("Freshwater tank size (L)")
    ax.set_ylabel("Mean shortage days per season")
    ax.set_title("Where BUFFER helps: by tank size", color=INK, fontsize=11, loc="left")
    ax.legend(frameon=False, fontsize=9)
    _style(ax)
    fig.tight_layout()
    fig.savefig(out / "tank_sweep.png", dpi=180)
    plt.close(fig)


def tradeoff(s, out: Path):
    fig, ax = plt.subplots(figsize=(7, 4.4))
    for p, v in s["base"].items():
        ax.scatter(v["mean_alt_l"], v["mean_shortage_days"], s=90, color=COLOURS[p], zorder=3)
        ax.annotate(SHORT[p], (v["mean_alt_l"], v["mean_shortage_days"]), textcoords="offset points", xytext=(8, 6), fontsize=9, color=INK)
    ax.set_xlabel("Alternative water used per season (L)")
    ax.set_ylabel("Mean shortage days per season")
    ax.set_title("Reliability against reliance on lower-quality water", color=INK, fontsize=11, loc="left")
    _style(ax)
    fig.tight_layout()
    fig.savefig(out / "tradeoff.png", dpi=180)
    plt.close(fig)


def make_all(s, out: Path):
    out.mkdir(parents=True, exist_ok=True)
    example_season(s, out)
    per_year(s, out)
    tank_sweep(s, out)
    tradeoff(s, out)
