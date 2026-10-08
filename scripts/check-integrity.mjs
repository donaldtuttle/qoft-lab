import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const expected = {
  'migration-v0.2.0.json':'c2620ac2add2edd161724f570fbcc020367acb9ebe22e2c9d13d4ae7d64d3852',
  'python-migration-v0.2.0.json':'f09724fa7700154e09f351d5a5b38779352a0f8968b0cdb7b00863f7f73f9117',
  'v0.1.0-toy-seed7.csv':'8b9ddbaed92ac9818fc46a219e1a256393eee77468e7b3b9b79656ade2620f53',
};
for(const [name,want] of Object.entries(expected)) {
  const got=createHash('sha256').update(readFileSync(`src/lib/lattice/fixtures/${name}`)).digest('hex');
  if(got!==want) throw new Error(`Fixture integrity mismatch: ${name}`);
}
console.log('PASS: all three fixture hashes match recorded provenance.');
