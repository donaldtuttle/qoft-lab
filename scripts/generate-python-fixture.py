"""Generate migration expectations from a clean, pinned source checkout."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import numpy as np

source_commit = '57459dcf2203ff1bbd3ad53eb89d0941c95901c6'
root = Path(sys.argv[1] if len(sys.argv) > 1 else '../qoft-lab-source').resolve()
assert subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip() == source_commit
path = 'public/gu_qoft_toy.py'
raw = (root/path).read_bytes()
assert raw == subprocess.check_output(['git','-C',str(root),'show',f'{source_commit}:{path}'])
spec = importlib.util.spec_from_file_location('source_reference', root/path)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
fixture = json.loads(Path('src/lib/lattice/fixtures/migration-v0.2.0.json').read_text())
scenarios=[]
for case in fixture['scenarios']:
    cfg=case['config']
    rows=module.run(module.Config(ticks=len(case['checkpoints']),seed=cfg['seed'],n=cfg['n'],
        collapse=cfg['phaseFlipEnabled'],grid=cfg['grid'],epsilon_g=cfg['matrixStepSize'],
        alpha=cfg['neighborWeight'],beta=cfg['matrixWeight']))
    digests=[]
    for row in rows:
        converted=dict(schemaVersion=2,tick=row['t'],stateNorm=row['stateNorm'],
            neighborResidualNorm=row['gammaNbrNorm'],minDeterminant=row['det_g_min'],
            meanMatrixCoupling=row['pullback_mean'],maxRelativePower=row['C_max'],
            phaseFlipApplied=row['collapsed'],siteMappingOk=row['section_law_ok'])
        digests.append(hashlib.sha256(json.dumps(converted,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest())
    scenarios.append(dict(config=cfg,rowSha256=digests))
Path('src/lib/lattice/fixtures/python-migration-v0.2.0.json').write_text(json.dumps(dict(
    sourceCommit=source_commit,sourceSha256=hashlib.sha256(raw).hexdigest(),numpyVersion=np.__version__,
    scenarios=scenarios),indent=2)+'\n')
print(f"Recorded {len(scenarios)} Python scenarios, {sum(len(s['rowSha256']) for s in scenarios)} ticks.")
