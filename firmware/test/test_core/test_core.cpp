// Native tests for the controller logic: pio test -e native
#include <math.h>
#include <unity.h>

#include "buffer_core.h"

using namespace buffer;

void setUp() {}
void tearDown() {}

static Household demo() { return Household{20.0f, 30.0f, 20.0f}; }

// The same numbers the dashboard demo and simulation/tests use.
void test_conventional_runs_dry_on_day_4() {
  Plan p = conventional(200, 7, demo());
  TEST_ASSERT_FLOAT_WITHIN(1e-4, 4.0f, p.runway_days);
  TEST_ASSERT_FLOAT_WITHIN(1e-4, 3.0f, p.gap_days);
}

void test_preserve_reaches_day_7() {
  Plan p = plan(200, 7, demo());
  TEST_ASSERT_EQUAL(Mode::Preserve, p.mode);
  TEST_ASSERT_FLOAT_WITHIN(1e-3, 40.0f / 7.0f, p.allowance_lpd);
  TEST_ASSERT_FLOAT_WITHIN(1e-3, 7.0f, p.runway_days);
  TEST_ASSERT_FLOAT_WITHIN(1e-3, 0.0f, p.gap_days);
}

void test_delay_to_day_9_tightens_to_strict() {
  Plan p = plan(200, 9, demo());
  TEST_ASSERT_EQUAL(Mode::Preserve, p.mode);
  TEST_ASSERT_TRUE(p.strict);
  TEST_ASSERT_FLOAT_WITHIN(1e-3, 9.0f, p.runway_days);
}

void test_critical_when_drinking_alone_cannot_last() {
  Plan p = plan(150, 10, demo());
  TEST_ASSERT_EQUAL(Mode::Critical, p.mode);
  TEST_ASSERT_FLOAT_WITHIN(1e-3, 6.5f, p.runway_days);
  TEST_ASSERT_FLOAT_WITHIN(1e-3, 3.5f, p.gap_days);
}

void test_normal_when_rain_is_close() {
  Plan p = plan(200, 2, demo());
  TEST_ASSERT_EQUAL(Mode::Normal, p.mode);
  TEST_ASSERT_FLOAT_WITHIN(1e-3, 30.0f, p.allowance_lpd);
}

void test_drinking_always_gets_freshwater() {
  Controller c;
  Plan p = plan(150, 10, demo());
  TEST_ASSERT_EQUAL(Source::Fresh, c.route(Use::Drinking, p, true, true));
  TEST_ASSERT_EQUAL(Source::Fresh, c.route(Use::Drinking, p, false, false));
}

void test_flexible_uses_allowance_then_alternative() {
  Controller c;
  c.hh = demo();
  Plan p = plan(200, 7, demo());  // allowance 5.71 L/day
  TEST_ASSERT_EQUAL(Source::Fresh, c.route(Use::Toilet, p, true, true));
  c.addFlexibleFresh(6.0f);
  TEST_ASSERT_EQUAL(Source::Alt, c.route(Use::Toilet, p, true, true));
  c.newDay();
  TEST_ASSERT_EQUAL(Source::Fresh, c.route(Use::Floor, p, true, true));
}

void test_strict_plan_sends_flexible_to_alternative() {
  Controller c;
  Plan p = plan(200, 9, demo());
  TEST_ASSERT_EQUAL(Source::Alt, c.route(Use::Washing, p, true, true));
  TEST_ASSERT_EQUAL(Source::None, c.route(Use::Washing, p, false, true));
}

void test_override_forces_freshwater() {
  Controller c;
  c.override_mode = Override::ForceFresh;
  Plan p = plan(200, 9, demo());
  TEST_ASSERT_EQUAL(Source::Fresh, c.route(Use::Toilet, p, true, true));
}

void test_sensor_fault_protects_freshwater() {
  Controller c;
  Plan p = plan(200, 2, demo());  // would be NORMAL if the level were trusted
  TEST_ASSERT_EQUAL(Source::Alt, c.route(Use::Toilet, p, true, false));
  TEST_ASSERT_EQUAL(Source::Fresh, c.route(Use::Drinking, p, true, false));
}

void test_volume_from_distance() {
  Tank t;  // 20 cm column, 250 cm2, full at 4 cm, x40
  TEST_ASSERT_FLOAT_WITHIN(1e-3, 200.0f, volumeLitres(t, 4.0f));
  TEST_ASSERT_FLOAT_WITHIN(1e-3, 100.0f, volumeLitres(t, 14.0f));
  TEST_ASSERT_FLOAT_WITHIN(1e-3, 0.0f, volumeLitres(t, 30.0f));
  TEST_ASSERT_FLOAT_WITHIN(1e-3, 200.0f, volumeLitres(t, 1.0f));  // splash above full clamps
}

void test_filter_takes_median_and_latches_fault() {
  LevelFilter f;
  float out = 0;
  f.push(10, out);
  f.push(10, out);
  f.push(55, out);  // one bad echo
  f.push(10, out);
  TEST_ASSERT_TRUE(f.push(10, out));
  TEST_ASSERT_FLOAT_WITHIN(1e-4, 10.0f, out);
  for (int i = 0; i < LevelFilter::kFaultAfter; i++) TEST_ASSERT_FALSE(f.push(NAN, out));
  TEST_ASSERT_TRUE(f.faulted());
  TEST_ASSERT_TRUE(f.push(12, out));
  TEST_ASSERT_FALSE(f.faulted());
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_conventional_runs_dry_on_day_4);
  RUN_TEST(test_preserve_reaches_day_7);
  RUN_TEST(test_delay_to_day_9_tightens_to_strict);
  RUN_TEST(test_critical_when_drinking_alone_cannot_last);
  RUN_TEST(test_normal_when_rain_is_close);
  RUN_TEST(test_drinking_always_gets_freshwater);
  RUN_TEST(test_flexible_uses_allowance_then_alternative);
  RUN_TEST(test_strict_plan_sends_flexible_to_alternative);
  RUN_TEST(test_override_forces_freshwater);
  RUN_TEST(test_sensor_fault_protects_freshwater);
  RUN_TEST(test_volume_from_distance);
  RUN_TEST(test_filter_takes_median_and_latches_fault);
  return UNITY_END();
}
