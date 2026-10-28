import type {Voxels} from './index.js';
import {meshSurfaceNets} from './surface-nets.js';
type Texture={width:number;height:number;pixels:Uint8Array};
const dot=(a:number[],b:number[])=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a:number[],b:number[])=>a.map((x,i)=>x-b[i]);
const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const quadError=(q:number[],p:number[])=>{const v=[...p,1];let e=0;for(let i=0;i<4;i++)for(let j=0;j<4;j++)e+=v[i]*q[i*4+j]*v[j];return Math.max(0,e);};
const rounded=(x:number,s:number)=>Math.floor(x*s+.5)/s;
function closestWeights(p:number[],a:number[],b:number[],c:number[]){
 const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return [1,0,0];const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return [0,1,0];const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const t=d1/(d1-d3);return [1-t,t,0];}const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return [0,0,1];const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const t=d2/(d2-d6);return [1-t,0,t];}const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0){const t=(d4-d3)/(d4-d3+d5-d6);return [0,1-t,t];}const den=1/(va+vb+vc),v=vb*den,w=vc*den;return [1-v-w,v,w];
}
export function meshSuperLow(v:Voxels,scale:number,detail:Texture){
 const source=meshSurfaceNets(v,scale,true),positions:number[][]=[],lookup=new Map<string,number>(),remap:number[]=[],bits=new Uint32Array(source.positions.buffer);
 for(let i=0;i<source.positions.length;i+=3){const key=`${bits[i]}:${bits[i+1]}:${bits[i+2]}`;let id=lookup.get(key);if(id===undefined){id=positions.length;lookup.set(key,id);positions.push([source.positions[i]/scale,source.positions[i+1]/scale,source.positions[i+2]/scale]);}remap.push(id);}
 let faces=Array.from({length:source.indices.length/3},(_,i)=>Array.from(source.indices.slice(i*3,i*3+3),a=>remap[a]));
 const sourceTriangles=faces.length,family=v.material?.family??'boulder',budget=Math.min(sourceTriangles,family==='tree'?256:family==='bush'?192:160),quadrics=positions.map(()=>new Array(16).fill(0));
 for(const f of faces){const normal=cross(sub(positions[f[1]],positions[f[0]]),sub(positions[f[2]],positions[f[0]])),length=Math.sqrt(dot(normal,normal));if(length<1e-12)continue;const plane=[...normal.map(x=>x/length),0];plane[3]=-dot(plane,positions[f[0]]);for(const id of f)for(let i=0;i<4;i++)for(let j=0;j<4;j++)quadrics[id][i*4+j]+=plane[i]*plane[j];}
 const materialGroup=(p:number[])=>{if(family!=='tree'&&family!=='bush')return 0;const n=v.resolution,q=p.map(x=>Math.max(0,Math.min(n-1,Math.floor((x+.5)*n)))) as number[];let best=Infinity,value=0;for(let z=Math.max(0,q[2]-2);z<=Math.min(n-1,q[2]+2);z++)for(let y=Math.max(0,q[1]-2);y<=Math.min(n-1,q[1]+2);y++)for(let x=Math.max(0,q[0]-2);x<=Math.min(n-1,q[0]+2);x++){const m=v.cells[x+n*(y+n*z)];if(!m)continue;const d=(x-q[0])**2+(y-q[1])**2+(z-q[2])**2;if(d<best){best=d;value=m;}}return value===1?1:2;};
 const groups=positions.map(materialGroup);let collapses=0;
 while(faces.length>budget){
  const neighbors=positions.map(()=>new Set<number>()),incident=positions.map(()=>[] as number[]),edges=new Map<string,{a:number;b:number;opposite:number[]}>();
  faces.forEach((f,fi)=>{for(const a of f)incident[a].push(fi);for(let j=0;j<3;j++){const a=Math.min(f[j],f[(j+1)%3]),b=Math.max(f[j],f[(j+1)%3]),key=a+':'+b;neighbors[a].add(b);neighbors[b].add(a);let e=edges.get(key);if(!e){e={a,b,opposite:[]};edges.set(key,e);}e.opposite.push(f[(j+2)%3]);}});
  const candidates:{a:number;b:number;p:number[];q:number[];cost:number}[]=[];
  for(const e of edges.values()){
   const {a,b}=e;if(e.opposite.length!==2||groups[a]!==groups[b])continue;const common=[...neighbors[a]].filter(x=>neighbors[b].has(x));if(common.length!==2||!e.opposite.every(x=>common.includes(x)))continue;
   const q=quadrics[a].map((x,i)=>x+quadrics[b][i]),pa=positions[a],pb=positions[b],middle=pa.map((x,i)=>(x+pb[i])*.5),e0=quadError(q,pa),e1=quadError(q,pb),em=quadError(q,middle),aa=2*(e1+e0-2*em),bb=e1-e0-aa,t=aa>1e-12?Math.max(0,Math.min(1,-bb/(2*aa))):.5;
   let best:number[]|undefined,cost=Infinity;
   for(const fraction of [t,0,.5,1]){const p=pa.map((x,i)=>rounded(x+(pb[i]-x)*fraction,1e9)),error=rounded(quadError(q,p),1e12);if(error<cost){best=p;cost=error;}}
   candidates.push({a,b,p:best!,q,cost});
  }
  candidates.sort((a,b)=>a.cost-b.cost||a.a-b.a||a.b-b.b);let chosen:typeof candidates[number]|undefined;
  for(const candidate of candidates){let valid=true;const affected=new Set([...incident[candidate.a],...incident[candidate.b]]);
   for(const fi of affected){const f=faces[fi];if(f.includes(candidate.a)&&f.includes(candidate.b))continue;const before=f.map(i=>positions[i]),after=f.map(i=>i===candidate.a||i===candidate.b?candidate.p:positions[i]),old=cross(sub(before[1],before[0]),sub(before[2],before[0])),next=cross(sub(after[1],after[0]),sub(after[2],after[0]));if(dot(next,next)<1e-18||dot(old,next)<.25*Math.sqrt(dot(old,old)*dot(next,next))){valid=false;break;}}
   if(valid){chosen=candidate;break;}
  }
  if(!chosen)break;positions[chosen.a]=chosen.p;quadrics[chosen.a]=chosen.q;faces=faces.map(f=>f.map(i=>i===chosen!.b?chosen!.a:i)).filter(f=>new Set(f).size===3);collapses++;
 }
 // Build a spatial lookup of the original smoothed source for texture transfer.
 const bins=Array.from({length:512},()=>[] as number[]),src=Array.from({length:source.indices.length/3},(_,i)=>Array.from(source.indices.slice(i*3,i*3+3),id=>[source.positions[id*3]/scale,source.positions[id*3+1]/scale,source.positions[id*3+2]/scale]));
 const bin=(x:number)=>Math.max(0,Math.min(7,Math.floor((x+.5)*8)));
 src.forEach((tri,i)=>{const lo=[0,1,2].map(d=>bin(Math.min(...tri.map(p=>p[d])))),hi=[0,1,2].map(d=>bin(Math.max(...tri.map(p=>p[d]))));for(let z=lo[2];z<=hi[2];z++)for(let y=lo[1];y<=hi[1];y++)for(let x=lo[0];x<=hi[0];x++)bins[x+8*(y+8*z)].push(i);});
 function sample(p:number[]){const q=p.map(bin),seen=new Set<number>();let best=Infinity,face=0,weights=[1,0,0];
  for(let radius=0;radius<8;radius++){
   for(let z=Math.max(0,q[2]-radius);z<=Math.min(7,q[2]+radius);z++)for(let y=Math.max(0,q[1]-radius);y<=Math.min(7,q[1]+radius);y++)for(let x=Math.max(0,q[0]-radius);x<=Math.min(7,q[0]+radius);x++)for(const id of bins[x+8*(y+8*z)]){if(seen.has(id))continue;seen.add(id);const tri=src[id],w=closestWeights(p,tri[0],tri[1],tri[2]),hit=[0,1,2].map(d=>w.reduce((s,a,i)=>s+a*tri[i][d],0)),delta=sub(p,hit),distance=dot(delta,delta);if(distance<best){best=distance;face=id;weights=w;}}
   const distances=[0,1,2].flatMap(d=>[q[d]-radius<=0?Infinity:p[d]-(q[d]-radius)/8+.5,q[d]+radius>=7?Infinity:(q[d]+radius+1)/8-.5-p[d]]),bound=Math.min(...distances);if(best<Infinity&&best<=bound*bound)break;
  }
  const ids=Array.from(source.indices.slice(face*3,face*3+3)),uv=[0,1].map(d=>weights.reduce((s,a,i)=>s+a*source.uvs[ids[i]*2+d],0)),tx=Math.min(detail.width-1,Math.max(0,Math.floor(uv[0]*detail.width))),ty=Math.min(detail.height-1,Math.max(0,Math.floor(uv[1]*detail.height))),offset=(tx+detail.width*ty)*4;
  return [0,1,2].map(d=>{const color=Math.floor(source.colors[ids[0]*3+d]*255+.5);return Math.floor((color*detail.pixels[offset+d]+127)/255);});
 }
 const tile=12,gutter=2,columns=Math.max(1,Math.ceil(Math.sqrt(faces.length)));let size=16;while(size<columns*tile)size*=2;const pixels=new Uint8Array(size*size*4);for(let i=3;i<pixels.length;i+=4)pixels[i]=255;
 const out:number[]=[],normals:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[],min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 faces.forEach((f,i)=>{const points=f.map(id=>positions[id]),x=(i%columns)*tile,y=Math.floor(i/columns)*tile,ab=sub(points[1],points[0]),ac=sub(points[2],points[0]),normal=cross(ab,ac),length=Math.sqrt(dot(normal,normal));
  for(let py=0;py<tile;py++)for(let px=0;px<tile;px++){let s=Math.max(0,(px-gutter)/(tile-2*gutter)),t=Math.max(0,(py-gutter)/(tile-2*gutter));if(s+t>1){const total=s+t;s/=total;t/=total;}const p=[0,1,2].map(d=>points[0][d]*(1-s-t)+points[1][d]*s+points[2][d]*t),rgb=sample(p),offset=(x+px+size*(y+py))*4;for(let d=0;d<3;d++)pixels[offset+d]=rgb[d];}
  const tex=[[x+gutter,y+gutter],[x+tile-gutter,y+gutter],[x+gutter,y+tile-gutter]];
  for(let j=0;j<3;j++){indices.push(out.length/3);for(let d=0;d<3;d++){const p=points[j][d]*scale;out.push(p);min[d]=Math.min(min[d],p);max[d]=Math.max(max[d],p);normals.push(normal[d]/length);colors.push(1);}uvs.push(tex[j][0]/size,tex[j][1]/size);}
 });
 return {positions:new Float32Array(out),normals:new Float32Array(normals),colors:new Float32Array(colors),uvs:new Float32Array(uvs),indices:new Uint32Array(indices),boundingBox:{min,max},texture:{width:size,height:size,pixels},meshMode:'superlow' as const,stats:{visibleFaces:source.stats.visibleFaces,quads:0,triangles:faces.length,sourceTriangles,targetTriangles:budget,edgeCollapses:collapses,rebaked:true}};
}
