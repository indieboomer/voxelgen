import {smoothingSettings} from './smoothing-types.js';
import {averageForeground} from './source-colors.js';
import type {Direction,PreparedView,ReconstructionOptions,ReconstructionResult} from './types.js';

export function project(view:PreparedView,p:number[],height:number){

 const {bounds:b,alignment:a}=view;const horizontal=view.direction==='front'?p[0]:view.direction==='back'?-p[0]:view.direction==='left'?p[2]:view.direction==='right'?-p[2]:p[0],vertical=view.direction==='top'?-p[2]:view.direction==='bottom'?p[2]:p[1],span=view.projectionSpan??height;

 return [b.x+b.width/2+(horizontal/span-a.offsetX)/a.scale*b.height*(a.flip?-1:1),b.y+b.height/2-(vertical/span-a.offsetY)/a.scale*b.height];

}

export function maskAt(view:PreparedView,p:number[],height:number){

 const [u,v]=project(view,p,height),x=Math.floor(u-.5),y=Math.floor(v-.5),tx=u-.5-x,ty=v-.5-y;let coverage=0;

 // Pixel centers live at i+0.5. Symmetric thresholding avoids opposite-view edge bias

 // when a voxel center projects exactly between a foreground and a background pixel.

 for(let j=0;j<2;j++)for(let i=0;i<2;i++){const a=x+i,b=y+j;if(a>=0&&b>=0&&a<view.image.width&&b<view.image.height)coverage+=view.mask[a+view.image.width*b]*(i?tx:1-tx)*(j?ty:1-ty);}

 return coverage>.5+1e-9?1:0;

}

export function imageColor(view:PreparedView,p:number[],height:number,fallback:number[]=[128,128,128]){

 const uv=project(view,p,height),cx=Math.floor(uv[0]),cy=Math.floor(uv[1]),w=view.image.width,h=view.image.height;let best=Infinity,index=-1;

 // Foreground-only nearest samples prevent removed backdrop colors leaking onto edge faces.

 for(let radius=0;radius<=8;radius++){for(let y=Math.max(0,cy-radius);y<=Math.min(h-1,cy+radius);y++)for(let x=Math.max(0,cx-radius);x<=Math.min(w-1,cx+radius);x++){if(radius&&Math.abs(x-cx)!==radius&&Math.abs(y-cy)!==radius)continue;const i=x+w*y;if(!view.mask[i])continue;const d=(x+.5-uv[0])**2+(y+.5-uv[1])**2;if(d<best){best=d;index=i;}}if(index>=0)break;}

 return index<0?fallback:[view.image.pixels[index*4],view.image.pixels[index*4+1],view.image.pixels[index*4+2]];

}

