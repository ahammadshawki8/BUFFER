"""Daily rainfall from NASA POWER (MERRA-2 based, bias-corrected precipitation).

Source: NASA Langley Research Center POWER Project, https://power.larc.nasa.gov/
Parameter PRECTOTCORR is daily corrected precipitation in mm/day.
POWER's grid is 0.5 degrees, so nearby towns (Koyra, Satkhira) share one cell.
"""
import json
import urllib.request
from pathlib import Path

import pandas as pd

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"

# Koyra upazila, Khulna district: the salinity-affected area studied in the
# 2025 Cleaner Water paper (PROJECT.md R3).
SITE = {"key": "koyra", "name": "Koyra, Khulna, Bangladesh", "lat": 22.34, "lon": 89.30}

URL = (
    "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=AG"
    "&longitude={lon}&latitude={lat}&start={start}&end={end}&format=JSON"
)


def fetch(start: str = "19910101", end: str = "20251231") -> Path:
    with urllib.request.urlopen(URL.format(start=start, end=end, lat=SITE["lat"], lon=SITE["lon"]), timeout=120) as r:
        payload = json.load(r)
    series = payload["properties"]["parameter"]["PRECTOTCORR"]
    df = pd.DataFrame({"date": pd.to_datetime(list(series.keys()), format="%Y%m%d"), "rain_mm": list(series.values())})
    df.loc[df.rain_mm < 0, "rain_mm"] = float("nan")  # POWER marks missing days as -999
    out = RAW / f"nasa_power_{SITE['key']}_{start[:4]}-{end[:4]}.csv"
    RAW.mkdir(parents=True, exist_ok=True)
    df.to_csv(out, index=False)
    return out


def load() -> pd.DataFrame:
    path = next(RAW.glob(f"nasa_power_{SITE['key']}_*.csv"))
    df = pd.read_csv(path, parse_dates=["date"])
    df["rain_mm"] = df["rain_mm"].fillna(0.0)
    return df


if __name__ == "__main__":
    print("wrote", fetch())
