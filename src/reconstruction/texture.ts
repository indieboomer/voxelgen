import {smoothSurface,type SurfaceGeometry} from './smoothing.js';
﻿import {meshVoxels} from '../runtime/index.js';
import {imageColor,project} from './core.js';
import {sourceColorGrid,type SourceColorGrid} from './source-colors.js';
import type {Direction,PreparedView,ReconstructionResult} from './types.js';
type Mesh=SurfaceGeometry;
function faceView(result:ReconstructionResult,normal:ArrayLike<number>,center:number[]){
 const lookup=new Map(result.views.map(v=>[v.direction,v])),desired:Direction=normal[2]>.5?'front':normal[2]<-.5?'back':normal[0]>.5?'right':normal[0]<-.5?'left':normal[1]>.5?'top':'bottom',fallback:Direction=Math.abs(center[0])>Math.abs(center[2])?(center[0]>0?'right':'left'):(center[2]>=0?'front':'back');
 return lookup.get(desired)??lookup.get(fallback)??lookup.get(center[2]>=0?'front':'back')!;
}
/** Pack averaged source views once. Every face projects into these whole-view
 * patches, so neither color blocks nor UVs restart at voxel/greedy boundaries. */
function sourceAtlas(mesh:Mesh,result:ReconstructionResult,progress:(p:number)=>void){
 const resolution=result.options.textureResolution??16,style=result.options.textureStyle as 'minecraft'|'valheim';
 type Patch={view:PreparedView;grid:SourceColorGrid;min:number[];max:number[];x:number;y:number;width:number;height:number};
 const patches=new Map<Direction,Patch>(),facePatches:Patch[]=[],coordinates:number[][]=[];
 const verticesPerFace=mesh.meshMode==='shape-preserving'?3:4,faces=mesh.positions.length/3/verticesPerFace;
 for(let i=0;i<faces;i++){
  const base=i*verticesPerFace,center=[0,1,2].map(d=>{let value=0;for(let j=0;j<verticesPerFace;j++)value+=mesh.positions[(base+j)*3+d]/verticesPerFace;return value;}),normal=[0,1,2].map(d=>{let value=0;for(let j=0;j<verticesPerFace;j++)value+=mesh.normals[(base+j)*3+d];return value;}),view=faceView(result,normal.map(x=>x/(Math.hypot(...normal)||1)),center);
  let patch=patches.get(view.direction);if(!patch){const grid=sourceColorGrid(view,resolution);patch={view,grid,min:[0,0],max:[grid.width,grid.height],x:0,y:0,width:0,height:0};patches.set(view.direction,patch);}facePatches.push(patch);
  for(let j=0;j<verticesPerFace;j++){const p=Array.from(mesh.positions.subarray((base+j)*3,(base+j+1)*3)),uv=project(view,p,result.objectHeight),q=[(uv[0]-patch.grid.originX)/patch.grid.step,(uv[1]-patch.grid.originY)/patch.grid.step];coordinates.push(q);for(let d=0;d<2;d++){patch.min[d]=Math.min(patch.min[d],q[d]);patch.max[d]=Math.max(patch.max[d],q[d]);}}
 }
 const entries=[...patches.values()];let cellWidth=1,cellHeight=1;
 for(const patch of entries){patch.min=patch.min.map(x=>Math.floor(x)-2);patch.max=patch.max.map(x=>Math.ceil(x)+2);patch.width=patch.max[0]-patch.min[0];patch.height=patch.max[1]-patch.min[1];cellWidth=Math.max(cellWidth,patch.width+2);cellHeight=Math.max(cellHeight,patch.height+2);}
 const columns=Math.min(3,Math.max(1,entries.length)),rows=Math.ceil(entries.length/columns);let size=16;while(size<Math.max(cellWidth*columns,cellHeight*rows))size*=2;
 if(size>4096)throw Error('Source-color atlas is too large. Reduce color resolution or increase the voxel grid.');
 const pixels=new Uint8Array(size*size*4);for(let i=3;i<pixels.length;i+=4)pixels[i]=255;
 entries.forEach((patch,i)=>{patch.x=i%columns*cellWidth+1;patch.y=Math.floor(i/columns)*cellHeight+1;const grid=patch.grid;
  for(let y=0;y<patch.height;y++)for(let x=0;x<patch.width;x++){const gx=Math.max(0,Math.min(grid.width-1,x+patch.min[0])),gy=Math.max(0,Math.min(grid.height-1,y+patch.min[1])),src=(gx+grid.width*gy)*4,dst=(patch.x+x+size*(patch.y+y))*4;pixels.set(grid.pixels.subarray(src,src+4),dst);}progress(.5+(i+1)/Math.max(1,entries.length)*.4);
 });
 const uvs=new Float32Array(mesh.uvs.length);for(let i=0;i<coordinates.length;i++){const patch=facePatches[Math.floor(i/verticesPerFace)],q=coordinates[i];uvs[i*2]=(patch.x+q[0]-patch.min[0])/size;uvs[i*2+1]=(patch.y+q[1]-patch.min[1])/size;}
 progress(1);return {...mesh,uvs,colors:new Float32Array(mesh.colors.length).fill(1),texture:{width:size,height:size,pixels},textureStyle:style,sourceColorResolution:resolution};
}
export function projectionMesh(result:ReconstructionResult,progress:(fraction:number)=>void=()=>{}){
 const style=result.options.textureStyle??'default',mesh:Mesh=result.options.smoothing?.enabled?smoothSurface(result,p=>progress(p*.45)):meshVoxels(result.voxels,result.worldSide,result.options.meshMode),quads=mesh.indices.length/6;
 if(quads>100000)throw Error('This surface exceeds 100,000 quads. Reduce grid size or simplify noisy masks.');
 if(style==='voxel'){progress(1);return {...mesh,texture:{width:16,height:16,pixels:new Uint8Array(16*16*4).fill(255)},textureStyle:style};}
 if(style==='minecraft'||style==='valheim')return sourceAtlas(mesh,result,progress);
 if(mesh.meshMode==='shape-preserving')return triangleTexture(mesh,result,progress);
 const tile=8,gutter=1,columns=Math.max(1,Math.ceil(Math.sqrt(quads)));let size=16;while(size<columns*tile)size*=2;
 const pixels=new Uint8Array(size*size*4);for(let i=3;i<pixels.length;i+=4)pixels[i]=255;
 const uvs=new Float32Array(mesh.uvs.length),colors=new Float32Array(mesh.colors.length).fill(1);
 for(let i=0;i<quads;i++){
  const base=i*4,points=Array.from({length:4},(_,j)=>Array.from(mesh.positions.slice((base+j)*3,(base+j+1)*3))),normal=mesh.normals.slice(base*3,base*3+3),center=[0,1,2].map(d=>points.reduce((s,p)=>s+p[d],0)/4),view=faceView(result,normal,center),fallback=imageColor(view,center,result.objectHeight),x=i%columns*tile,y=Math.floor(i/columns)*tile;
  for(let py=0;py<tile;py++)for(let px=0;px<tile;px++){
   const s=Math.max(0,Math.min(1,(px-gutter)/(tile-2*gutter-1))),t=Math.max(0,Math.min(1,(py-gutter)/(tile-2*gutter-1))),p=[0,1,2].map(d=>points[0][d]*(1-s)*(1-t)+points[1][d]*s*(1-t)+points[2][d]*s*t+points[3][d]*(1-s)*t),rgb=imageColor(view,p,result.objectHeight,fallback),offset=(x+px+size*(y+py))*4;for(let d=0;d<3;d++)pixels[offset+d]=rgb[d];
  }
  const tex=[[x+gutter+.5,y+gutter+.5],[x+tile-gutter-.5,y+gutter+.5],[x+tile-gutter-.5,y+tile-gutter-.5],[x+gutter+.5,y+tile-gutter-.5]];for(let j=0;j<4;j++){uvs[(base+j)*2]=tex[j][0]/size;uvs[(base+j)*2+1]=tex[j][1]/size;}
  if(i%128===0)progress(i/Math.max(1,quads));
 }
 progress(1);return {...mesh,uvs,colors,texture:{width:size,height:size,pixels},textureStyle:'default' as const};
}
export type ProjectionMesh=ReturnType<typeof projectionMesh>;

