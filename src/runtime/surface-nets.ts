import type {Voxels} from './index.js';
/** Binary Surface Nets, two bounded Jacobi relaxation passes, faceted triangle output. */
type SurfaceMesh={positions:Float32Array;normals:Float32Array;colors:Float32Array;uvs:Float32Array;indices:Uint32Array;boundingBox:{min:number[];max:number[]};meshMode:'smooth'|'smooth-coarse';stats:{visibleFaces:number;quads:number;triangles:number;extractionResolution:number;smoothingIterations:number;ambiguityRepairs:number;coarseFallback?:boolean}};
export function meshSurfaceNets(v:Voxels,scale:number,coarse=false):SurfaceMesh{
 const original=v.resolution,n=coarse?Math.ceil(original/2):original,side=n+2,grid=new Uint8Array(side**3);
 // Majority material and >=25% occupancy for coarse cells; retain thin plates better than point sampling.
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const counts=new Uint16Array(v.palette.length);let total=0,occupied=0;
  for(let c=Math.floor(z*original/n);c<Math.floor((z+1)*original/n);c++)for(let b=Math.floor(y*original/n);b<Math.floor((y+1)*original/n);b++)for(let a=Math.floor(x*original/n);a<Math.floor((x+1)*original/n);a++){const value=v.cells[a+original*(b+original*c)];total++;if(value){occupied++;counts[value]++;}}
  if(occupied&&occupied/total>=.25){let material=1;for(let i=2;i<counts.length;i++)if(counts[i]>counts[material])material=i;grid[(x+1)+side*((y+1)+side*(z+1))]=material;}
 }
 if(coarse&&!grid.some(Boolean)&&v.cells.some(Boolean)){const full=meshSurfaceNets(v,scale,false);return {...full,meshMode:'smooth-coarse',stats:{...full.stats,coarseFallback:true}};}
 // Resolve alternating binary faces before dual extraction. A deterministic local fill
 // prevents four quads sharing a non-manifold edge; the source voxel grid stays untouched.
 const stride=[1,side,side*side];let ambiguityRepairs=0,changed=true;
 while(changed){changed=false;for(let d=0;d<3;d++){const u=(d+1)%3,w=(d+2)%3;for(let k=0;k<side;k++)for(let j=0;j<side-1;j++)for(let i=0;i<side-1;i++){
  const p=[0,0,0];p[d]=k;p[u]=i;p[w]=j;const a=p[0]+side*(p[1]+side*p[2]),b=a+stride[u],c=b+stride[w],e=a+stride[w];
  if(!!grid[a]===!!grid[c]&&!!grid[b]===!!grid[e]&&!!grid[a]!==!!grid[b]){grid[grid[a]?b:a]=grid[a]||grid[b];ambiguityRepairs++;changed=true;}
 }}}
 const at=(x:number,y:number,z:number)=>grid[x+side*(y+side*z)],cells=n+1,ids=new Int32Array(cells**3).fill(-1),points:number[][]=[],origins:number[][]=[];
 const idAt=(p:number[])=>ids[p[0]+cells*(p[1]+cells*p[2])];
 for(let z=0;z<cells;z++)for(let y=0;y<cells;y++)for(let x=0;x<cells;x++){
  const values=Array.from({length:8},(_,i)=>!!at(x+(i&1),y+((i>>1)&1),z+((i>>2)&1)));if(values.every(Boolean)||values.every(a=>!a))continue;
  const sum=[0,0,0];let count=0;
  for(let d=0;d<3;d++)for(let i=0;i<8;i++){if(i&(1<<d))continue;const j=i|(1<<d);if(values[i]===values[j])continue;for(let k=0;k<3;k++)sum[k]+=(((i>>k)&1)+((j>>k)&1))*.5;count++;}
  ids[x+cells*(y+cells*z)]=points.length;points.push([x+sum[0]/count,y+sum[1]/count,z+sum[2]/count]);origins.push([x,y,z]);
 }
 const quads:{vertices:number[];material:number;axis:number}[]=[],neighbors:number[][]=points.map(()=>[]);
 for(let axis=0;axis<3;axis++){const u=(axis+1)%3,w=(axis+2)%3;for(let k=0;k<=n;k++)for(let j=1;j<=n;j++)for(let i=1;i<=n;i++){
  const p=[0,0,0];p[axis]=k;p[u]=i;p[w]=j;const a=at(p[0],p[1],p[2]);p[axis]++;const b=at(p[0],p[1],p[2]);p[axis]--;if(!!a===!!b)continue;
  const q=[p.slice(),p.slice(),p.slice(),p.slice()];q[0][u]--;q[0][w]--;q[1][w]--;q[3][u]--;const order=a?[0,1,2,3]:[0,3,2,1],vertices=order.map(t=>idAt(q[t]));if(vertices.some(id=>id<0))throw Error('Incomplete surface net');
  quads.push({vertices,material:a||b,axis});for(let t=0;t<4;t++){const x=vertices[t],y=vertices[(t+1)%4];if(!neighbors[x].includes(y))neighbors[x].push(y);if(!neighbors[y].includes(x))neighbors[y].push(x);}
 }}
 let relaxed=points;
 for(let pass=0;pass<2;pass++){const next=relaxed.map(p=>p.slice());for(let i=0;i<points.length;i++){const linked=neighbors[i];if(!linked.length)continue;for(let d=0;d<3;d++){let sum=0;for(const j of linked)sum+=relaxed[j][d];const value=relaxed[i][d]+.35*(sum/linked.length-relaxed[i][d]);next[i][d]=Math.max(origins[i][d]+.05,Math.min(origins[i][d]+.95,value));}}relaxed=next;}
 const positions:number[]=[],normals:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[],min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const quad of quads)for(const triangle of [[0,1,2],[0,2,3]]){
  const coords=triangle.map(i=>relaxed[quad.vertices[i]].map(t=>((t-.5)/n-.5)*scale));const ab=coords[1].map((t,d)=>t-coords[0][d]),ac=coords[2].map((t,d)=>t-coords[0][d]),normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],length=Math.sqrt(normal[0]**2+normal[1]**2+normal[2]**2);if(length<1e-12)throw Error('Degenerate surface triangle');
  for(const p of coords){indices.push(positions.length/3);for(let d=0;d<3;d++){positions.push(p[d]);normals.push(normal[d]/length);colors.push(v.palette[quad.material][d]/255);min[d]=Math.min(min[d],p[d]);max[d]=Math.max(max[d],p[d]);}uvs.push(p[quad.axis===0?2:0]/scale+.5,p[quad.axis===1?2:1]/scale+.5);}
 }
 let visibleFaces=0;for(let z=0;z<original;z++)for(let y=0;y<original;y++)for(let x=0;x<original;x++){if(!v.cells[x+original*(y+original*z)])continue;for(const d of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const a=x+d[0],b=y+d[1],c=z+d[2];if(a<0||b<0||c<0||a>=original||b>=original||c>=original||!v.cells[a+original*(b+original*c)])visibleFaces++;}}
 return {positions:new Float32Array(positions),normals:new Float32Array(normals),colors:new Float32Array(colors),uvs:new Float32Array(uvs),indices:new Uint32Array(indices),boundingBox:{min,max},meshMode:coarse?'smooth-coarse' as const:'smooth' as const,stats:{visibleFaces,quads:quads.length,triangles:indices.length/3,extractionResolution:n,smoothingIterations:2,ambiguityRepairs}};
}