export function reconstruct(views:PreparedView[],options:ReconstructionOptions,progress:(fraction:number)=>void=()=>{}):ReconstructionResult{

 const started=performance.now(),o={...options,textureStyle:options.textureStyle??'default',textureResolution:options.textureResolution??16,smoothing:smoothingSettings(options.smoothing)};

 if(!['two','four','six'].includes(o.viewMode)||!['default','voxel','minecraft','valheim'].includes(o.textureStyle)||!Number.isInteger(o.textureResolution)||o.textureResolution<4||o.textureResolution>128||!['grid','voxel'].includes(o.sizing)||!['voxel','lowpoly'].includes(o.meshMode)||!Number.isFinite(o.objectHeight)||o.objectHeight<=0||o.objectHeight>1e6||!Number.isFinite(o.depthRatio)||o.depthRatio<.02||o.depthRatio>4||!Number.isFinite(o.voxelSize)||o.voxelSize<=0||!Number.isInteger(o.resolution)||o.resolution<12||o.resolution>96)throw Error('Choose a grid from 12 to 96, positive height/voxel size, and depth/height from 0.02 to 4.');

 const required:Direction[]=o.viewMode==='six'?['front','back','left','right','top','bottom']:o.viewMode==='four'?['front','back','left','right']:['front','back'];

 const active=required.map(direction=>{const v=views.find(v=>v.direction===direction);if(!v)throw Error(`Add the ${direction} image before reconstructing.`);const a=v.alignment;if(![a.offsetX,a.offsetY,a.scale].every(Number.isFinite)||Math.abs(a.offsetX)>2||Math.abs(a.offsetY)>2||a.scale<.1||a.scale>4)throw Error('Invalid view alignment.');return {...v,projectionSpan:undefined} as PreparedView;});

 // Horizontal images cannot use object height as their foreground depth.
 // Calibrate their pixel scale from the shared physical width seen in front/back.
 const width=active.slice(0,2).reduce((sum,v)=>sum+v.bounds.width/v.bounds.height*o.objectHeight*v.alignment.scale,0)/2;
 for(const v of active)if(v.direction==='top'||v.direction==='bottom')v.projectionSpan=width*v.bounds.height/v.bounds.width;
 const plane=(d:Direction)=>d==='front'||d==='back'?0:d==='left'||d==='right'?1:2;
 const planeIndex=(d:Direction,x:number,y:number,z:number,n:number)=>plane(d)===0?x+n*y:plane(d)===1?z+n*y:x+n*z;
 const depthValue=(d:Direction,x:number,y:number,z:number)=>plane(d)===0?z:plane(d)===1?x:y;
 let halfExtent=o.objectHeight*.5;if(o.viewMode==='two')halfExtent=Math.max(halfExtent,o.objectHeight*o.depthRatio*.5);

 for(const v of active){halfExtent=Math.max(halfExtent,(v.projectionSpan??o.objectHeight)*(v.bounds.width/v.bounds.height*v.alignment.scale*.5+Math.abs(v.alignment.offsetX)),(v.projectionSpan??o.objectHeight)*(v.alignment.scale*.5+Math.abs(v.alignment.offsetY)));}

 const requiredSide=halfExtent*2*1.04,n=o.sizing==='grid'?o.resolution:Math.ceil(requiredSide/o.voxelSize);

 if(n<12||n>96)throw Error(`That voxel size requires a ${n}3 grid. Choose a size giving 12–96 cells per axis, or use grid mode.`);

 const side=o.sizing==='grid'?requiredSide:n*o.voxelSize,voxelSize=side/n,cells=new Uint8Array(n**3),tables=active.map(v=>{const table=new Uint8Array(n*n);for(let y=0;y<n;y++)for(let u=0;u<n;u++){const horizontal=((u+.5)/n-.5)*side,vertical=((y+.5)/n-.5)*side;table[u+n*y]=maskAt(v,plane(v.direction)===0?[horizontal,vertical,0]:plane(v.direction)===1?[0,vertical,horizontal]:[horizontal,0,vertical],o.objectHeight);}return table;});

 // Compute one averaged source footprint per projected grid cell, once per
 // view. Interior voxels reuse these colors instead of sampling noisy pixels.
 const colorTables=active.map((view,i)=>{const colors=new Uint8Array(n*n*3),span=view.projectionSpan??o.objectHeight,pixelHalf=Math.max(1.5,voxelSize/span/view.alignment.scale*view.bounds.height*.5);
  for(let y=0;y<n;y++)for(let u=0;u<n;u++){const index=u+n*y;if(!tables[i][index])continue;const horizontal=((u+.5)/n-.5)*side,vertical=((y+.5)/n-.5)*side,p=plane(view.direction)===0?[horizontal,vertical,0]:plane(view.direction)===1?[0,vertical,horizontal]:[horizontal,0,vertical],uv=project(view,p,o.objectHeight),rgb=averageForeground(view,uv[0]-pixelHalf,uv[1]-pixelHalf,uv[0]+pixelHalf,uv[1]+pixelHalf)??imageColor(view,p,o.objectHeight);colors.set(rgb,index*3);}
  return colors;
 });
 const paletteSums=new Float64Array(217*4);
 const palette:number[][]=[[0,0,0]];for(let b=0;b<6;b++)for(let g=0;g<6;g++)for(let r=0;r<6;r++)palette.push([r*51,g*51,b*51]);

 for(let z=0;z<n;z++){for(let y=0;y<n;y++)for(let x=0;x<n;x++){

  if(o.viewMode==='two'&&Math.abs(((z+.5)/n-.5)*side)>o.objectHeight*o.depthRatio*.5)continue;

  if(!active.every((v,i)=>tables[i][planeIndex(v.direction,x,y,z,n)]))continue;

  cells[x+n*(y+n*z)]=1;

 }progress((z+1)/n*.75);}

 const seen=new Uint8Array(cells.length),queue=new Uint32Array(cells.length),components:number[][]=[];let largest:number[]=[];

 for(let start=0;start<cells.length;start++){if(!cells[start]||seen[start])continue;let head=0,tail=1;queue[0]=start;seen[start]=1;while(head<tail){const i=queue[head++],x=i%n,y=Math.floor(i/n)%n,z=Math.floor(i/n/n);for(const j of [x?i-1:-1,x+1<n?i+1:-1,y?i-n:-1,y+1<n?i+n:-1,z?i-n*n:-1,z+1<n?i+n*n:-1])if(j>=0&&cells[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}}const c=Array.from(queue.subarray(0,tail));components.push(c);if(c.length>largest.length)largest=c;}

 const rawCount=components.reduce((s,c)=>s+c.length,0);if(!rawCount)throw Error('The silhouettes do not overlap on this grid. Check view labels, masks, alignment, depth, or use a finer grid.');

 let removedComponents=0;if(o.largestOnly&&components.length>1){cells.fill(0);for(const i of largest)cells[i]=1;removedComponents=rawCount-largest.length;}

 const projected=[new Uint8Array(n*n),new Uint8Array(n*n),new Uint8Array(n*n)];let occupied=0;for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(cells[x+n*(y+n*z)]){occupied++;projected[0][x+n*y]=1;projected[1][z+n*y]=1;projected[2][x+n*z]=1;}

 const agreement=active.map((v,i)=>{const p=projected[plane(v.direction)];let samples=0,matched=0;for(let k=0;k<p.length;k++)if(tables[i][k]){samples++;if(p[k])matched++;}return {direction:v.direction,coverage:matched/Math.max(1,samples),samples};});

 const depths=active.map(()=>new Int16Array(n*n).fill(-1));

 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(cells[x+n*(y+n*z)])for(let i=0;i<active.length;i++){const d=active[i].direction,index=planeIndex(d,x,y,z,n),value=depthValue(d,x,y,z),positive=d==='front'||d==='right'||d==='top';if(depths[i][index]<0||(positive?value>depths[i][index]:value<depths[i][index]))depths[i][index]=value;}

 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(cells[x+n*(y+n*z)]){let best=Infinity,sourceIndex=0;for(let i=0;i<active.length;i++){const d=active[i].direction,depth=depths[i][planeIndex(d,x,y,z,n)],distance=Math.abs(depth-depthValue(d,x,y,z));if(distance<best){best=distance;sourceIndex=i;}}const offset=planeIndex(active[sourceIndex].direction,x,y,z,n)*3,rgb=Array.from(colorTables[sourceIndex].slice(offset,offset+3)),q=rgb.map(x=>Math.max(0,Math.min(5,Math.floor(x/51+.5))));const material=1+q[0]+6*q[1]+36*q[2];cells[x+n*(y+n*z)]=material;for(let d=0;d<3;d++)paletteSums[material*4+d]+=rgb[d];paletteSums[material*4+3]++;}

 // Keep the compact palette, but use actual averaged source colors for each
 // occupied bin rather than snapping the model to an artificial RGB color cube.
 for(let i=1;i<palette.length;i++)if(paletteSums[i*4+3])palette[i]=[0,1,2].map(d=>Math.floor(paletteSums[i*4+d]/paletteSums[i*4+3]+.5));
 const warnings=active.flatMap(v=>v.warnings.map(w=>`${v.direction}: ${w}`));if(o.viewMode==='two')warnings.push(`Front/back do not determine depth. A straight extrusion with depth/height ${o.depthRatio} was assumed.`);

 for(const a of agreement)if(a.coverage<.9)warnings.push(`${a.direction}: only ${(a.coverage*100).toFixed(1)}% of sampled silhouette survives the other views. Check masks and alignment.`);

 if(components.length>1)warnings.push(`${components.length} disconnected components found; ${o.largestOnly?'only the largest was retained.':'all retained. Enable largest-component cleanup only if the extra pieces are unwanted.'}`);

 warnings.push(o.viewMode==='six'?'Six silhouettes constrain all three axes; hidden cavities and recesses invisible in every view remain unresolved.':'Unseen concavities and top/bottom details cannot be recovered from these views. Unobserved surface colors are extrapolated.');progress(1);

 return {voxels:{version:1,resolution:n,cells,palette,provenance:'Local orthographic visual hull v1; source image masks and color projection; no AI or learned model.'},worldSide:side,voxelSize,objectHeight:o.objectHeight,occupied,components:components.length,removedComponents,agreement,warnings,views:active,options:{...o},milliseconds:performance.now()-started};

}

export function reconstructionMetadata(result:ReconstructionResult){return {schemaVersion:1,algorithm:'local-orthographic-visual-hull-v1',voxelColorSampling:'foreground pixel-footprint average',worldSide:result.worldSide,voxelSize:result.voxelSize,objectHeight:result.objectHeight,options:result.options,views:result.views.map(v=>({direction:v.direction,name:v.name,alignment:v.alignment,maskSettings:v.maskSettings,background:v.background,bounds:v.bounds,projectionSpan:v.projectionSpan??result.objectHeight})),agreement:result.agreement,warnings:result.warnings};}

