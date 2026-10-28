import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {references,referenceDataset} from '../src/references.js';
import {describe} from '../src/search/index.js';
import {meshVoxels,parseVoxels} from '../src/runtime/index.js';
const records=[];
for(const family of ['boulder','layered','shard'] as const)for(const n of [12,20,24,28,32,48])for(const [index,v] of references(family,n).entries()){
 const desc=describe(v),mesh=meshVoxels(v);assert(desc.count>0);assert.equal(desc.components,1,`${family} ${n} ${index}`);assert([...mesh.positions].every(Number.isFinite));assert(mesh.indices.every(i=>i<mesh.positions.length/3));assert(v.provenance?.includes('AI-generated 2D'));assert.deepEqual(parseVoxels(JSON.parse(JSON.stringify({...v,cells:Array.from(v.cells)}))).cells,v.cells);records.push({family,n,index,occupied:desc.count,components:desc.components,vertices:mesh.positions.length/3});
}
writeFileSync('reports/reference-v2/verification.json',JSON.stringify({dataset:referenceDataset,models:records.length,records},null,2));console.log(`PASS ${records.length} connected reference objects, finite geometry, valid indices and voxel round trips.`);
