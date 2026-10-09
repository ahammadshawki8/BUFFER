# Preliminary patent search

**Date:** 9 October 2026
**Status:** preliminary, documented search by the team. **Not** a patentability or freedom-to-operate opinion;
a registered patent agent should review this before any filing or commercial launch.

## What was searched

**BUFFER's combination, broken into elements:**

| # | Element |
|---|---|
| E1 | Manages two or more household water sources of different quality |
| E2 | Uses a forecast of the next reliable recharge (rain) to plan |
| E3 | Protects a minimum reserve of drinking/cooking water |
| E4 | Routes specific end uses (toilet, floor cleaning, washing) to a source by priority, before shortage occurs |
| E5 | Acts automatically through valves |

**Database access.** Google Patents was searched through web search restricted to patents.google.com, and the
closest documents were read in full on Google Patents. Espacenet and WIPO Patentscope could not be queried
directly with the tools available (both need an interactive browser); Google Patents indexes EP, WO and many
national collections, so most of their content is covered, but a direct search of both remains to be done.

**Queries** (PROJECT.md §87, adapted to plain search):

1. rainwater tank controller weather forecast reserve potable water allocation household
2. multi-source household water supply controller switching rainwater greywater mains based on tank level and forecast
3. water storage reserve drinking water priority allocation drought rationing controller predicted rainfall
4. predictive rainwater harvesting system release before rain forecast tank control
5. estimating days of water remaining in tank household consumption forecast alert reserve drinking water
6. potable water conservation route non-potable demand to alternative source when stored potable water predicted insufficient until next rainfall
7. water allocation by use priority household drinking toilet valves controller water scarcity
8. rural drinking water storage intelligent rationing controller rainfall prediction dual source domestic water priority
9. hedging rule reservoir release control system predicted inflow minimum reserve water supply curtailment controller
10. rainwater tank intelligent management weather forecast drinking water reserve dual water supply household (Espacenet/Patentscope terms)

## Closest documents, read in full

| Document | Owner | Status | What it claims | E1 | E2 | E3 | E4 | E5 |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|
| [US8591147B2](https://patents.google.com/patent/US8591147) Combined water storage and detention system | OptiRTC (orig. Geosyntec) | Active, to 2031 | Monitors storage, receives a precipitation forecast, and **discharges** water before rain when storage plus forecast inflow would exceed capacity | No | **Yes** | No | No | **Yes** |
| [AU2005263207B2](https://patents.google.com/patent/AU2005263207B2/en) Controller for providing supplementing water | Davey Water Products | Ceased | Pressure-actuated switch that supplies rainwater first and falls back to mains when rainwater cannot be supplied | **Yes** | No | No | No | **Yes** |
| [WO2016012895A1](https://patents.google.com/patent/WO2016012895A1/en) / [US20170159270A1](https://patents.google.com/patent/US20170159270A1/en) Monitoring and controlling water consumption and availability | Neotech Systems | Ceased | Monitors household tank levels, predicts and advises future usage from availability and consumption history, controls pumps | No | No | No | No | Partly (pumps) |
| [US11913820B2](https://patents.google.com/patent/US11913820B2/en) Tank level monitoring | Cognosos (orig. Cox) | Active, to 2042 | Remote tank-level monitoring with an estimate of days until a tank is empty; aimed at propane and diesel | No | No | No | No | No |
| [EP2342386B1](https://patents.google.com/patent/EP2342386B1/en) / [WO2009133405A1](https://patents.google.com/patent/WO2009133405A1/en) Rainwater harvesting system | N. O'Driscoll | Not in force | Gutter collectors and level sensors pump rainwater to a roof tank for toilet flushing | Partly | No | No | No | **Yes** |
| [US20120199220A1](https://patents.google.com/patent/US20120199220A1/en) Grey water processing and distribution | — | Not checked | Grey/rainwater collection with level, flow and pressure sensors controlling pumps and valves; reuse routing is fixed by design, not triggered by a predicted shortage | **Yes** | No | No | No | **Yes** |
| [US8191307B2](https://patents.google.com/patent/US8191307) Harvested water irrigation | — | Not checked | Irrigates from harvested water, adding potable water only at a critical soil-moisture deficit | Partly | No | No | No | **Yes** |

Also returned but less relevant: irrigation controllers with water budgeting (US8401705B2), drought monitoring
tools (US20140343855A1), a water storage reserve and return apparatus on the service line (US20140083509A1), and
first-flush controllers using weather data (CN105839758A).

## Findings

1. **No document found combines E2, E3 and E4**: planning on a recharge forecast in order to keep a drinking reserve by
   moving replaceable uses to another source before shortage. Each element exists somewhere on its own.
2. **Forecast-based tank control exists (US8591147B2) but with the opposite objective**: it empties storage before
   rain to prevent overflow; BUFFER holds water through a dry spell. BUFFER never discharges water to make room.
3. **Source switching exists (Davey AU2005263207B2)** but reacts only once the preferred source has run out.
4. **"Days until empty" estimates exist (US11913820B2)** for fuel tanks; BUFFER's runway number is a similar idea applied
   to drinking water and tied to a recharge forecast and an allocation rule.

## What this means for the submission

- Safe to say: "We searched patent databases and found no system that combines a recharge forecast, a protected
  drinking reserve and priority routing across household water sources."
- Still not safe to say "the first" or "the only": a preliminary search cannot prove absence, Chinese-language and
  utility-model collections were not searched in depth, and non-patent products may exist.
- Freedom to operate: BUFFER does not discharge stored water ahead of rain (US8591147B2) and is not a fuel-tank
  monitor (US11913820B2), but whether any active claim reads on BUFFER is a legal question for a patent agent.

## Next steps (before any filing)

1. Direct searches on [Espacenet](https://worldwide.espacenet.com/) and [WIPO Patentscope](https://patentscope.wipo.int/)
   with the queries above, including Chinese-language terms (rainwater, drinking water reserve, intelligent water supply).
2. Classification searches. Candidate codes to confirm with a patent agent: E03B 1/04 (domestic water supply installations,
   including dual and greywater systems), E03B 3/02 (collecting drinking water from rain), G05B 13/04 (predictive control),
   G06Q 50/06 (utilities management).
3. A patent agent's review of the claims of US8591147B2 and US11913820B2 against BUFFER's design.
