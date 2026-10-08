// BUFFER controller logic, free of any hardware dependency so it runs on the
// ESP32 and in native unit tests. The allocation rule is the one evaluated in
// simulation/buffer_sim/model.py and shown in the dashboard (PROJECT.md §42).
#pragma once
#include <stdint.h>

namespace buffer {

enum class Mode : uint8_t { Normal, Preserve, Critical, Fault };
enum class Use : uint8_t { None, Drinking, Toilet, Floor, Washing };
enum class Source : uint8_t { None, Fresh, Alt };
enum class Override : uint8_t { Auto, ForceFresh };

const char* modeName(Mode m);
const char* useName(Use u);
const char* sourceName(Source s);
Use parseUse(const char* s);

inline bool isCritical(Use u) { return u == Use::Drinking; }

// Household demand in litres per day, at household scale.
struct Household {
  float critical_lpd = 20.0f;  // drinking + cooking
  float flexible_lpd = 30.0f;  // toilet, floor cleaning, selected washing
  float reserve_l = 20.0f;     // protected critical reserve
};

// A tank measured by an ultrasonic sensor mounted above it.
// `scale` converts rig litres to the household litres the rig represents.
struct Tank {
  float height_cm = 20.0f;      // usable water column from outlet to full
  float area_cm2 = 250.0f;      // horizontal cross-section
  float full_gap_cm = 4.0f;     // sensor-to-surface distance when full
  float scale = 40.0f;          // household litres per rig litre
};

// Household litres held in the tank for a measured sensor-to-surface distance.
float volumeLitres(const Tank& t, float distance_cm);

struct Plan {
  Mode mode = Mode::Normal;
  bool strict = false;          // no freshwater left for flexible use at all
  float draw_lpd = 0;           // planned freshwater use per day
  float allowance_lpd = 0;      // freshwater flexible uses may still take per day
  float runway_days = 0;        // days until the reserve floor at the planned draw
  float gap_days = 0;           // days the runway falls short of the recharge
};

// Plan the freshwater budget until the next reliable recharge.
Plan plan(float stored_l, float rain_days, const Household& hh);

// The same household with no control: every use draws freshwater.
Plan conventional(float stored_l, float rain_days, const Household& hh);

// Median-of-five filter for ultrasonic readings with a fault latch.
class LevelFilter {
 public:
  static constexpr float kMinCm = 2.0f;    // HC-SR04 blind zone
  static constexpr float kMaxCm = 400.0f;  // HC-SR04 rated range
  static constexpr int kFaultAfter = 5;    // consecutive bad readings before a fault

  // Returns true when `out` holds a fresh filtered distance.
  bool push(float distance_cm, float& out);
  bool faulted() const { return bad_ >= kFaultAfter; }

 private:
  float buf_[5] = {0};
  int count_ = 0;
  int next_ = 0;
  int bad_ = 0;
};

// Stateful controller: decides which valve serves each request and keeps the
// daily account of freshwater spent on flexible uses.
class Controller {
 public:
  Household hh;
  Override override_mode = Override::Auto;

  // Decide the source for a request. `sensor_ok` false means the level is
  // unknown: BUFFER then never assumes the tank is full (PROJECT.md §45).
  Source route(Use use, const Plan& p, bool alt_available, bool sensor_ok) const;

  // Record freshwater a flexible use actually drew, from the flow sensor.
  void addFlexibleFresh(float litres) { flex_used_today_ += litres; }
  float flexibleUsedToday() const { return flex_used_today_; }
  void newDay() { flex_used_today_ = 0; }

 private:
  float flex_used_today_ = 0;
};

}  // namespace buffer
