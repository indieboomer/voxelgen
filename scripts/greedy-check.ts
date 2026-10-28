import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {meshVoxels,sampleVoxels,baseRecipe,rng,type Voxels} from '../src/runtime/index.js';
const palette=[[0,0,0],[140,130,110],[90,100,120],[180,120,70]];
function fixture(test:(x:number,y:number,z:number)=>number):Voxels {const n=12,cells=new Uint8Array(n**3);for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++)cells[x+n*(y+n*z)]=test(x,y,z);return {version:1,resolution:n,cells,palette};}
function coverage(mesh:ReturnType<typeof meshVoxels>,n:number,scale:number){
 const faces=new Set<string>();assert.equal(mesh.positions.length/3,mesh.normals.length/3);assert.equal(mesh.uvs.length,mesh.positions.length/3*2);assert.equal(mesh.indices.length/6,mesh.positions.length/12);
 for(let q=0;q<mesh.positions.length/12;q++){
 const start=q*4,normal=Array.from(mesh.normals.slice(start*3,start*3+3)),axis=normal.findIndex(x=>x!==0),sign=normal[axis],u=(axis+1)%3,w=(axis+2)%3;assert.equal(normal.filter(x=>x!==0).length,1);assert(Math.abs(sign)===1);
 const coords=Array.from({length:4},(_,j)=>[0,1,2].map(k=>{const value=(mesh.positions[(start+j)*3+k]/scale+.5)*n;assert(Math.abs(value-Math.round(value))<.0001);return Math.round(value);}));
 const first=coords[0],minU=Math.min(...coords.map(p=>p[u])),maxU=Math.max(...coords.map(p=>p[u])),minW=Math.min(...coords.map(p=>p[w])),maxW=Math.max(...coords.map(p=>p[w]));assert(maxU>minU&&maxW>minW);
 const color=Array.from(mesh.colors.slice(start*3,start*3+3)).join(',');
 for(let j=0;j<4;j++){assert.equal(coords[j][axis],first[axis]);for(let k=0;k<3;k++){assert.equal(mesh.normals[(start+j)*3+k],normal[k]);assert.equal(mesh.colors[(start+j)*3+k],mesh.colors[start*3+k]);}const face=axis*2+(sign<0?1:0);assert(Math.abs(mesh.uvs[(start+j)*2]-coords[j][face<2?2:0]/n)<1e-6);assert(Math.abs(mesh.uvs[(start+j)*2+1]-coords[j][face<2?1:face<4?2:1]/n)<1e-6);}
 for(let j=minW;j<maxW;j++)for(let i=minU;i<maxU;i++){const key=`${axis}:${sign}:${first[axis]}:${i}:${j}:${color}`;assert(!faces.has(key),'Overlapping faces');faces.add(key);}
 for(let t=q*6;t<q*6+6;t+=3){const ids=Array.from(mesh.indices.slice(t,t+3));assert(ids.every(i=>i>=start&&i<start+4));const a=coords[ids[0]-start],b=coords[ids[1]-start],c=coords[ids[2]-start],ab=b.map((x,k)=>x-a[k]),ac=c.map((x,k)=>x-a[k]),cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];assert(cross[axis]*sign>0,'Inward or degenerate triangle');}
 }return [...faces].sort();
}
let cases=0;const results:any[]=[];
function verify(v:Voxels,name:string,scale=1){const before=v.cells.slice(),voxel=meshVoxels(v,scale,'voxel'),greedy=meshVoxels(v,scale,'lowpoly');assert.deepEqual(coverage(greedy,v.resolution,scale),coverage(voxel,v.resolution,scale),name);assert.deepEqual(greedy.boundingBox,voxel.boundingBox);assert.deepEqual(v.cells,before);assert(greedy.indices.length<=voxel.indices.length);assert.equal(greedy.stats.visibleFaces,voxel.stats.visibleFaces);assert.deepEqual(greedy,meshVoxels(v,scale,'lowpoly'));cases++;return {voxel,greedy};}
const cube=verify(fixture(()=>1),'solid cube');assert.equal(cube.greedy.indices.length/3,12);assert.equal(cube.voxel.indices.length/3,1728);
const split=verify(fixture(x=>x<6?1:2),'two materials');assert.equal(split.greedy.stats.quads,10);
verify(fixture((x,y,z)=>(x+y+z)%2?1:2),'checkerboard');verify(fixture((x,y,z)=>x===0||y===0||z===0||x===11||y===11||z===11?1:0),'hollow shell');verify(fixture((x,y,z)=>x<4||y<3&&z<7?1:0),'concave');verify(fixture((_x,y)=>y===4?1:0),'thin slab');verify(fixture(()=>0),'empty');
const random=rng(937);for(let i=0;i<10;i++)verify(fixture(()=>random()<.4?1+Math.floor(random()*3):0),'random '+i);
for(const family of ['boulder','layered','shard'] as const)for(const n of [12,28,48])for(const seed of [0,42,2027]){const v=sampleVoxels(baseRecipe(family),seed,n),{voxel,greedy}=verify(v,`${family}-${seed}-${n}`,seed===0?2:seed===2027?.5:1);if(seed===42&&n===28)results.push({family,resolution:n,seed,voxelTriangles:voxel.stats.triangles,lowpolyTriangles:greedy.stats.triangles,reductionPercent:(1-greedy.stats.triangles/voxel.stats.triangles)*100});}
const v=sampleVoxels(baseRecipe('boulder'),42,28),timings:any={};for(const mode of ['voxel','lowpoly'] as const){const times=[];for(let i=0;i<23;i++){const t=performance.now();meshVoxels(v,1,mode);if(i>=3)times.push(performance.now()-t);}times.sort((a,b)=>a-b);timings[mode]={repetitions:20,medianMs:times[10],p95Ms:times[18]};}
assert.throws(()=>meshVoxels(v,1,'invalid' as any),/Invalid mesh mode/);writeFileSync('reports/meshing-v5/verification.json',JSON.stringify({cases,cube:{voxelTriangles:1728,lowpolyTriangles:12},checks:['exact oriented surface and material coverage','no hidden faces or overlaps','outward winding','nondegenerate triangles','continuous planar UVs','bounding boxes','determinism','source voxels unchanged'],results,timings,environment:{node:process.version,platform:process.platform}},null,2));console.log(`PASS: ${cases} mesh pairs have identical oriented, colored surface coverage; cube 1728 -> 12 triangles.`);console.log(results);
