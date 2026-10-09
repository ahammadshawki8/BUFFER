# Prior art and positioning

BUFFER does not claim to have invented rainwater harvesting, tank monitoring, source switching,
forecast control or drought rationing (PROJECT.md §7). Each exists. The claim is narrower:

> **BUFFER applies forecast-aware reserve hedging and use-priority allocation to a household's
> multiple water sources, with the goal of keeping a protected critical freshwater reserve until the
> next reliable recharge.**

## What already exists

| Category | Example | What it does | How BUFFER differs |
|---|---|---|---|
| Rainwater/mains switching | Davey RainBank [1] | Supplies rainwater to toilets, laundry and garden while the tank has water; switches to mains when the tank is empty or power fails | Acts **after** the tank is empty and assumes an unlimited backup (mains). BUFFER acts **before** depletion, for households with no mains, and protects drinking water specifically |
| Forecast-controlled stormwater | OptiRTC [2], RainGrid IR3 [3] | Uses rain forecasts to **empty** tanks and ponds ahead of storms, creating capacity to prevent flooding and overflow | The opposite objective: BUFFER uses the forecast to **hold** water through a dry spell |
| Smart tank monitoring | IoT level monitors and pump controllers (research reviews [4][5]) | Measure level, alert on low or high water, run refill pumps | Show the level; do not plan how long critical water lasts or allocate between sources |
| Rainwater/greywater hybrids | Hybrid decentralised systems (review [6]) | Treat and route greywater and rainwater to matching uses | Designed around treatment trains and reuse volume; not around reserve risk under seasonal scarcity |
| Tank sizing and water-balance tools | Design calculators; community decision support in coastal Bangladesh [7] | Size tanks and estimate reliability before installation | One-off design studies. BUFFER runs the water balance **continuously after installation** and acts on it |
| Reservoir drought hedging | Discrete and forecast-based hedging rules [8][9][10] | Ration releases early from large reservoirs to avoid severe later shortage | Utility scale, single source. BUFFER brings hedging to a household tank with several sources and use priorities |

## Positioning matrix

| System | Knows tank level | Uses several sources | Uses a forecast | Protects a critical reserve | Controls routing |
|---|:---:|:---:|:---:|:---:|:---:|
| Basic rainwater harvesting | No | No | No | No | No |
| Smart level monitor | Yes | Usually no | Rarely | No | Sometimes (pump only) |
| Rainwater/mains switch (RainBank type) | Yes | Yes (rain + mains) | No | No | Yes |
| Forecast stormwater control (Opti, RainGrid) | Yes | No | Yes | No (empties tanks) | Yes |
| Rainwater/greywater hybrid | Yes | Yes | Sometimes | Not the objective | Yes |
| **BUFFER** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |

This is conceptual positioning from public product descriptions and literature; it is not a patent search.

## Evidence that the combination matters

The simulation (simulation/results/REPORT.md) compares BUFFER with the nearest simple alternatives on 34 real
dry seasons:

- A **tank-threshold rule** (the logic of a level monitor with a low-level switch) still leaves 32.1 shortage days per season.
- A **static substitution rule** (always use the alternative for flexible uses) matches BUFFER's reliability but uses
  more than twice as much alternative water (10,958 L against 5,086 L per season), and fails when the alternative dries up (9.0 days against BUFFER's 0.5).
- Only the forecast-aware reserve rule gets both: near-zero shortage and minimal reliance on lower-quality water.

## Patent search

A preliminary patent search (9 October 2026) is documented in [patent-search.md](patent-search.md). It found no
document combining a recharge forecast, a protected drinking reserve and priority routing across household sources;
the closest documents each cover one or two elements. It is not a formal patentability opinion, so BUFFER's documents
still avoid "first" or "only" claims and say instead: "we found no system that combines …".

## References

1. Davey Water Products, *RainBank automatic rainwater harvesting* (product and installation documentation), https://daveywater.com/au/product/rainbank-for-surface-pumps/
2. OptiRTC, *The Opti solution*, https://www.optirtc.com/solution
3. RainGrid, *Intelligent Rain Retention and Reuse (IR3)*, https://raingrid.com/ir3/
4. *IoT-Based Solutions to Monitor Water Level, Leakage, and Motor Control for Smart Water Tanks*, Water (MDPI), 2022, https://www.mdpi.com/2073-4441/14/3/309
5. *Smart water level monitoring and management system using IoT*, IEEE, https://ieeexplore.ieee.org/document/9489082/
6. *Prospects of hybrid rainwater-greywater decentralised system for water recycling and reuse: A review*, Journal of Cleaner Production
7. Saha, A. et al. (2024), *Decision support system for community managed rainwater harvesting*, Heliyon 10(9), e30455
8. Shih, J.-S. & ReVelle, C. (1995), *Water supply operations during drought: A discrete hedging rule*, EJOR 82(1)
9. *Optimal Hedging Rules for Water Supply Reservoir Operations under Forecast Uncertainty and Conditional Value-at-Risk Criterion*, Water, 2017, 9(8), 568
10. Kang, Y. et al. (2026), *Reservoir operations for drought mitigation with dynamic hedging policy*, Journal of Hydrology 672, 135400
