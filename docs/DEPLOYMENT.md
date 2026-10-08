# Deployment and business model

## Who pays, who benefits

The households BUFFER serves are price-sensitive, and the buyer is usually not the family.
BUFFER is therefore positioned **B2B2C** (PROJECT.md §31): NGOs, government programmes and rainwater
installers buy and install it; households use it.

| Channel | How BUFFER enters | Evidence the channel exists |
|---|---|---|
| NGO rainwater programmes | Added as a controller when a household rainwater system is installed or serviced | WaterAid Bangladesh's household systems in Paikgacha (29 systems, 123 people) |
| Government and climate-finance projects | Specified as a management layer on community and household rainwater systems | Community rainwater systems under the Gender Responsive Coastal Adaptation project (Green Climate Fund, Government of Bangladesh, DPHE) studied by Saha et al. (2024) |
| Rainwater tank installers | Sold as an upgrade on new installations | Existing local tank and plumbing trade |

## Product tiers

| Tier | What it is | Unit cost (estimate) | Best for |
|---|---|---|---|
| **BUFFER Lite** | Level sensor + controller + lights; advises which source to use | about 2,500 BDT | Entry level, households not ready for valves |
| **BUFFER Control** | Lite + valves and flow sensor; routes automatically | about 6,300 BDT grid-powered, about 9,300-10,300 BDT with solar | Households with a second source and a tank of 2,000 L or more |
| **BUFFER Community** | Control on a shared tank + programme dashboard | per site | Community rainwater systems and NGO portfolio monitoring |

Simulation results matter for the tier choice: with advice only (Lite), following the advice on 80% of days
already raises shortage from 0.5 to 8.1 days a season, and 60% raises it to 28 (REPORT.md). Lite is therefore
an entry product and a data-gathering tool; Control is the tier the simulated impact depends on.

Costs come from hardware/installation.md; bench prices in hardware/bom.csv are October 2026 retail prices
from Bangladeshi electronics shops.

## Cost per freshwater-day protected (illustrative)

If the simulated result held (about 70 shortage days avoided per household per dry season, 3,000 L tank),
a BUFFER Control unit at about 6,300 BDT would cost roughly **90 BDT per household shortage-day avoided in
the first season**, falling each season after (hardware lasts several years). Field data must replace these
numbers before they are used for funding decisions.

## Rollout path

| Stage | Scale | Goal | Exit criterion |
|---|---|---|---|
| 1. Bench validation | 1 rig | Repeatable switching; sensor and flow calibration | 50 consecutive requests routed correctly (validation/experiments.md) |
| 2. Observational pilot | 10-20 households, Lite | Measure real demand, tank sizes, sources, overrides | One full dry season of data |
| 3. Assisted control pilot | 10-20 households, Control | Measure shortage days against matched households without BUFFER | Fewer shortage days with no safety incidents |
| 4. Programme integration | 100-1,000 households with an NGO partner | Cost, maintenance, training at scale | Unit cost and maintenance plan agreed with the partner |

Details of stages 2 and 3: [PILOT_PLAN.md](PILOT_PLAN.md).

## Maintenance

- Quarterly: clean the sensor face, check valves and the bypass tap, check the first-flush diverter.
- Yearly: recalibrate tank geometry after any tank replacement; update the season's recharge climatology.
- Local technicians already servicing rainwater systems can do this with a phone and the dashboard.

## Intellectual property

The team retains IP in the solution under the competition rules. Code and documentation are public in this
repository; any patent filing would need the formal prior-art search in research/prior-art.md first.
