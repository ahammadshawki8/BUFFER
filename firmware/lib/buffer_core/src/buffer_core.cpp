#include "buffer_core.h"

#include <string.h>

namespace buffer {

namespace {
float clampf(float v, float lo, float hi) { return v < lo ? lo : (v > hi ? hi : v); }
float maxf(float a, float b) { return a > b ? a : b; }
float minf(float a, float b) { return a < b ? a : b; }
}  // namespace

const char* modeName(Mode m) {
  switch (m) {
    case Mode::Normal: return "NORMAL";
    case Mode::Preserve: return "PRESERVE";
    case Mode::Critical: return "CRITICAL";
    case Mode::Fault: return "FAULT";
  }
  return "?";
}

const char* useName(Use u) {
  switch (u) {
    case Use::Drinking: return "kitchen";
    case Use::Toilet: return "toilet";
    case Use::Floor: return "floor";
    case Use::Washing: return "washing";
    case Use::None: return "none";
  }
  return "none";
}

const char* sourceName(Source s) {
  switch (s) {
    case Source::Fresh: return "fresh";
    case Source::Alt: return "alt";
    case Source::None: return "none";
  }
  return "none";
}

Use parseUse(const char* s) {
  if (!s) return Use::None;
  if (strcmp(s, "kitchen") == 0 || strcmp(s, "drinking") == 0) return Use::Drinking;
  if (strcmp(s, "toilet") == 0) return Use::Toilet;
  if (strcmp(s, "floor") == 0) return Use::Floor;
  if (strcmp(s, "washing") == 0) return Use::Washing;
  return Use::None;
}

float volumeLitres(const Tank& t, float distance_cm) {
  const float depth = clampf(t.height_cm - (distance_cm - t.full_gap_cm), 0.0f, t.height_cm);
  return depth * t.area_cm2 / 1000.0f * t.scale;  // cm^3 -> L, then to household scale
}

Plan conventional(float stored_l, float rain_days, const Household& hh) {
  Plan p;
  p.mode = Mode::Normal;
  p.draw_lpd = hh.critical_lpd + hh.flexible_lpd;
  p.allowance_lpd = hh.flexible_lpd;
  p.runway_days = p.draw_lpd > 0 ? stored_l / p.draw_lpd : 0;
  p.gap_days = maxf(0, rain_days - p.runway_days);
  return p;
}

Plan plan(float stored_l, float rain_days, const Household& hh) {
  Plan p;
  const float rain = maxf(rain_days, 1.0f);
  const float usable = stored_l - hh.reserve_l;
  if (usable >= rain * (hh.critical_lpd + hh.flexible_lpd)) {
    p.mode = Mode::Normal;
    p.draw_lpd = hh.critical_lpd + hh.flexible_lpd;
    p.allowance_lpd = hh.flexible_lpd;
    p.runway_days = usable / p.draw_lpd;
    return p;
  }
  const float spare = usable - hh.critical_lpd * rain;
  if (spare < 0) {
    p.mode = Mode::Critical;
    p.strict = true;
    p.draw_lpd = hh.critical_lpd;
    p.runway_days = maxf(0, usable) / hh.critical_lpd;
    p.gap_days = rain - p.runway_days;
    return p;
  }
  p.mode = Mode::Preserve;
  p.allowance_lpd = minf(hh.flexible_lpd, spare / rain);
  p.strict = p.allowance_lpd < 0.05f;
  p.draw_lpd = hh.critical_lpd + p.allowance_lpd;
  p.runway_days = usable / p.draw_lpd;
  p.gap_days = maxf(0, rain - p.runway_days);
  return p;
}

bool LevelFilter::push(float d, float& out) {
  if (!(d >= kMinCm && d <= kMaxCm)) {  // also rejects NaN (no echo)
    if (bad_ < kFaultAfter) bad_++;
    return false;
  }
  bad_ = 0;
  buf_[next_] = d;
  next_ = (next_ + 1) % 5;
  if (count_ < 5) count_++;
  float s[5];
  for (int i = 0; i < count_; i++) s[i] = buf_[i];
  for (int i = 1; i < count_; i++) {  // insertion sort, at most five values
    float v = s[i];
    int j = i - 1;
    while (j >= 0 && s[j] > v) {
      s[j + 1] = s[j];
      j--;
    }
    s[j + 1] = v;
  }
  out = s[count_ / 2];
  return true;
}

Source Controller::route(Use use, const Plan& p, bool alt_available, bool sensor_ok) const {
  if (use == Use::None) return Source::None;
  // Drinking and cooking always get freshwater, in every mode.
  if (isCritical(use)) return Source::Fresh;
  // A household override is always obeyed; the dashboard shows its cost.
  if (override_mode == Override::ForceFresh) return Source::Fresh;
  // Unknown level: protect the freshwater as if it were scarce.
  if (!sensor_ok) return alt_available ? Source::Alt : Source::None;
  if (p.mode == Mode::Normal) return Source::Fresh;
  if (flex_used_today_ < p.allowance_lpd) return Source::Fresh;
  return alt_available ? Source::Alt : Source::None;
}

}  // namespace buffer
