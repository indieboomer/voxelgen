import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {baseRecipe,generateRock} from '../src/runtime/index.js';
import {rustModule} from '../src/export/rust.js';
const recipe=baseRecipe('boulder');recipe.operations=[{kind:'mass',x:.08,y:.08,z:.08,size:.08}];recipe.erosion=0;const path='.test-artifacts/tiny-surface-v6.rs',exe='.test-artifacts/tiny-surface-v6.exe';writeFileSync(path,rustModule(recipe,readFileSync('src/export/rock_runtime.rs','utf8'),{seed:42,resolution:12,scale:1,meshMode:'smooth-coarse'}));const build=spawnSync('rustc',['--edition=2021','-O','--crate-name','tiny_surface',path,'-o',exe],{encoding:'utf8'});assert.equal(build.status,0,build.stderr);let cases=0;
const hash=(bytes:Uint8Array)=>{let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return h>>>0;};
for(const n of [12,13,31])for(const mode of ['voxel','lowpoly','smooth','smooth-coarse'] as const){const model=generateRock({recipe,seed:42,resolution:n,meshMode:mode});if(n===12&&mode==='smooth-coarse')assert(model.stats.coarseFallback);const run=spawnSync(exe,['42',String(n),'1',mode],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);const actual=JSON.parse(run.stdout);assert.equal(actual.positionsHash,hash(new Uint8Array(model.positions.buffer)));assert.equal(actual.normalsHash,hash(new Uint8Array(model.normals.buffer)));assert.equal(actual.uvsHash,hash(new Uint8Array(model.uvs.buffer)));assert.equal(actual.indices,model.indices.length);cases++;}
writeFileSync('reports/smoothing-v6/tiny-and-odd-grids.json',JSON.stringify({cases,tinyModelFallback:true,oddGrids:[13,31],nativeParity:true},null,2));console.log('PASS: tiny-model full-detail fallback and odd-grid native parity.');
