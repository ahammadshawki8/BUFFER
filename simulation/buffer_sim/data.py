"""Daily rainfall from NASA POWER (MERRA-2 based, bias-corrected precipitation).

Source: NASA Langley Research Center POWER Project, https://power.larc.nasa.gov/
Parameter PRECTOTCORR is daily corrected precipitation in mm/day.
POWER's grid is about 0.5 degrees, so towns closer than ~50 km can share one cell.
"""
import json
import sys
import urllib.request
from pathlib import Path

import pandas as pd

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"

# Koyra upazila, Khulna district, is the main site: the salinity-affected area studied in the
# 2025 Cleaner Water paper (PROJECT.md R3). Dacope (Sutarkhali), where a 2026 field survey measured
# rainwater storage periods, falls in the same POWER cell. The others test whether results hold elsewhere.
SITES = {
    "koyra": {"name": "Koyra, Khulna, Bangladesh", "lat": 22.34, "lon": 89.30, "group": "southwest coast"},
    "kuakata": {"name": "Kuakata, Patuakhali, Bangladesh", "lat": 21.82, "lon": 90.12, "group": "south-central coast"},
    "bhola": {"name": "Bhola, Bangladesh", "lat": 22.69, "lon": 90.65, "group": "south-central coast"},
    "hatiya": {"name": "Hatiya, Noakhali, Bangladesh", "lat": 22.28, "lon": 91.10, "group": "southeast coast"},
    "coxsbazar": {"name": "Cox's Bazar, Bangladesh", "lat": 21.45, "lon": 91.98, "group": "southeast coast"},
    "rajshahi": {"name": "Rajshahi, Bangladesh", "lat": 24.37, "lon": 88.60, "group": "different climate: drought-prone northwest"},
    "chennai": {"name": "Chennai, India", "lat": 13.08, "lon": 80.27, "group": "different climate: northeast-monsoon coast"},
}
SITE = {"key": "koyra", **SITES["koyra"]}

URL = (
    "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=AG"
    "&longitude={lon}&latitude={lat}&start={start}&end={end}&format=JSON"
)


def fetch(site: str = "koyra", start: str = "19910101", end: str = "20251231") -> Path:
    s = SITES[site]
    with urllib.request.urlopen(URL.format(start=start, end=end, lat=s["lat"], lon=s["lon"]), timeout=180) as r:
        payload = json.load(r)
    series = payload["properties"]["parameter"]["PRECTOTCORR"]
    df = pd.DataFrame({"date": pd.to_datetime(list(series.keys()), format="%Y%m%d"), "rain_mm": list(series.values())})
    df.loc[df.rain_mm < 0, "rain_mm"] = float("nan")  # POWER marks missing days as -999
    out = RAW / f"nasa_power_{site}_{start[:4]}-{end[:4]}.csv"
    RAW.mkdir(parents=True, exist_ok=True)
    df.to_csv(out, index=False)
    return out


def load(site: str = "koyra") -> pd.DataFrame:
    path = next(RAW.glob(f"nasa_power_{site}_*.csv"))
    df = pd.read_csv(path, parse_dates=["date"])
    df["rain_mm"] = df["rain_mm"].fillna(0.0)
    return df


if __name__ == "__main__":
    for key in sys.argv[1:] or SITES:
        print("wrote", fetch(key))
