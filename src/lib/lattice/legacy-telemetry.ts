import { TELEMETRY_SCHEMA_VERSION, type TelemetryRow } from './sim.ts';

/** Explicit import boundary for archived v0.1.x numeric CSV rows. */
export function fromLegacyTelemetry(row: Record<string, number>): TelemetryRow {
  const residuals = ['gammaNbrNorm', 'gammaNorm', 'reflexNorm']
    .filter(key => row[key] !== undefined).map(key => row[key]);
  if (!residuals.length || residuals.some(value => value !== residuals[0])) {
    throw new Error('Missing or conflicting legacy neighbor residual aliases');
  }
  const converted: TelemetryRow = {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    tick: row.t,
    stateNorm: row.stateNorm,
    neighborResidualNorm: residuals[0],
    minDeterminant: row.det_g_min,
    meanMatrixCoupling: row.pullback_mean,
    maxRelativePower: row.C_max,
    phaseFlipApplied: row.collapsed,
    siteMappingOk: row.section_law_ok,
  };
  if (Object.values(converted).some(value => !Number.isFinite(value))) {
    throw new Error('Legacy telemetry contains missing or nonfinite values');
  }
  return converted;
}
