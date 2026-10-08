import assert from "node:assert/strict";
import { test } from "node:test";
import { QoftSim, V0_CONFIG, telemetryToCsv } from "./qoft/sim.ts";
import { telemetryToPlainCsv } from "./plain-language.ts";

for (const enabled of [false, true]) {
  test(`plain CSV preserves every measurement with phase flips ${enabled ? "on" : "off"}`, () => {
    const sim = new QoftSim({ ...V0_CONFIG, collapse: enabled });
    const rows = Array.from({ length: 32 }, () => sim.step());
    const historical = telemetryToCsv(rows);
    const plain = telemetryToPlainCsv(rows).trim().split("\n");
    assert.equal(plain.shift(), "step_index,field_norm,neighbor_difference_norm,minimum_metric_determinant,mean_geometry_signal,peak_relative_intensity,phase_flip_occurred,grid_pairing_ok");
    assert.equal(plain.length, 32);
    plain.forEach((line, index) => {
      const r = rows[index];
      assert.deepEqual(line.split(",").map(Number), [r.t, r.stateNorm, r.gammaNbrNorm, r.det_g_min, r.pullback_mean, r.C_max, r.collapsed, r.section_law_ok]);
    });
    assert.equal(telemetryToCsv(rows), historical, "export must not mutate engine rows or historical CSV");
    assert.ok(rows.every((r) => r.collapsed === 0 || r.collapsed === 1), "phase flip is an event flag");
    if (enabled) {
      assert.ok(rows.some((r) => r.collapsed === 1), "the active intervention must actually trigger");
      assert.ok(sim.overThreshold() > 1, "flag semantics differ from a count of affected cells");
    } else {
      assert.ok(rows.every((r) => r.collapsed === 0));
    }
  });
}
