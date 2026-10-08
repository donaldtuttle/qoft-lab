import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  LatticeSim, REFERENCE_CONFIG, EPS_NORM, EPS_POWER, GOLDEN_FIXTURE,
  PHASE_FLIP_THRESHOLD, CSV_FIELDS, TELEMETRY_SCHEMA_VERSION,
  copyField, neighborResidual, computeUpdate, addAndNormalize, stepField,
  relativePowerMetric, relativePowerCheckOk, applyPhaseFlip,
  siteMappingHolds, matrixAt, siteCoordinates, symmetricComponentCount,
  runChecks, telemetryToCsv, csvFilename, checkPass,
} from './sim.ts';
import { fromLegacyTelemetry } from './legacy-telemetry.ts';

const array = (...values: number[]) => new Float64Array(values);
const readFixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
const legacyRows = () => {
  const [header, ...lines] = readFixture('v0.1.0-toy-seed7.csv').toString().trim().split(/\r?\n/);
  return lines.map(line => Object.fromEntries(header.split(',').map((key, index) => [key, Number(line.split(',')[index])])));
};

describe('reference contract and historical compatibility', () => {
  it('passes P1-P6 and replays deterministically', () => {
    const first = runChecks(REFERENCE_CONFIG);
    assert.deepEqual(first.result, {ok:true, fails:[], p5:true});
    assert.deepEqual(first.rows, runChecks(REFERENCE_CONFIG).rows);
  });
  it('preserves the original fixture bytes and 32 telemetry rows', () => {
    assert.equal(createHash('sha256').update(readFixture('v0.1.0-toy-seed7.csv')).digest('hex'), GOLDEN_FIXTURE.sha256);
    assert.deepEqual(runChecks(REFERENCE_CONFIG).rows, legacyRows().map(fromLegacyTelemetry));
  });
  it('exports only the versioned public schema', () => {
    const {rows} = runChecks(REFERENCE_CONFIG, 2);
    assert.equal(rows[0].schemaVersion, TELEMETRY_SCHEMA_VERSION);
    assert.deepEqual(Object.keys(rows[0]), CSV_FIELDS);
    const lines = telemetryToCsv(rows).trim().split('\n');
    assert.equal(lines.length, 3);
    assert.equal(lines[0], CSV_FIELDS.join(','));
    assert.equal(lines[1].split(',')[0], '2');
    assert.equal(csvFilename(REFERENCE_CONFIG, 32), 'telemetry_seed7_ticks32_phaseflipoff.csv');
  });
  it('imports all three old residual names and rejects disagreement or missing data', () => {
    const row = legacyRows()[0];
    const expected = fromLegacyTelemetry(row);
    assert.deepEqual(fromLegacyTelemetry({...row, gammaNbrNorm:row.reflexNorm, gammaNorm:row.reflexNorm}), expected);
    assert.throws(() => fromLegacyTelemetry({...row, gammaNorm:row.reflexNorm + 1}), /conflicting/);
    assert.throws(() => fromLegacyTelemetry({...row, t:NaN}), /nonfinite/);
    const {reflexNorm, ...missing} = row;
    assert.throws(() => fromLegacyTelemetry(missing), /Missing/);
  });
  it('reset reproduces the initial state and next step', () => {
    const sim = new LatticeSim(REFERENCE_CONFIG);
    const first = sim.step();
    for(let i=0;i<8;i++) sim.step();
    sim.reset();
    assert.equal(sim.tick, 0);
    assert.equal(sim.last, null);
    assert.deepEqual(sim.step(), first);
  });
  it('rejects an unsupported spatial dimension', () => {
    assert.throws(() => new LatticeSim({...REFERENCE_CONFIG, n:4}), /n = 2/);
    assert.equal(symmetricComponentCount(2), 3);
  });
});

describe('grid and matrix storage', () => {
  it('round trips coordinates and detects a swapped mapping', () => {
    const sim = new LatticeSim(REFERENCE_CONFIG);
    assert.deepEqual(siteCoordinates(matrixAt(sim.matrices, sim.siteI, sim.siteJ, sim.L, 3, 5)), {i:3,j:5});
    assert.ok(siteMappingHolds(sim.matrices,sim.siteI,sim.siteJ,sim.L));
    [sim.siteI[0],sim.siteI[8]] = [sim.siteI[8],sim.siteI[0]];
    assert.equal(siteMappingHolds(sim.matrices,sim.siteI,sim.siteJ,sim.L), false);
  });
  it('rejects missing or nonfinite matrix storage', () => {
    const sim = new LatticeSim(REFERENCE_CONFIG);
    assert.equal(siteMappingHolds(sim.matrices.slice(1),sim.siteI,sim.siteJ,sim.L), false);
    sim.matrices[0] = NaN;
    assert.equal(siteMappingHolds(sim.matrices,sim.siteI,sim.siteJ,sim.L), false);
  });
  it('computes a periodic four-neighbor stencil at the boundary', () => {
    const real = new Float64Array(9); real[0] = 1;
    const residual = neighborResidual(real,new Float64Array(9),3);
    assert.deepEqual(Array.from(residual.r), [-1,0.25,0.25,0.25,0,0,0.25,0,0]);
    assert.ok(residual.i.every(value => value === 0));
  });
  it('a constant field has zero neighbor residual', () => {
    const residual = neighborResidual(new Float64Array(16).fill(2),new Float64Array(16).fill(-3),4);
    assert.ok(residual.r.every(value => value === 0));
    assert.ok(residual.i.every(value => value === 0));
  });
});

