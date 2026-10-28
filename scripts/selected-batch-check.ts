import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {sampleVoxels,meshVoxels,rng,validate} from '../src/runtime/index.js';
import {mutate,describe,validationSeeds} from '../src/search/index.js';
import {rustModule} from '../src/export/rust.js';
let models=0,mutationChecks=0;const random=rng(17),source=readFileSync('src/export/rock_runtime.rs','utf8');
for(const file of readdirSync('public/recipes-v3').filter(f=>f.endsWith('.json'))){let recipe=JSON.parse(readFileSync('public/recipes-v3/'+file,'utf8'));validate(recipe);
 for(const seed of validationSeeds)for(const n of [12,28,48]){const v=sampleVoxels(recipe,seed,n),d=describe(v);assert(d.count>0,`${file} seed ${seed}, ${n}`);assert.equal(d.components,1);const mesh=meshVoxels(v);assert(mesh.indices.every(i=>i<mesh.positions.length/3));assert(mesh.uvs.every(x=>Number.isFinite(x)&&x>=0&&x<=1));models++;}
 for(let i=0;i<25;i++){recipe=mutate(recipe,random,true);validate(recipe);mutationChecks++;}
}
for(const family of ['boulder','layered','shard']){const recipe=JSON.parse(readFileSync(`public/recipes-v3/${family}-C-123.json`,'utf8'));writeFileSync(`public/rust/${family}-selected.rs`,rustModule(recipe,source));}
writeFileSync('reports/geometry-v3/selected-batch.json',JSON.stringify({models,mutationChecks,resolutions:[12,28,48],seeds:validationSeeds},null,2));console.log(`PASS: ${models} nonempty connected saved-generator models with valid mesh/UV buffers; ${mutationChecks} structural mutation checks.`);
