import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { stateDigest } from './state-digest.ts';
import { fromLegacyTelemetry } from '../src/lib/lattice/legacy-telemetry.ts';

const sourceCommit = '57459dcf2203ff1bbd3ad53eb89d0941c95901c6';
const sourceRoot = resolve(process.argv[2] || '../qoft-lab-source');
if (execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim() !== sourceCommit) {
  throw new Error('Source checkout is not at the pinned commit');
}
const path = 'src/lib/qoft/sim.ts';
const bytes = readFileSync(resolve(sourceRoot, path));
const committed = execFileSync('git', ['-C', sourceRoot, 'show', `${sourceCommit}:${path}`]);
if (!bytes.equals(committed)) throw new Error('Source engine has uncommitted changes');
const sourceSha256 = createHash('sha256').update(bytes).digest('hex');
const { QoftSim, V0_CONFIG } = await import(pathToFileURL(resolve(sourceRoot, path)).href);
const cases = [];
for (const seed of [1, 7, 23]) for (const grid of [8, 16]) for (const collapse of [false, true]) {
  cases.push({cfg:{...V0_CONFIG, seed, grid, collapse}, ticks:128});
}
for (const collapse of [false, true]) for (const [alpha,beta,epsilonG] of [[0,0,0],[0.5,0.2,0.08]]) {
  cases.push({cfg:{...V0_CONFIG, seed:99, grid:32, collapse, alpha,beta,epsilonG},ticks:64});
}
const scenarios = cases.map(({cfg,ticks}) => {
  const sim = new QoftSim(cfg);
  const digest = () => stateDigest([sim.g,sim.psiR,sim.psiI,sim.phi,sim.C,sim.det,sim.siteI,sim.siteJ,
    [sim.t,sim.rng.a,sim.rng.b,sim.rng.c,sim.rng.d]]);
  const initial = digest();
  const checkpoints = [];
  for(let i=0;i<ticks;i++) checkpoints.push({row:fromLegacyTelemetry(sim.step()),stateSha256:digest()});
  return {config:{seed:cfg.seed,n:cfg.n,grid:cfg.grid,phaseFlipEnabled:cfg.collapse,
    matrixStepSize:cfg.epsilonG,neighborWeight:cfg.alpha,matrixWeight:cfg.beta},initial,checkpoints};
});
writeFileSync(new URL('../src/lib/lattice/fixtures/migration-v0.2.0.json', import.meta.url),
  JSON.stringify({sourceCommit,sourceSha256,nodeVersion:process.version,scenarios},null,2)+'\n');
console.log(`Recorded ${scenarios.length} source scenarios, ${scenarios.reduce((n,s)=>n+s.checkpoints.length,0)} ticks.`);
