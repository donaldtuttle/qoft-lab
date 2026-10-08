import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { it } from 'node:test';
import { LatticeSim, type Config, type TelemetryRow } from './sim.ts';
import { stateDigest } from '../../../scripts/state-digest.ts';

type Scenario = {config:Config;initial:string;checkpoints:{row:TelemetryRow;stateSha256:string}[]};
const fixture = JSON.parse(readFileSync(new URL('./fixtures/migration-v0.2.0.json',import.meta.url),'utf8')) as {
  sourceCommit:string; scenarios:Scenario[];
};
assert.equal(fixture.sourceCommit,'57459dcf2203ff1bbd3ad53eb89d0941c95901c6');
for (const scenario of fixture.scenarios) {
  const {seed,grid,phaseFlipEnabled,neighborWeight,matrixWeight,matrixStepSize}=scenario.config;
  it(`source parity: seed ${seed}, grid ${grid}, gate ${phaseFlipEnabled}, weights ${neighborWeight}/${matrixWeight}/${matrixStepSize}`,()=>{
    const sim=new LatticeSim(scenario.config);
    const digest=()=>{
      const rng=sim.rng as unknown as {a:number;b:number;c:number;d:number};
      return stateDigest([sim.matrices,sim.fieldReal,sim.fieldImag,sim.couplingField,sim.relativePower,sim.det,sim.siteI,sim.siteJ,
        [sim.tick,rng.a,rng.b,rng.c,rng.d]]);
    };
    assert.equal(digest(),scenario.initial,'initial state');
    for(const expected of scenario.checkpoints) {
      assert.deepEqual(sim.step(),expected.row,`telemetry tick ${expected.row.tick}`);
      assert.equal(digest(),expected.stateSha256,`state tick ${expected.row.tick}`);
    }
  });
}
