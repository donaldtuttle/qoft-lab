import { createHash } from 'node:crypto';

// Canonical little-endian float64 encoding, including integer coordinates and RNG words.
export function stateDigest(arrays: Array<ArrayLike<number>>) {
  const hash = createHash('sha256');
  for (const values of arrays) {
    const bytes = Buffer.alloc((values.length + 1) * 8);
    bytes.writeDoubleLE(values.length, 0);
    Array.from(values).forEach((value, index) => bytes.writeDoubleLE(value, (index + 1) * 8));
    hash.update(bytes);
  }
  return hash.digest('hex');
}
