import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {generateRock,baseRecipe} from '../src/runtime/index.js';
import {rustModule} from '../src/export/rust.js';
mkdirSync('.test-artifacts/rust',{recursive:true});
const template=readFileSync('src/export/rock_runtime.rs','utf8');
function hash(bytes:Uint8Array){let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return h>>>0;}
const bytes=(a:Float32Array|Uint32Array)=>new Uint8Array(a.buffer,a.byteOffset,a.byteLength);
let comparisons=0;
for(const family of ['boulder','layered','shard'] as const)for(const version of [1,2]){
 const recipe=version===1?JSON.parse(readFileSync(`public/recipes/${family}-C-123.json`,'utf8')):baseRecipe(family);
 const name=`${family}-v${version}`,source=`.test-artifacts/rust/${name}.rs`,exe=`.test-artifacts/rust/${name}.exe`;
 writeFileSync(source,rustModule(recipe,template));
 const build=spawnSync('rustc',['--edition=2021','-O','--crate-name',name.replaceAll('-','_'),source,'-o',exe],{encoding:'utf8'});assert.equal(build.status,0,build.stderr);
 for(const meshMode of ['voxel','lowpoly'] as const)for(const seed of [0,42,1009,4294967295])for(const resolution of [12,28,48]){
 const scale=seed===42?2:seed===1009?.5:1,a=generateRock({recipe,seed,resolution,scale,meshMode});
 const run=spawnSync(exe,[String(seed),String(resolution),String(scale),meshMode],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);const actual=JSON.parse(run.stdout);
 const expected={cellsHash:hash(a.voxels.cells),textureHash:hash(a.texture.pixels),vertices:a.positions.length/3,indices:a.indices.length,positionsHash:hash(bytes(a.positions)),normalsHash:hash(bytes(a.normals)),colorsHash:hash(bytes(a.colors)),uvsHash:hash(bytes(a.uvs)),indicesHash:hash(bytes(a.indices))};
 assert.deepEqual(actual,expected,`${name}, seed ${seed}, grid ${resolution}, ${meshMode}`);comparisons++;
 }
 writeFileSync(`public/rust/${name}.rs`,rustModule(recipe,template));
 const invalid=spawnSync(exe,['42','100'],{encoding:'utf8'});assert.notEqual(invalid.status,0);
}
writeFileSync('reports/meshing-v5/rust-verification.json',JSON.stringify({comparisons,compiler:spawnSync('rustc',['--version'],{encoding:'utf8'}).stdout.trim(),checks:['voxels','texture RGBA','positions','normals','colors','UVs','indices','invalid resolution','voxel and greedy modes']},null,2));console.log(`PASS: ${comparisons} exact JS/Rust buffer fingerprint comparisons; version 1 + 2, six recipes, extreme seeds, three grids, three scales and both mesh modes.`);
