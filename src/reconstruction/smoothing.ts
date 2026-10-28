import {meshVoxels} from '../runtime/index.js';
import {project} from './core.js';
import {contourSegments,signedContourDistance,type Segment} from './contours.js';
import {smoothingSettings,type SmoothingStats,type SmoothingSettings} from './smoothing-types.js';
import type {PreparedView,ReconstructionResult} from './types.js';
export type SurfaceGeometry={positions:Float32Array;normals:Float32Array;colors:Float32Array;uvs:Float32Array;indices:Uint32Array;boundingBox:{min:number[];max:number[]};meshMode:string;stats:{visibleFaces:number;quads:number;triangles:number};featureTags?:Uint8Array;smoothingStats?:SmoothingStats};
const dot=(a:number[],b:number[])=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a:number[],b:number[])=>a.map((x,i)=>x-b[i]),cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=(a:number[])=>{const l=Math.sqrt(dot(a,a))||1;return a.map(x=>x/l);};
function solve(a:number[],b:number[]){const m=Array.from({length:3},(_,i)=>[...a.slice(i*3,i*3+3),b[i]]);for(let k=0;k<3;k++){let pivot=k;for(let i=k+1;i<3;i++)if(Math.abs(m[i][k])>Math.abs(m[pivot][k]))pivot=i;[m[k],m[pivot]]=[m[pivot],m[k]];const den=m[k][k];if(Math.abs(den)<1e-14)return [0,0,0];for(let j=k;j<4;j++)m[k][j]/=den;for(let i=0;i<3;i++)if(i!==k){const f=m[i][k];for(let j=k;j<4;j++)m[i][j]-=f*m[k][j];}}return m.map(row=>row[3]);}
function worldNormal(view:PreparedView,n:number[]){let x=n[0]*(view.alignment.flip?-1:1),y=n[1];switch(view.direction){case'front':return[x,-y,0];case'back':return[-x,-y,0];case'left':return[0,-y,x];case'right':return[0,-y,-x];case'top':return[x,0,y];case'bottom':return[x,0,-y];}}
function influence(p:number[],result:ReconstructionResult,s:SmoothingSettings){const q=p.map(x=>x/result.worldSide+.5),inside=(b:{min:number[];max:number[]})=>q.every((x,i)=>x>=b.min[i]&&x<=b.max[i]);let weight=s.scope==='auto'?1:inside(s.region)?1:0;
 if(weight&&s.scope==='selected'){let distance=Infinity;for(let d=0;d<3;d++){if(s.region.min[d]>0)distance=Math.min(distance,q[d]-s.region.min[d]);if(s.region.max[d]<1)distance=Math.min(distance,s.region.max[d]-q[d]);}weight=Math.min(1,Math.max(0,distance*result.voxels.resolution/1.5));}
 for(const box of s.protectedRegions)if(inside(box))weight=0;for(const stroke of s.strokes){const distance=Math.sqrt(q.reduce((sum,x,i)=>sum+(x-stroke.center[i])**2,0));if(distance<=stroke.radius)weight=stroke.mode==='protect'?0:Math.max(weight,Math.min(1,(1-distance/stroke.radius)*3));}return weight*s.strength;
}
export function smoothSurface(result:ReconstructionResult,progress:(p:number)=>void=()=>{}):SurfaceGeometry{
 const settings=smoothingSettings(result.options.smoothing),n=result.voxels.resolution,side=n+2,cellSide=n+1,h=result.voxelSize,world=result.worldSide;
 const stats:SmoothingStats={method:'silhouette-guided dual contouring',applied:false,vertices:0,planes:0,curves:0,creases:0,corners:0,protected:0,thinProtected:0,fallbackEdges:0,repairedVertices:0,maxShiftVoxels:0,maxSilhouetteErrorVoxels:0};
 const fallback=(reason:string):SurfaceGeometry=>({...meshVoxels(result.voxels,world,result.options.meshMode),smoothingStats:{...stats,applied:false,fallbackReason:reason}});
 const grid=new Uint8Array(side**3),flags=new Uint8Array(grid.length),stride=[1,side,side*side];for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++)grid[x+1+side*(y+1+side*(z+1))]=result.voxels.cells[x+n*(y+n*z)];
 // Protect narrow solids and finite empty channels, not the unbounded exterior.
 if(settings.preserveThin)for(let axis=0;axis<3;axis++){const u=(axis+1)%3,v=(axis+2)%3;for(let j=0;j<side;j++)for(let i=0;i<side;i++){let k=0;while(k<side){const q=[0,0,0];q[u]=i;q[v]=j;q[axis]=k;const start=k,index=q[0]+side*(q[1]+side*q[2]),solid=!!grid[index];while(k<side){q[axis]=k;const id=q[0]+side*(q[1]+side*q[2]);if(!!grid[id]!==solid)break;k++;}if(k-start<=2&&(solid||start>0&&k<side))for(let t=start;t<k;t++){q[axis]=t;flags[q[0]+side*(q[1]+side*q[2])]|=1<<axis;}}}}
 const sources=result.views.map(view=>({view,segments:contourSegments(view,settings.featureAngle)}));
 const node=(x:number,y:number,z:number)=>[(x-.5)/n*world-world/2,(y-.5)/n*world-world/2,(z-.5)/n*world-world/2];
 type Hermite={p:number[];normals:number[][];valid:boolean};const edges=new Map<number,Hermite>();
 const cross2=(a:number[],b:number[])=>a[0]*b[1]-a[1]*b[0];
 function edge(x:number,y:number,z:number,axis:number):Hermite{
  const index=x+side*(y+side*z),key=index*3+axis,cached=edges.get(key);if(cached)return cached;const a=node(x,y,z),b=[...a];b[axis]+=h;const inside=!!grid[index],candidates:{t:number;n:number[]}[]=[];
  for(const source of sources){const pa=project(source.view,a,result.objectHeight),pb=project(source.view,b,result.objectHeight),r=[pb[0]-pa[0],pb[1]-pa[1]];if(Math.hypot(...r)<1e-10)continue;
   for(const segment of source.segments){const s=[segment.b[0]-segment.a[0],segment.b[1]-segment.a[1]],den=cross2(r,s);if(Math.abs(den)<1e-12)continue;const q=[segment.a[0]-pa[0],segment.a[1]-pa[1]],t=cross2(q,s)/den,u=cross2(q,r)/den;if(t< -1e-8||t>1+1e-8||u< -1e-8||u>1+1e-8||((segment.normal[0]*r[0]+segment.normal[1]*r[1]>0)!==inside))continue;
    const p=a.map((value,d)=>value+(b[d]-value)*t);let valid=true;for(const other of sources){if(other===source)continue;const uv=project(other.view,p,result.objectHeight);if(signedContourDistance(uv as [number,number],other.segments)>.8){valid=false;break;}}if(!valid)continue;const local=unit(segment.startNormal.map((value,d)=>value*(1-u)+segment.endNormal[d]*u));candidates.push({t:Math.max(0,Math.min(1,t)),n:worldNormal(source.view,local)});
   }
  }
  if(result.options.viewMode==='two'&&axis===2){const depth=result.objectHeight*result.options.depthRatio/2;for(const zPlane of[-depth,depth]){const t=(zPlane-a[2])/h;if(t>=0&&t<=1&&((zPlane>0)===inside))candidates.push({t,n:[0,0,zPlane>0?1:-1]});}}
  let answer:Hermite;if(candidates.length){candidates.sort((a,b)=>inside?a.t-b.t:b.t-a.t);const t=candidates[0].t;answer={p:a.map((value,d)=>value+(b[d]-value)*t),normals:candidates.filter(c=>Math.abs(c.t-t)<1e-6).map(c=>unit(c.n)),valid:true};}else{const normal=[0,0,0];normal[axis]=inside?1:-1;answer={p:a.map((value,d)=>(value+b[d])/2),normals:[normal],valid:false};stats.fallbackEdges++;}edges.set(key,answer);return answer;
 }
 const ids=new Int32Array(cellSide**3).fill(-1),base:number[][]=[],positions:number[][]=[],target:number[][]=[],tags:number[]=[],weights:number[]=[],cosine=Math.cos(settings.featureAngle*Math.PI/180);
 const at=(x:number,y:number,z:number)=>grid[x+side*(y+side*z)];
 for(let z=0;z<cellSide;z++){for(let y=0;y<cellSide;y++)for(let x=0;x<cellSide;x++){
  const values=Array.from({length:8},(_,i)=>at(x+(i&1),y+((i>>1)&1),z+((i>>2)&1)));if(values.every(Boolean)||values.every(a=>!a))continue;
  const p=[x/n*world-world/2,y/n*world-world/2,z/n*world-world/2],constraints:Hermite[]=[],matrix=[1e-6,0,0,0,1e-6,0,0,0,1e-6],rhs=[0,0,0],normals:number[][]=[];let thin=0;
  for(let i=0;i<8;i++){thin|=flags[x+(i&1)+side*(y+((i>>1)&1)+side*(z+((i>>2)&1)))];for(let d=0;d<3;d++){if(i&(1<<d))continue;const j=i|(1<<d);if(!!values[i]===!!values[j])continue;constraints.push(edge(x+(i&1),y+((i>>1)&1),z+((i>>2)&1),d));}}
  for(const c of constraints)for(const normal of c.normals){normals.push(normal);const relative=c.p.map((a,d)=>(a-p[d])/h),distance=dot(normal,relative);for(let a=0;a<3;a++){rhs[a]+=normal[a]*distance;for(let b=0;b<3;b++)matrix[a*3+b]+=normal[a]*normal[b];}}
  const groups:number[][]=[];for(const normal of normals){const group=groups.find(g=>dot(unit(g),normal)>=cosine);if(group)for(let d=0;d<3;d++)group[d]+=normal[d];else groups.push([...normal]);}
  let tag=groups.length>=3?4:groups.length===2?3:1;if(groups.length===1){const normal=unit(groups[0]);if(normals.some(a=>dot(a,normal)<.999))tag=2;}
  let weight=influence(p,result,settings);if(!constraints.some(c=>c.valid))weight=0;if(thin){tag=6;stats.thinProtected++;}else if(!weight){tag=5;stats.protected++;}else if(tag===1)stats.planes++;else if(tag===2)stats.curves++;else if(tag===3)stats.creases++;else stats.corners++;
  const q=solve(matrix,rhs).map((a,d)=>(thin&(1<<d))?0:Math.max(-Math.min(.4999,settings.maxShift),Math.min(Math.min(.4999,settings.maxShift),a))*h),candidate=p.map((a,d)=>a+q[d]*weight),id=base.length;ids[x+cellSide*(y+cellSide*z)]=id;base.push(p);target.push(candidate);positions.push([...candidate]);tags.push(tag);weights.push(weight);
 }progress((z+1)/cellSide*.55);}
 type Quad={ids:number[];axis:number;sign:number;material:number};const quads:Quad[]=[];
 const idAt=(p:number[])=>ids[p[0]+cellSide*(p[1]+cellSide*p[2])];
 for(let axis=0;axis<3;axis++){const u=(axis+1)%3,w=(axis+2)%3;for(let k=0;k<=n;k++)for(let j=1;j<=n;j++)for(let i=1;i<=n;i++){const p=[0,0,0];p[axis]=k;p[u]=i;p[w]=j;const a=at(p[0],p[1],p[2]);p[axis]++;const b=at(p[0],p[1],p[2]);p[axis]--;if(!!a===!!b)continue;const q=[p.slice(),p.slice(),p.slice(),p.slice()];q[0][u]--;q[0][w]--;q[1][w]--;q[3][u]--;const order=a?[0,1,2,3]:[0,3,2,1],vertices=order.map(t=>idAt(q[t]));if(vertices.some(id=>id<0))return fallback('Incomplete surface connectivity.');quads.push({ids:vertices,axis,sign:a?1:-1,material:a||b});}}
 if(quads.length>50000)return fallback('Smoothing surface exceeds 100,000 triangles; use a coarser grid.');
 const triangles=quads.flatMap(q=>[[q.ids[0],q.ids[1],q.ids[2]],[q.ids[0],q.ids[2],q.ids[3]]]),edgeCounts=new Map<string,number>(),links=base.map(()=>new Map<number,number[]>());
 for(const f of triangles)for(let j=0;j<3;j++){const a=f[j],b=f[(j+1)%3],c=f[(j+2)%3],key=Math.min(a,b)+':'+Math.max(a,b);edgeCounts.set(key,(edgeCounts.get(key)??0)+1);const link=links[a];if(!link.has(b))link.set(b,[]);if(!link.has(c))link.set(c,[]);link.get(b)!.push(c);link.get(c)!.push(b);}
 if([...edgeCounts.values()].some(x=>x!==2))return fallback('Diagonal or non-manifold voxel contacts; original geometry retained.');
 for(const link of links){if(!link.size)continue;if([...link.values()].some(a=>a.length!==2))return fallback('Non-manifold vertex; original geometry retained.');const start=link.keys().next().value!,seen=new Set([start]),todo=[start];while(todo.length)for(const j of link.get(todo.pop()!)!)if(!seen.has(j)){seen.add(j);todo.push(j);}if(seen.size!==link.size)return fallback('Disconnected surface fan; original geometry retained.');}
 function outside(p:number[]){let worst=0;for(const source of sources){const uv=project(source.view,p,result.objectHeight),pixels=signedContourDistance(uv as [number,number],source.segments),worldPerPixel=(source.view.projectionSpan??result.objectHeight)*source.view.alignment.scale/source.view.bounds.height;worst=Math.max(worst,pixels*worldPerPixel);}if(result.options.viewMode==='two')worst=Math.max(worst,Math.abs(p[2])-result.objectHeight*result.options.depthRatio/2);return worst;}
 // Reprojection guard includes vertices, triangle centers and edge midpoints.
 let factors=new Float32Array(base.length).fill(1),valid=false;for(let pass=0;pass<10;pass++){const bad=new Set<number>();for(let i=0;i<triangles.length;i++){const f=triangles[i],q=quads[Math.floor(i/2)],a=positions[f[0]],b=positions[f[1]],c=positions[f[2]],normal=cross(sub(b,a),sub(c,a)),length=Math.sqrt(dot(normal,normal));if(length<h*h*1e-5||normal[q.axis]*q.sign<length*.02||Math.min(...[sub(b,a),sub(c,b),sub(a,c)].map(x=>dot(x,x)))<h*h*1e-4){for(const id of f)bad.add(id);continue;}
  const samples=[[1,0,0],[0,1,0],[0,0,1],[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]];for(const w of samples){const p=[0,1,2].map(d=>w[0]*a[d]+w[1]*b[d]+w[2]*c[d]),old=[0,1,2].map(d=>w.reduce((s,v,j)=>s+v*base[f[j]][d],0)),error=outside(p);if(error>Math.max(h*.35,outside(old))+h*.04){for(const id of f)bad.add(id);break;}}}
  if(!bad.size){valid=true;break;}for(const id of bad){factors[id]*=.5;positions[id]=base[id].map((a,d)=>a+(target[id][d]-a)*factors[id]);}stats.repairedVertices+=bad.size;
 }
 if(!valid)return fallback('Surface displacement failed the orientation/silhouette checks; original geometry retained.');
 progress(.85);stats.vertices=base.length;stats.applied=true;
 for(let i=0;i<base.length;i++){stats.maxShiftVoxels=Math.max(stats.maxShiftVoxels,...positions[i].map((x,d)=>Math.abs(x-base[i][d])/h));stats.maxSilhouetteErrorVoxels=Math.max(stats.maxSilhouetteErrorVoxels,outside(positions[i])/h);}
 const faceNormals=triangles.map(f=>unit(cross(sub(positions[f[1]],positions[f[0]]),sub(positions[f[2]],positions[f[0]])))),incident=base.map(()=>[] as number[]);triangles.forEach((f,i)=>f.forEach(id=>incident[id].push(i)));
 const output:number[]=[],normals:number[]=[],colors:number[]=[],featureTags:number[]=[],indices:number[]=[],min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 triangles.forEach((f,fi)=>{const material=quads[Math.floor(fi/2)].material;for(const id of f){indices.push(output.length/3);const normal=unit(incident[id].filter(j=>dot(faceNormals[j],faceNormals[fi])>=cosine).reduce((sum,j)=>sum.map((v,d)=>v+faceNormals[j][d]),[0,0,0]));for(let d=0;d<3;d++){output.push(positions[id][d]);normals.push(normal[d]);colors.push(result.voxels.palette[material][d]/255);min[d]=Math.min(min[d],positions[id][d]);max[d]=Math.max(max[d],positions[id][d]);}featureTags.push(tags[id]);}});
 progress(1);return {positions:new Float32Array(output),normals:new Float32Array(normals),colors:new Float32Array(colors),uvs:new Float32Array(output.length/3*2),indices:new Uint32Array(indices),boundingBox:{min,max},meshMode:'shape-preserving',stats:{visibleFaces:quads.length,quads:quads.length,triangles:triangles.length},featureTags:new Uint8Array(featureTags),smoothingStats:stats};
}