describe('update arithmetic', () => {
  it('copying does not share the input buffers', () => {
    const r=array(0.6,0.8), i=array(0,0), copy=copyField(r,i);
    assert.deepEqual(copy,{r,i}); copy.r[0]=0; copy.i[0]=1;
    assert.equal(r[0],0.6); assert.equal(i[0],0);
  });
  it('zero coupling applies only stabilized normalization', () => {
    const r=array(1,2,3,4), i=array(0,0,0,0);
    const next=stepField(r,i,array(9,8,7,6),2,0,0);
    assert.deepEqual(Array.from(next.r),Array.from(r,value=>value*(1/(Math.sqrt(30)+EPS_NORM))));
  });
  it('the pre-summed helper stays within 1e-15 of the operational order', () => {
    const sim=new LatticeSim(REFERENCE_CONFIG);
    const update=computeUpdate(sim.fieldReal,sim.fieldImag,sim.couplingField,sim.L,0.15,0.05);
    const summed=addAndNormalize(sim.fieldReal,sim.fieldImag,update.r,update.i);
    const direct=stepField(sim.fieldReal,sim.fieldImag,sim.couplingField,sim.L,0.15,0.05);
    for(let k=0;k<direct.r.length;k++) {
      assert.ok(Math.abs(direct.r[k]-summed.r[k])<1e-15);
      assert.ok(Math.abs(direct.i[k]-summed.i[k])<1e-15);
    }
  });
});

describe('relative power and phase intervention', () => {
  it('matches the analytic ratio and zero-field boundary', () => {
    const result=relativePowerMetric([1,0],[0,2]);
    assert.equal(result.meanPower,2.5);
    assert.deepEqual(Array.from(result.relativePower),[1/(2.5+EPS_POWER),4/(2.5+EPS_POWER)]);
    assert.equal(result.maxRelativePower,4/(2.5+EPS_POWER));
    assert.deepEqual(Array.from(relativePowerMetric([0,0],[0,0]).relativePower),[0,0]);
    assert.ok(relativePowerCheckOk());
  });
  it('does not change when matrices change and does not mutate the field', () => {
    const sim=new LatticeSim(REFERENCE_CONFIG);
    const real=sim.fieldReal.slice(), imag=sim.fieldImag.slice();
    const first=relativePowerMetric(sim.fieldReal,sim.fieldImag);
    sim.matrices.fill(1234);
    assert.deepEqual(relativePowerMetric(sim.fieldReal,sim.fieldImag),first);
    assert.deepEqual(sim.fieldReal,real); assert.deepEqual(sim.fieldImag,imag);
  });
  it('uses a strict threshold and returns an event flag, not a site count', () => {
    const r=array(1,2,3),i=array(4,5,6);
    assert.equal(applyPhaseFlip(r,i,array(1.67,1.68,2),PHASE_FLIP_THRESHOLD),1);
    assert.deepEqual(Array.from(r),[1,-2,-3]); assert.deepEqual(Array.from(i),[4,-5,-6]);
  });
  it('preserves site power and applying twice restores the field', () => {
    const sim=new LatticeSim({...REFERENCE_CONFIG,phaseFlipEnabled:true});
    const r=sim.fieldReal.slice(),i=sim.fieldImag.slice();
    const power=Array.from(r,(v,k)=>v*v+i[k]*i[k]);
    applyPhaseFlip(sim.fieldReal,sim.fieldImag,sim.relativePower,0);
    assert.deepEqual(Array.from(sim.fieldReal,(v,k)=>v*v+sim.fieldImag[k]*sim.fieldImag[k]),power);
    applyPhaseFlip(sim.fieldReal,sim.fieldImag,sim.relativePower,0);
    assert.deepEqual(sim.fieldReal,r);assert.deepEqual(sim.fieldImag,i);
  });
  it('a disabled gate emits no events; an enabled reference run exercises it', () => {
    const off=runChecks(REFERENCE_CONFIG).rows;
    const on=runChecks({...REFERENCE_CONFIG,phaseFlipEnabled:true}).rows;
    assert.ok(off.every(row=>row.phaseFlipApplied===0));
    assert.ok(on.some(row=>row.phaseFlipApplied===1));
  });
  it('P1-P6 report a broken numeric check', () => {
    const row=runChecks(REFERENCE_CONFIG,1).rows[0];
    const result=checkPass([{...row,siteMappingOk:0,minDeterminant:-1,maxRelativePower:NaN,phaseFlipApplied:1}],REFERENCE_CONFIG,false);
    for(const id of ['P1','P2','P4','P5','P6']) assert.ok(result.fails.some(f=>f.startsWith(id)));
    assert.equal(result.ok,false);
  });
});
