import hashlib
import json
from pathlib import Path
import sys
import unittest
import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'public'))
import lattice_reference as model

class ReferenceTests(unittest.TestCase):
    def test_pinned_source_telemetry(self):
        fixture=json.loads(Path('src/lib/lattice/fixtures/python-migration-v0.2.0.json').read_text())
        self.assertEqual(np.__version__,fixture['numpyVersion'])
        for case in fixture['scenarios']:
            cfg=case['config']
            with self.subTest(config=cfg):
                rows=model.run(model.Config(ticks=len(case['rowSha256']),seed=cfg['seed'],n=cfg['n'],
                    phase_flip=cfg['phaseFlipEnabled'],grid=cfg['grid'],matrix_step_size=cfg['matrixStepSize'],
                    neighbor_weight=cfg['neighborWeight'],matrix_weight=cfg['matrixWeight']))
                for row,want in zip(rows,case['rowSha256'],strict=True):
                    got=hashlib.sha256(json.dumps(row,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()
                    self.assertEqual(got,want,f"tick {row['tick']}")
    def test_deterministic_replay(self):
        cfg=model.Config(ticks=32,seed=7,n=2,phase_flip=True)
        self.assertEqual(model.run(cfg),model.run(cfg))
        self.assertEqual(model.check_pass(model.run(cfg),cfg),(True,[]))
    def test_phase_flip_preserves_power_and_is_reversible(self):
        field=np.array([[2+3j,0.1-0.2j],[4-5j,0+0j]])
        changed,_,event=model.phase_flip_gate(field,True)
        self.assertEqual(event,1)
        np.testing.assert_array_equal(np.abs(changed)**2,np.abs(field)**2)
        restored,_,_=model.phase_flip_gate(changed,True)
        np.testing.assert_array_equal(restored,field)
    def test_power_ratio_and_matrix_independence(self):
        field=np.array([1+0j,0+2j])
        values,peak,mean=model.relative_power_metric(field)
        self.assertEqual(mean,2.5)
        np.testing.assert_array_equal(values,np.array([1,4])/(2.5+model.EPS_POWER))
        self.assertEqual(peak,values[1])
        self.assertTrue(model.relative_power_check_ok())
    def test_operational_order(self):
        model.assert_tick_equivalent()
    def test_site_mapping_detects_permutation(self):
        cfg=model.Config(ticks=1,seed=7,n=2,phase_flip=False)
        matrices,_,i,j=model.init_state(cfg,np.random.default_rng(7))
        self.assertEqual(model.site_mapping_ok(matrices,i,j),1)
        i[0,0]=1
        self.assertEqual(model.site_mapping_ok(matrices,i,j),0)

if __name__=='__main__':
    unittest.main()
