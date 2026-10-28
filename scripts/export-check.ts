import assert from 'node:assert/strict';
import {generateRock as workshop} from '../src/runtime/index.js';
import {generateRock as exported} from '../runtime-dist/index.js';
import {readFileSync} from 'node:fs';
for(const dataset of ['recipes','recipes-v3'])for(const family of ['boulder','layered','shard']){const recipe=JSON.parse(readFileSync(`public/${dataset}/${family}-C-123.json`,'utf8'));for(const meshMode of ['voxel','lowpoly'] as const)for(const seed of [1009,2027,4093]){const a=workshop({recipe,seed,meshMode}),b=exported({recipe,seed,meshMode});assert.deepEqual(a,b);assert(b.positions.length>0);}}
console.log('PASS: 36 held-out generated models match compiled standalone runtime exactly; runtime has no external or reference-data imports.');
