import {styleTexture,flatBakedColors,type TextureStyle} from './texture-style.js';
export {styleTexture,textureStyles,type TextureStyle} from './texture-style.js';
import {meshSuperLow} from './superlow.js';
import {meshSurfaceNets} from './surface-nets.js';
import {meshGreedy} from './greedy.js';
export type MeshMode='voxel'|'lowpoly'|'smooth'|'smooth-coarse'|'superlow';
export type Family = 'boulder' | 'layered' | 'shard' | 'tree' | 'bush';
export type OpKind = 'mass'|'cut'|'chip'|'layer'|'noise'|'block'|'strata'|'wedge'|'fracture'|'trunk'|'branch'|'foliage';
export type Op = {kind:OpKind;x:number;y:number;z:number;size:number;stretch?:[number,number,number];angle?:number;end?:[number,number,number]};
export type Recipe = {version:1|2|3;family:Family;elongation:number;erosion:number;hue:number;operations:Op[]};
export type Voxels = {version:1;resolution:number;cells:Uint8Array;palette:number[][];provenance?:string;material?:{family:Family;seed:number};discardedFraction?:number};
export const generatorVersion=3;
export function rng(seed:number){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
export function validate(r:Recipe){
 if(!r||![1,2,3].includes(r.version)||!['boulder','layered','shard','tree','bush'].includes(r.family)||['tree','bush'].includes(r.family)&&r.version!==3||!Number.isFinite(r.elongation)||r.elongation<.6||r.elongation>1.5||!Number.isFinite(r.erosion)||r.erosion<0||r.erosion>1||!Number.isFinite(r.hue)||r.hue<0||r.hue>1||!Array.isArray(r.operations)||r.operations.length<1||r.operations.length>12)throw Error('Invalid recipe');
 const kinds=r.version===3?['mass','cut','chip','layer','noise','block','strata','wedge','fracture','trunk','branch','foliage']:r.version===1?['mass','cut','chip','layer','noise']:['mass','cut','chip','layer','noise','block','strata','wedge','fracture'];
 for(const o of r.operations)if(!kinds.includes(o.kind)||![o.x,o.y,o.z,o.size].every(Number.isFinite)||Math.max(Math.abs(o.x),Math.abs(o.y),Math.abs(o.z))>1||o.size<.05||o.size>1||o.angle!==undefined&&(!Number.isFinite(o.angle)||Math.abs(o.angle)>Math.PI)||o.stretch!==undefined&&(!Array.isArray(o.stretch)||o.stretch.length!==3||!o.stretch.every(v=>Number.isFinite(v)&&v>=.08&&v<=2)))throw Error('Invalid operation');
 for(const o of r.operations)if(o.end!==undefined&&(!Array.isArray(o.end)||o.end.length!==3||!o.end.every(x=>Number.isFinite(x)&&Math.abs(x)<=1))||o.kind==='branch'&&!o.end)throw Error('Invalid branch endpoint');
 return r;
}
const block=(x:number,y:number,z:number,size:number,stretch:[number,number,number],angle:number)=>{
 const a=Math.abs((x*Math.cos(angle)-z*Math.sin(angle))/(size*stretch[0]));
 const b=Math.abs(y/(size*stretch[1])),c=Math.abs((x*Math.sin(angle)+z*Math.cos(angle))/(size*stretch[2]));
 return (Math.max(a,b,c,(a+b+c)/2.4,(a+b)/1.8,(a+c)/1.8,(b+c)/1.8)-1)*size;
};
export function baseRecipe(family:Family):Recipe{
 const shape=(kind:OpKind,x:number,y:number,z:number,size:number,stretch:[number,number,number],angle=0):Op=>({kind,x,y,z,size,stretch,angle});
 if(family==='tree'||family==='bush'){
 const branch=(x:number,y:number,z:number,end:[number,number,number],size=.13):Op=>({kind:'branch',x,y,z,size,end});
 const operations:Op[]=family==='tree'?[
 shape('trunk',0,-.25,0,.6,[.24,1,.24]),branch(0,-.1,0,[-.35,.35,.02]),branch(0,.02,0,[.36,.38,.06]),branch(0,.1,0,[.02,.42,-.25]),
 shape('foliage',-.28,.39,.02,.43,[1.05,.9,1]),shape('foliage',.3,.43,.02,.43,[1,.85,.95]),shape('foliage',.02,.58,-.17,.4,[1,1,1])]:[
 shape('trunk',0,-.58,0,.25,[.5,1,.5]),branch(0,-.6,0,[-.38,-.24,.04],.12),branch(0,-.6,0,[.36,-.23,.04],.12),
 shape('foliage',0,-.18,0,.44,[1.1,1,1]),shape('foliage',-.36,-.29,.07,.35,[1.05,.85,1]),shape('foliage',.36,-.25,.02,.35,[1.05,.9,1]),shape('foliage',.05,-.27,-.32,.35,[1.1,.9,1])];
 return {version:3,family,elongation:1,erosion:.1,hue:.45,operations};
 }
 const operations:Op[]=family==='boulder'?[
 shape('block',-.08,-.06,0,.52,[1,1,.9],.15),shape('block',.34,-.2,.09,.34,[1,.92,1.1],-.14),
 shape('block',-.4,-.24,-.1,.3,[1,.92,1.1],.24),shape('block',-.14,.34,-.09,.3,[1,.65,1],-.1),
 {kind:'fracture',x:.09,y:.12,z:.04,size:.1}]:family==='layered'?[
 shape('strata',0,-.06,0,.7,[1,.64,.72],.04),{kind:'chip',x:.59,y:.02,z:.38,size:.17},
 {kind:'fracture',x:-.32,y:.08,z:.2,size:.1}]:[
 shape('wedge',-.33,-.02,0,.62,[.33,1,.5],-.14),shape('wedge',-.11,-.14,.03,.5,[.38,1,.55],-.12),
 shape('wedge',.11,-.26,.04,.37,[.5,1,.68],-.11),shape('block',.09,-.54,0,.5,[1,.2,.8],-.1),
 {kind:'fracture',x:-.09,y:.1,z:.12,size:.08}];
 return {version:2,family,elongation:1,erosion:.2,hue:.45,operations};
}
export function sampleVoxels(recipe:Recipe,seed:number,resolution=28):Voxels{
 validate(recipe);if(!Number.isInteger(resolution)||resolution<12||resolution>48)throw Error('Resolution must be 12-48');
 const legacy=recipe.version===1,rand=rng(seed),sx=legacy?.86+rand()*.25:.94+rand()*.12,sy=legacy?.85+rand()*.3:.91+rand()*.18,sz=legacy?.85+rand()*.3:.94+rand()*.12,angle=(rand()-.5)*(legacy?.7:.18),shift=rand()*8;
 const ops=recipe.operations.map(o=>({...o,x:o.x+(rand()-.5)*(legacy?.24:.055),y:o.y+(rand()-.5)*(legacy?.2:.04),z:o.z+(rand()-.5)*(legacy?.24:.055),size:o.size*(legacy?.84+rand()*.3:.96+rand()*.08)}));
 const n=resolution,cells=new Uint8Array(n**3),shade=80+recipe.hue*65;
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
 let px=((x+.5)/n*2-1)/sx,py=((y+.5)/n*2-1)/sy,pz=((z+.5)/n*2-1)/sz;
 const xx=px*Math.cos(angle)-pz*Math.sin(angle);pz=px*Math.sin(angle)+pz*Math.cos(angle);px=xx/recipe.elongation;
 if(legacy){if(recipe.family==='layered')py/=.43;if(recipe.family==='shard'){px/=.68;py/=1.12;}}
 let d=10,plantMaterial=2;
 for(const o of ops){const dx=px-o.x,dy=py-o.y,dz=pz-o.z,stretch=o.stretch??[1,1,1],rotation=o.angle??0;
 const previous=d;
 if(o.kind==='mass')d=Math.min(d,Math.sqrt(dx*dx+dy*dy+dz*dz)-o.size);
 if(o.kind==='cut'){const len=Math.hypot(o.x,o.y,o.z)||1;d=Math.max(d,(px*o.x+py*o.y+pz*o.z)/len-o.size);}
 if(o.kind==='chip')d=Math.max(d,o.size-Math.hypot(dx,dy,dz));
 if(o.kind==='layer')d+=Math.sin((py+px*.25)*18+shift)*o.size*.12;
 if(o.kind==='noise')d+=Math.sin(px*17+shift)*Math.sin(py*13-shift)*Math.cos(pz*19)*o.size*.08;
 if(o.kind==='block')d=Math.min(d,block(dx,dy,dz,o.size,stretch,rotation));
 if(o.kind==='wedge'){const q=block(dx,dy,dz,o.size,stretch,rotation);d=Math.min(d,Math.max(q,dx*.85+dy-o.size*stretch[1]+.05));}
 if(o.kind==='strata')for(let j=0;j<5;j++){
 const level=(j-2)*o.size*stretch[1]*.36,offset=Math.sin(j*2.3+shift*.18)*o.size*.14;
 const s=o.size*(1-j*.055),thickness=o.size*stretch[1]*.22;
 d=Math.min(d,block(dx-offset,dy-dx*rotation-level,dz-Math.cos(j*1.7+shift*.12)*.035,s,[stretch[0],thickness/s,stretch[2]],rotation));
 }
 if(o.kind==='trunk')d=Math.min(d,Math.max(Math.hypot(dx,dz)-o.size*stretch[0]*(1-.2*dy/(o.size*stretch[1])),Math.abs(dy)-o.size*stretch[1]));
 if(o.kind==='foliage')d=Math.min(d,Math.sqrt((dx/stretch[0])**2+(dy/stretch[1])**2+(dz/stretch[2])**2)-o.size+Math.sin(px*17+shift)*Math.cos(py*13-pz*11)*o.size*.06);
 if(o.kind==='branch'){const e=o.end!,vx=e[0]-o.x,vy=e[1]-o.y,vz=e[2]-o.z,t=Math.max(0,Math.min(1,(dx*vx+dy*vy+dz*vz)/(vx*vx+vy*vy+vz*vz||1)));d=Math.min(d,Math.hypot(dx-t*vx,dy-t*vy,dz-t*vz)-o.size);}
 if(recipe.version===3&&d<previous&&o.kind!=='noise'&&o.kind!=='layer')plantMaterial=o.kind==='trunk'||o.kind==='branch'?1:2;
 if(o.kind==='fracture'&&py>o.y&&pz>o.z)d=Math.max(d,o.size*.26-Math.abs(dx-(py-o.y)*.12));
 }
 d+=recipe.erosion*.025*Math.sin(px*29+shift)*Math.cos(pz*23+py*11);
 if(d<0){if(recipe.family==='tree'||recipe.family==='bush'){const detail=Math.sin(px*13+pz*11+shift)*Math.cos(py*17-px*7);cells[x+n*(y+n*z)]=plantMaterial===1?1:detail<-.3?2:detail>.45?4:3;}else if(legacy)cells[x+n*(y+n*z)]=1+((Math.floor((py+1)*9)+Math.floor(px*3)+30)%3);else{
 const vein=Math.sin(px*11+py*6+pz*4+shift*.15)+.24*Math.sin(pz*21-py*7),band=recipe.family==='layered'?Math.sin((py-px*.04)*43):Math.sin(px*9+pz*7)*Math.cos(py*8-px*3);
 cells[x+n*(y+n*z)]=Math.abs(vein)<.12?4:band>.45?2:band<-.4?3:1;}}
 }
 const rawCount=cells.reduce((a,b)=>a+(b?1:0),0),seen=new Uint8Array(cells.length);let largest:number[]=[];
 for(let i=0;i<cells.length;i++){if(!cells[i]||seen[i])continue;const queue=[i];seen[i]=1;for(let j=0;j<queue.length;j++){const t=queue[j],a=t%n,b=Math.floor(t/n)%n,c=Math.floor(t/n/n);for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const x=a+dx,y=b+dy,z=c+dz,u=x+n*(y+n*z);if(x>=0&&y>=0&&z>=0&&x<n&&y<n&&z<n&&cells[u]&&!seen[u]){seen[u]=1;queue.push(u);}}}if(queue.length>largest.length)largest=queue;}
 const kept=new Uint8Array(cells.length);for(const i of largest)kept[i]=cells[i];cells.set(kept);
 const palette=recipe.family==='tree'?[[0,0,0],[112,73,40],[38,76,32],[63,112,41],[99,142,54]]:recipe.family==='bush'?[[0,0,0],[105,70,38],[37,77,37],[63,116,50],[110,148,66]]:legacy?[[0,0,0],[shade,shade*.99,shade*.91],[shade+12,shade+10,shade+3],[shade-10,shade-9,shade-13]]:recipe.family==='shard'?[[0,0,0],[80,88,99],[92,101,113],[70,77,88],[116,139,153]]:recipe.family==='layered'?[[0,0,0],[119,114,104],[133,127,115],[105,102,96],[156,119,76]]:[[0,0,0],[133,130,119],[145,141,130],[118,117,109],[170,128,73]];
 return {version:1,resolution:n,cells,palette,material:{family:recipe.family,seed:seed>>>0},discardedFraction:rawCount?1-largest.length/rawCount:0};
}
// Portable integer-hashed stone texture. No canvas, images, network, or renderer dependency.
export function stoneTexture(family:Family,seed=0,size=128){
 if(!Number.isInteger(size)||size<16||size>512)throw Error('Texture size must be 16-512');
 const pixels=new Uint8Array(size*size*4);
 const hash=(x:number,y:number)=>{let h=Math.imul(x+seed,374761393)^Math.imul(y,668265263);h=Math.imul(h^(h>>>13),1274126177);return (h^(h>>>16))>>>0;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const grain=hash(x,y)%45,patch=hash(x>>3,y>>3)%30,vein=(x*3+y+(hash(y>>3,7)%13))%47;
 const vegetation=family==='tree'||family==='bush',dark=vein<2?(vegetation?12:38):0,base=vegetation?202+grain%32-patch%18-dark:183+grain-patch-dark,i=(x+size*y)*4;
 pixels[i]=base;pixels[i+1]=base-(family==='layered'&&vein<4?13:0);pixels[i+2]=base-(family==='boulder'&&vein<4?20:0);pixels[i+3]=255;
 }return {width:size,height:size,pixels};
}
function meshVoxelsRaw(v:Voxels,scale=1,meshMode:MeshMode='voxel',textureStyle:TextureStyle='natural'){
 if(!Number.isFinite(scale)||scale<=0)throw Error('Invalid scale');if(meshMode==='superlow')return meshSuperLow(v,scale,styleTexture(stoneTexture(v.material?.family??'boulder',v.material?.seed??0),textureStyle,v.material?.seed??0));if(meshMode==='smooth'||meshMode==='smooth-coarse')return meshSurfaceNets(v,scale,meshMode==='smooth-coarse');if(meshMode==='lowpoly')return meshGreedy(v,scale);if(meshMode!=='voxel')throw Error('Invalid mesh mode');const n=v.resolution,p:number[]=[],c:number[]=[],norm:number[]=[],idx:number[]=[],uv:number[]=[];const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 const dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
 const corners=[[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],[[0,0,1],[0,1,1],[0,1,0],[0,0,0]],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],[[1,0,1],[1,1,1],[0,1,1],[0,0,1]],[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]];
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){const value=v.cells[x+n*(y+n*z)];if(!value)continue;for(let f=0;f<6;f++){const [dx,dy,dz]=dirs[f],a=x+dx,b=y+dy,e=z+dz;if(a>=0&&a<n&&b>=0&&b<n&&e>=0&&e<n&&v.cells[a+n*(b+n*e)])continue;const start=p.length/3;for(const q of corners[f]){const coord=[x+q[0],y+q[1],z+q[2]],pos=coord.map(t=>(t/n-.5)*scale);p.push(...pos);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],pos[k]);hi[k]=Math.max(hi[k],pos[k]);}c.push(...v.palette[value].map(t=>t/255));norm.push(dx,dy,dz);uv.push(coord[f<2?2:0]/n,coord[f<2?1:f<4?2:1]/n);}idx.push(start,start+1,start+2,start,start+2,start+3);}}
 return {positions:new Float32Array(p),normals:new Float32Array(norm),colors:new Float32Array(c),uvs:new Float32Array(uv),indices:new Uint32Array(idx),boundingBox:{min:lo,max:hi},meshMode:'voxel' as const,stats:{visibleFaces:idx.length/6,quads:idx.length/6,triangles:idx.length/3}};
}
export function meshVoxels(v:Voxels,scale=1,meshMode:MeshMode='voxel',textureStyle:TextureStyle='natural'){
 const geometry=meshVoxelsRaw(v,scale,meshMode,textureStyle);if(textureStyle==='natural')return geometry;
 const detail=styleTexture(stoneTexture(v.material?.family??'boulder',v.material?.seed??0),textureStyle,v.material?.seed??0),baked='texture' in geometry;
 return {...geometry,colors:textureStyle==='flat'&&baked?flatBakedColors(geometry,geometry.texture):geometry.colors,texture:textureStyle==='flat'?detail:baked?geometry.texture:detail,textureStyle};
}
export function generateRock({recipe,seed,resolution=28,scale=1,meshMode='voxel',textureStyle='natural'}:{recipe:Recipe;seed:number;resolution?:number;scale?:number;meshMode?:MeshMode;textureStyle?:TextureStyle}){const voxels=sampleVoxels(recipe,seed,resolution);const geometry=meshVoxels(voxels,scale,meshMode,textureStyle);return {...geometry,texture:'texture' in geometry?geometry.texture:stoneTexture(recipe.family,seed>>>0),voxels};}
export function parseVoxels(raw:unknown):Voxels {
 const v=raw as any;if(!v||v.version!==1||!Number.isInteger(v.resolution)||v.resolution<12||v.resolution>96||!Array.isArray(v.cells)||v.cells.length!==v.resolution**3||!Array.isArray(v.palette)||v.palette.length<1||v.palette.length>256||!v.palette.every((c:any)=>Array.isArray(c)&&c.length===3&&c.every((x:any)=>Number.isFinite(x)&&x>=0&&x<=255))||!v.cells.every((x:any)=>Number.isInteger(x)&&x>=0&&x<v.palette.length))throw Error('Invalid voxel JSON');
 if(v.material&&(!['boulder','layered','shard','tree','bush'].includes(v.material.family)||!Number.isInteger(v.material.seed)||v.material.seed<0||v.material.seed>4294967295))throw Error('Invalid material');return {...v,cells:new Uint8Array(v.cells)};
}
