import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {generateRock,baseRecipe,rng,validate} from '../src/runtime/index.js';
import {references} from '../src/references.js';
import {mutate,describe,search} from '../src/search/index.js';
import {rustModule} from '../src/export/rust.js';
import {parsePrompt,promptStarter} from '../src/workflow/prompt.js';
const folder='reports/vegetation-v7';mkdirSync(folder,{recursive:true});mkdirSync('.test-artifacts/v7',{recursive:true});mkdirSync('public/recipes-v7',{recursive:true});
const hash=(bytes:Uint8Array)=>{let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return h>>>0;};
const bytes=(a:Float32Array|Uint32Array)=>new Uint8Array(a.buffer,a.byteOffset,a.byteLength);
const fingerprint=(a:ReturnType<typeof generateRock>)=>({cellsHash:hash(a.voxels.cells),textureHash:hash(a.texture.pixels),vertices:a.positions.length/3,indices:a.indices.length,positionsHash:hash(bytes(a.positions)),normalsHash:hash(bytes(a.normals)),colorsHash:hash(bytes(a.colors)),uvsHash:hash(bytes(a.uvs)),indicesHash:hash(bytes(a.indices))});
let plants=0,parity=0;const meshes:any[]=[];
for(const family of ['tree','bush'] as const){
 for(const n of [12,20,28,48])for(const seed of [0,42,2027,4294967295]){const a=generateRock({recipe:baseRecipe(family),seed,resolution:n});assert(a.voxels.cells.includes(1));assert(a.voxels.cells.some(x=>x>=2));assert.equal(describe(a.voxels).components,1);plants++;}
 for(const n of [12,20,28,48])for(const ref of references(family,n)){assert.equal(describe(ref).components,1);assert(ref.cells.includes(1));plants++;}
 let r=baseRecipe(family);const rand=rng(543);for(let i=0;i<200;i++){r=mutate(r,rand,true);validate(r);}
 let last;for(const tick of search(family,'C',96,123))last=tick;assert(last);assert(last.history.at(-1)!<=last.history[0]);writeFileSync(`public/recipes-v7/${family}-C-123.json`,JSON.stringify(last.best,null,2));
 assert.equal(parsePrompt(`A broad ${family} with rich green foliage`).family,family);validate(promptStarter(parsePrompt(`A tall narrow ${family} with layered foliage`)));
}
for(const family of ['boulder','layered','shard','tree','bush'] as const){
 const recipe=baseRecipe(family),source=`.test-artifacts/v7/${family}.rs`,exe=`.test-artifacts/v7/${family}.exe`;writeFileSync(source,rustModule(recipe,readFileSync('src/export/rock_runtime.rs','utf8'),{seed:42,resolution:28,scale:1,meshMode:'superlow'}));
 const build=spawnSync('rustc',['--edition=2021','-O','--crate-name',family,source,'-o',exe],{encoding:'utf8'});assert.equal(build.status,0,build.stderr);
 for(const mode of ['voxel','lowpoly','smooth','smooth-coarse','superlow'] as const)for(const seed of [42,2027]){
 const resolution=seed===42?28:20,scale=seed===42?1:.5,t=performance.now(),a=generateRock({recipe,seed,resolution,scale,meshMode:mode});
 assert(a.positions.every(Number.isFinite));assert(a.normals.every(Number.isFinite));
 const run=spawnSync(exe,[String(seed),String(resolution),String(scale),mode],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.deepEqual(JSON.parse(run.stdout),fingerprint(a),`${family} ${mode} ${seed}`);parity++;
 if(mode==='superlow'){
 const stats=a.stats as {triangles:number;sourceTriangles:number;targetTriangles:number};assert(stats.triangles<=stats.sourceTriangles);assert(a.texture.width>=128);assert(a.colors.every(x=>x===1));assert(a.uvs.every(x=>x>=0&&x<=1));
 const edges=new Map<string,number>();let volume=0;const key=(i:number)=>Array.from(a.positions.slice(i*3,i*3+3)).join(':');
 for(let i=0;i<a.indices.length;i+=3){const f=Array.from(a.indices.slice(i,i+3)),p=f.map(id=>Array.from(a.positions.slice(id*3,id*3+3)));const ab=p[1].map((x,d)=>x-p[0][d]),ac=p[2].map((x,d)=>x-p[0][d]),cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];assert(Math.hypot(...cross)>1e-9);volume+=p[0][0]*(p[1][1]*p[2][2]-p[1][2]*p[2][1])+p[0][1]*(p[1][2]*p[2][0]-p[1][0]*p[2][2])+p[0][2]*(p[1][0]*p[2][1]-p[1][1]*p[2][0]);for(let j=0;j<3;j++){const pair=[key(f[j]),key(f[(j+1)%3])].sort().join('|');edges.set(pair,(edges.get(pair)??0)+1);}}
 assert([...edges.values()].every(x=>x===2));assert(volume>0);assert.deepEqual(fingerprint(a),fingerprint(generateRock({recipe,seed,resolution,scale,meshMode:mode})));
 meshes.push({family,seed,resolution,...stats,atlas:a.texture.width,milliseconds:Math.round(performance.now()-t)});
 }
 }
 writeFileSync(`public/rust/${family}-superlow.rs`,readFileSync(source));
}
writeFileSync(`${folder}/verification.json`,JSON.stringify({plants,parity,meshes,checks:['wood and foliage','single connected component','200 structural mutations per plant','prompt categories','96-candidate searches','exact JS/Rust buffers and rebaked pixels','closed manifold superlow meshes','positive volume','nondegenerate triangles','determinism']},null,2));console.log({plants,parity,meshes});
