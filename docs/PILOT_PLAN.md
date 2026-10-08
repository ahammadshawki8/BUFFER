# Field pilot and user-testing plan

The simulation shows what BUFFER **could** do. A pilot measures what it **does** in real homes
(PROJECT.md §47, §48). Nothing in this plan has been carried out yet.

## Research questions

1. Does BUFFER reduce days without enough drinking and cooking water before the monsoon? (H1)
2. Is the benefit larger in seasons with late or uncertain rain? (H2)
3. Does the forecast-aware rule do better than a simple tank-threshold rule in real homes? (H3)
4. Do households understand the "freshwater runway" display and trust it? (H4)
5. How often do households override routing, and why?

## Site and households

- **Site:** a salinity-affected union in Koyra or Paikgacha, Khulna, through an NGO already running household rainwater programmes.
- **Households:** 20 with an existing rainwater tank of at least 1,000 L and a second, non-drinking source
  (pond, shallow tube well, second tank).
- **Design:** 10 households receive BUFFER Control; 10 matched households (tank size, family size, source) keep
  their current practice and receive BUFFER Lite in **monitoring-only** mode (sensor and logging, no advice) so
  both groups are measured the same way.

## Timeline

| When | Activity |
|---|---|
| Before the dry season (October) | Consent, baseline survey, source pre-qualification with the NGO, installation, training |
| November to May | Operation; weekly 5-minute check-in call; monthly visit |
| June (monsoon onset) | End-line survey and interviews; remove or hand over equipment |

## What is measured

| Measure | How | Group |
|---|---|---|
| Days without enough drinking and cooking water | Controller log (tank at reserve floor) + weekly self-report | Both |
| Freshwater used for drinking and cooking vs flexible uses | Flow sensor logs | Both |
| Emergency water purchased (litres, taka) | Weekly check-in | Both |
| Time spent fetching water | Weekly check-in | Both |
| Overrides and their reasons | Controller log + check-in question | BUFFER |
| Understanding of the display | Usability tasks (below) | BUFFER |
| Perceived water security | Short scale at baseline and end-line | Both |
| Safety incidents | Any use of alternative water for drinking; any lockout | BUFFER |

## Usability test (at installation and after one month)

Five tasks, observed, no help given:

1. "How many days of drinking water do you have left?" (reads the runway)
2. "Is rain expected before then?" (compares runway and recharge)
3. "What should you use for washing the floor today?" (reads the routing)
4. "Get drinking water if the machine stops working." (finds the bypass tap)
5. "Make the machine give you tank water for washing anyway." (uses the override)

Success: at least 4 of 5 tasks completed by the main water manager in the household (often a woman; schedule
sessions when she is available).

## Interview guide (end-line, 20-30 minutes, in Bangla)

1. Before BUFFER, how did you decide when to start saving rainwater?
2. This dry season, was there a time when drinking water ran short? What did you do?
3. Did BUFFER ever send water somewhere you did not want? What happened?
4. When did you use the override? Why?
5. Did the lights or the numbers ever confuse you?
6. Would you want BUFFER next year? What would you change?
7. Would you pay for it, or should it come with the tank? How much would be fair?

## Ethics and safeguards

- Written informed consent in Bangla; households may leave at any time and keep full manual access to their water.
- No routing of any source to drinking or cooking other than the household's established drinking source.
- Alternative-source uses agreed with the household and checked with the NGO's water-quality testing.
- Data stored locally on the controller and on the project laptop; no names in analysis files; sharing only
  with consent (PROJECT.md §46).
- University ethics review before any field work.

## Analysis

- Compare shortage days per household between groups (Mann-Whitney test; 10 vs 10 is small, so report effect
  sizes and individual household trajectories, not only p-values).
- Re-run the simulation with each household's measured demand and tank to check how well the model predicted reality.
- Publish where BUFFER helped, where it did not, and why (PROJECT.md §51).
