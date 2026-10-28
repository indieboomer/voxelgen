export type Family = 'boulder' | 'layered' | 'shard';
export type Op = { kind: 'mass'|'cut'|'chip'|'layer'|'noise'; x:number; y:number; z:number; size:number };
export type Recipe = { version:1; family:Family; elongation:number; erosion:number; hue:number; operations:Op[] };
export type Voxels = { version:1; resolution:number; cells:Uint8Array; palette:number[][]; provenance?:string };
export function rng(seed:number){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
export function validate(r:Recipe){if(r.version!==1||!['boulder','layered','shard'].includes(r.family)||!Number.isFinite(r.elongation)||r.elongation<.6||r.elongation>1.5||!Number.isFinite(r.erosion)||r.erosion<0||r.erosion>1||!Number.isFinite(r.hue)||r.hue<0||r.hue>1||!Array.isArray(r.operations)||r.operations.length<1||r.operations.length>12)throw Error('Invalid recipe');for(const o of r.operations)if(!['mass','cut','chip','layer','noise'].includes(o.kind)||![o.x,o.y,o.z,o.size].every(Number.isFinite)||Math.max(Math.abs(o.x),Math.abs(o.y),Math.abs(o.z))>1||o.size<.05||o.size>1)throw Error('Invalid operation');return r;}
export function baseRecipe(family:Family):Recipe{return {version:1,family,elongation:1,erosion:.25,hue:.45,operations:[{kind:'mass',x:0,y:0,z:0,size:.72},{kind:family==='boulder'?'chip':family==='layered'?'layer':'cut',x:.5,y:.4,z:.3,size:.35}]};}
export function sampleVoxels(recipe:Recipe,seed:number,resolution=28):Voxels{
 validate(recipe);if(!Number.isInteger(resolution)||resolution<12||resolution>48)throw Error('Resolution must be 12–48');
 const rand=rng(seed), sx=.86+rand()*.25,sy=.85+rand()*.3,sz=.85+rand()*.3, angle=(rand()-.5)*.7, shift=rand()*8;
 const ops=recipe.operations.map(o=>({...o,x:o.x+(rand()-.5)*.24,y:o.y+(rand()-.5)*.2,z:o.z+(rand()-.5)*.24,size:o.size*(.84+rand()*.3)}));
 const n=resolution,cells=new Uint8Array(n*n*n);let shade=80+recipe.hue*65;
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
 let px=((x+.5)/n*2-1)/sx,py=((y+.5)/n*2-1)/sy,pz=((z+.5)/n*2-1)/sz;
 const xx=px*Math.cos(angle)-pz*Math.sin(angle);pz=px*Math.sin(angle)+pz*Math.cos(angle);px=xx/recipe.elongation;
 if(recipe.family==='layered')py/=.43;if(recipe.family==='shard'){px/=.68;py/=1.12;}
 let d=10;
 for(const o of ops){const dx=px-o.x,dy=py-o.y,dz=pz-o.z;
 if(o.kind==='mass')d=Math.min(d,Math.sqrt(dx*dx+dy*dy+dz*dz)-o.size);
 if(o.kind==='cut'){const len=Math.hypot(o.x,o.y,o.z)||1;d=Math.max(d,(px*o.x+py*o.y+pz*o.z)/len-o.size);}
 if(o.kind==='chip')d=Math.max(d,o.size-Math.hypot(dx,dy,dz));
 if(o.kind==='layer')d+=Math.sin((py+px*.25)*18+shift)*o.size*.12;
 if(o.kind==='noise')d+=Math.sin(px*17+shift)*Math.sin(py*13-shift)*Math.cos(pz*19)*o.size*.08;
 }
 d+=recipe.erosion*.025*Math.sin(px*29+shift)*Math.cos(pz*23+py*11);
 if(d<0)cells[x+n*(y+n*z)]=1+((Math.floor((py+1)*9)+Math.floor(px*3)+30)%3);
 }
 // Keep the largest six-connected component; isolated voxel chips are not game geometry.
 const seen=new Uint8Array(cells.length);let largest:number[]=[];
 for(let i=0;i<cells.length;i++){if(!cells[i]||seen[i])continue;const queue=[i];seen[i]=1;for(let j=0;j<queue.length;j++){const t=queue[j],a=t%n,b=Math.floor(t/n)%n,c=Math.floor(t/n/n);for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const x=a+dx,y=b+dy,z=c+dz,u=x+n*(y+n*z);if(x>=0&&y>=0&&z>=0&&x<n&&y<n&&z<n&&cells[u]&&!seen[u]){seen[u]=1;queue.push(u);}}}if(queue.length>largest.length)largest=queue;}
 const kept=new Uint8Array(cells.length);for(const i of largest)kept[i]=cells[i];cells.set(kept);
 return {version:1,resolution:n,cells,palette:[[0,0,0],[shade,shade*.99,shade*.91],[shade+12,shade+10,shade+3],[shade-10,shade-9,shade-13]]};
}
export function meshVoxels(v:Voxels,scale=1){if(!Number.isFinite(scale)||scale<=0)throw Error('Invalid scale');const n=v.resolution,p:number[]=[],c:number[]=[],norm:number[]=[],idx:number[]=[];const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 const dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
 const corners=[[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],[[0,0,1],[0,1,1],[0,1,0],[0,0,0]],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],[[1,0,1],[1,1,1],[0,1,1],[0,0,1]],[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]];
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){const value=v.cells[x+n*(y+n*z)];if(!value)continue;for(let f=0;f<6;f++){const [dx,dy,dz]=dirs[f],a=x+dx,b=y+dy,e=z+dz;if(a>=0&&a<n&&b>=0&&b<n&&e>=0&&e<n&&v.cells[a+n*(b+n*e)])continue;const start=p.length/3;for(const q of corners[f]){const pos=[x+q[0],y+q[1],z+q[2]].map(t=>(t/n-.5)*scale);p.push(...pos);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],pos[k]);hi[k]=Math.max(hi[k],pos[k]);}c.push(...v.palette[value].map(t=>t/255));norm.push(dx,dy,dz);}idx.push(start,start+1,start+2,start,start+2,start+3);}}
 return {positions:new Float32Array(p),normals:new Float32Array(norm),colors:new Float32Array(c),indices:new Uint32Array(idx),boundingBox:{min:lo,max:hi}};
}
export function generateRock({recipe,seed,resolution=28,scale=1}:{recipe:Recipe;seed:number;resolution?:number;scale?:number}){const voxels=sampleVoxels(recipe,seed,resolution);return {...meshVoxels(voxels,scale),voxels};}
export function parseVoxels(raw:unknown):Voxels {const v=raw as any;if(v.version!==1||!Number.isInteger(v.resolution)||v.resolution<12||v.resolution>48||!Array.isArray(v.cells)||v.cells.length!==v.resolution**3||!Array.isArray(v.palette)||v.palette.length>256||!v.palette.every((c:any)=>Array.isArray(c)&&c.length===3&&c.every((x:any)=>Number.isFinite(x)&&x>=0&&x<=255))||!v.cells.every((x:any)=>Number.isInteger(x)&&x>=0&&x<v.palette.length))throw Error('Invalid voxel JSON');return {...v,cells:new Uint8Array(v.cells)};}