function triangleTexture(mesh:Mesh,result:ReconstructionResult,progress:(p:number)=>void){
 const faces=mesh.indices.length/3,tile=12,padding=2,columns=Math.max(1,Math.ceil(Math.sqrt(faces)));let size=16;while(size<columns*tile)size*=2;if(size>4096)throw Error('Smoothed texture atlas exceeds 4096 pixels; use a smaller voxel grid or source-pixel texture mode.');const pixels=new Uint8Array(size*size*4);for(let i=3;i<pixels.length;i+=4)pixels[i]=255;const uvs=new Float32Array(mesh.uvs.length);
 for(let i=0;i<faces;i++){const base=i*3,points=Array.from({length:3},(_,j)=>Array.from(mesh.positions.subarray((base+j)*3,(base+j+1)*3))),center=[0,1,2].map(d=>points.reduce((sum,p)=>sum+p[d]/3,0)),normal=[0,1,2].map(d=>{let sum=0;for(let j=0;j<3;j++)sum+=mesh.normals[(base+j)*3+d];return sum;}),view=faceView(result,normal.map(x=>x/(Math.hypot(...normal)||1)),center),fallback=imageColor(view,center,result.objectHeight),x=i%columns*tile,y=Math.floor(i/columns)*tile;
  for(let py=0;py<tile;py++)for(let px=0;px<tile;px++){let a=Math.max(0,(px-padding)/(tile-2*padding-1)),b=Math.max(0,(py-padding)/(tile-2*padding-1));if(a+b>1){const total=a+b;a/=total;b/=total;}const p=[0,1,2].map(d=>points[0][d]*(1-a-b)+points[1][d]*a+points[2][d]*b),rgb=imageColor(view,p,result.objectHeight,fallback),offset=(x+px+size*(y+py))*4;pixels.set(rgb,offset);}
  const tex=[[x+padding+.5,y+padding+.5],[x+tile-padding-.5,y+padding+.5],[x+padding+.5,y+tile-padding-.5]];for(let j=0;j<3;j++){uvs[(base+j)*2]=tex[j][0]/size;uvs[(base+j)*2+1]=tex[j][1]/size;}if(i%128===0)progress(.5+i/Math.max(1,faces)*.5);
 }progress(1);return {...mesh,uvs,colors:new Float32Array(mesh.colors.length).fill(1),texture:{width:size,height:size,pixels},textureStyle:'default' as const};
}
