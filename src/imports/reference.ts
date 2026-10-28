import {Box3,Triangle,Vector3,Color} from 'three';
import {baseRecipe,type Voxels,type Family,type Recipe} from '../runtime/index.js';
export type Surface={factor:number[];opacity:number;alphaTest:number;texture?:{width:number;height:number;pixels:Uint8ClampedArray;matrix:number[];wrapS:number;wrapT:number;flipY:boolean}};
export type TriangleSoup={positions:Float32Array;colors:Float32Array;uvs:Float32Array;materials:Uint16Array;surfaces:Surface[]};
const palette=()=>{const p:number[][]=[[0,0,0]];for(let b=0;b<6;b++)for(let g=0;g<6;g++)for(let r=0;r<6;r++)p.push([r*51,g*51,b*51]);return p;};
export function normalizeReference(source:Voxels,n:number):Voxels{
 let min=[source.resolution,source.resolution,source.resolution],max=[-1,-1,-1];const s=source.resolution;for(let z=0;z<s;z++)for(let y=0;y<s;y++)for(let x=0;x<s;x++)if(source.cells[x+s*(y+s*z)])for(const[d,a]of[x,y,z].entries()){min[d]=Math.min(min[d],a);max[d]=Math.max(max[d],a+1);}
 if(max[0]<0)throw Error('The reference model is empty.');const extent=Math.max(...max.map((x,i)=>x-min[i])),center=max.map((x,i)=>(x+min[i])/2),cells=new Uint8Array(n**3);
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){const counts=new Uint8Array(source.palette.length);for(const dz of[.25,.75])for(const dy of[.25,.75])for(const dx of[.25,.75]){const q=[x+dx,y+dy,z+dz].map((v,d)=>Math.floor(center[d]+(v/n-.5)*extent/.9));if(q.every(a=>a>=0&&a<s))counts[source.cells[q[0]+s*(q[1]+s*q[2])]]++;}let value=0;for(let i=1;i<counts.length;i++)if(counts[i]&&(value===0||counts[i]>counts[value]))value=i;cells[x+n*(y+n*z)]=value;}
 return {version:1,resolution:n,cells,palette:source.palette.map(c=>[...c]),provenance:source.provenance??'Imported local model reference'};
}
export function fitReference(source:Voxels,family:Family):Recipe{
 const v=normalizeReference(source,20),n=v.resolution,left=v.cells.map(x=>x?1:0),operations:Recipe['operations']=[];
 while(operations.length<12){let best={x:0,y:0,z:0,w:0,h:0,d:0,volume:0};for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(left[x+n*(y+n*z)]){let w=1,h=1,d=1;while(x+w<n&&left[x+w+n*(y+n*z)])w++;outer:while(y+h<n){for(let a=0;a<w;a++)if(!left[x+a+n*(y+h+n*z)])break outer;h++;}depth:while(z+d<n){for(let b=0;b<h;b++)for(let a=0;a<w;a++)if(!left[x+a+n*(y+b+n*(z+d))])break depth;d++;}const volume=w*h*d;if(volume>best.volume)best={x,y,z,w,h,d,volume};}
 if(!best.volume)break;const {x,y,z,w,h,d}=best,size=Math.max(w,h,d)/n;operations.push({kind:'block',x:(x+w/2)/n*2-1,y:(y+h/2)/n*2-1,z:(z+d/2)/n*2-1,size:Math.max(.05,size),stretch:[w,h,d].map(v=>Math.max(.08,v/n/size)) as [number,number,number],angle:0});for(let c=z;c<z+d;c++)for(let b=y;b<y+h;b++)for(let a=x;a<x+w;a++)left[a+n*(b+n*c)]=0;
 }
 return {...baseRecipe(family),erosion:0,operations};
}
export function voxelizeSoup(soup:TriangleSoup,n=48,fill=true,progress:(p:number)=>void=()=>{}):Voxels{
 if(!Number.isInteger(n)||n<12||n>64||soup.positions.length%9||soup.positions.length>250000*9||soup.colors.length!==soup.positions.length||soup.uvs.length!==soup.positions.length/3*2||soup.materials.length!==soup.positions.length/9||!soup.positions.every(Number.isFinite))throw Error('Invalid or oversized static GLB geometry.');
 const positions=soup.positions.slice(),bounds=new Box3();for(let i=0;i<positions.length;i+=3)bounds.expandByPoint(new Vector3(positions[i],positions[i+1],positions[i+2]));const center=bounds.getCenter(new Vector3()),size=bounds.getSize(new Vector3()),side=Math.max(size.x,size.y,size.z);if(!Number.isFinite(side)||side<1e-12)throw Error('GLB has no usable surface.');for(let i=0;i<positions.length;i++)positions[i]=(positions[i]-center.getComponent(i%3))/side*.9;
 const cells=new Uint8Array(n**3),distances=new Float32Array(cells.length).fill(Infinity),tri=new Triangle(),box=new Box3(),p=new Vector3(),hit=new Vector3(),weights=new Vector3(),color=new Color();let work=0;
 const wrap=(x:number,mode:number)=>mode===1000?x-Math.floor(x):mode===1002?1-Math.abs((x%2+2)%2-1):Math.max(0,Math.min(1,x));
 for(let fi=0;fi<soup.materials.length;fi++){
  const start=fi*9;tri.a.fromArray(positions,start);tri.b.fromArray(positions,start+3);tri.c.fromArray(positions,start+6);const lo=[0,1,2].map(d=>Math.max(0,Math.floor((Math.min(tri.a.getComponent(d),tri.b.getComponent(d),tri.c.getComponent(d))+.5)*n-1e-6))),hi=[0,1,2].map(d=>Math.min(n-1,Math.floor((Math.max(tri.a.getComponent(d),tri.b.getComponent(d),tri.c.getComponent(d))+.5)*n+1e-6))),surface=soup.surfaces[soup.materials[fi]];
  if(!surface)throw Error('Missing GLB material.');
  for(let z=lo[2];z<=hi[2];z++)for(let y=lo[1];y<=hi[1];y++)for(let x=lo[0];x<=hi[0];x++){
   if(++work>50000000)throw Error('GLB voxelization exceeds the work limit. Use fewer triangles or a smaller import grid.');box.min.set(x/n-.5,y/n-.5,z/n-.5);box.max.set((x+1)/n-.5,(y+1)/n-.5,(z+1)/n-.5);if(!box.intersectsTriangle(tri))continue;p.set((x+.5)/n-.5,(y+.5)/n-.5,(z+.5)/n-.5);tri.closestPointToPoint(p,hit);const i=x+n*(y+n*z),distance=p.distanceToSquared(hit);if(distance>=distances[i])continue;if(!tri.getBarycoord(hit,weights))continue;const w=[weights.x,weights.y,weights.z];let rgb=[...surface.factor],alpha=surface.opacity;
   if(surface.texture){const tex=surface.texture,m=tex.matrix;let u=0,v=0;for(let j=0;j<3;j++){u+=w[j]*soup.uvs[fi*6+j*2];v+=w[j]*soup.uvs[fi*6+j*2+1];}let a=wrap(m[0]*u+m[3]*v+m[6],tex.wrapS),b=wrap(m[1]*u+m[4]*v+m[7],tex.wrapT);if(tex.flipY)b=1-b;const offset=(Math.min(tex.width-1,Math.floor(a*tex.width))+tex.width*Math.min(tex.height-1,Math.floor(b*tex.height)))*4;color.setRGB(tex.pixels[offset]/255,tex.pixels[offset+1]/255,tex.pixels[offset+2]/255).convertSRGBToLinear();rgb=rgb.map((x,d)=>x*[color.r,color.g,color.b][d]);alpha*=tex.pixels[offset+3]/255;}
   if(alpha<Math.max(.01,surface.alphaTest))continue;for(let d=0;d<3;d++){let value=0;for(let j=0;j<3;j++)value+=w[j]*soup.colors[start+j*3+d];rgb[d]*=value;}color.setRGB(rgb[0],rgb[1],rgb[2]).convertLinearToSRGB();const q=[color.r,color.g,color.b].map(x=>Math.max(0,Math.min(5,Math.floor(x*5+.5))));cells[i]=1+q[0]+6*q[1]+36*q[2];distances[i]=distance;
  }if(fi%128===0)progress(fi/soup.materials.length*.8);
 }
 if(!cells.some(Boolean))throw Error('GLB has no visible triangles after material/alpha filtering.');
 if(fill){const outside=new Uint8Array(cells.length),queue=new Uint32Array(cells.length);let head=0,tail=0;const add=(i:number)=>{if(!cells[i]&&!outside[i]){outside[i]=1;queue[tail++]=i;}};for(let z=0;z<n;z++)for(let y=0;y<n;y++){add(n*(y+n*z));add(n-1+n*(y+n*z));}for(let z=0;z<n;z++)for(let x=0;x<n;x++){add(x+n*n*z);add(x+n*(n-1+n*z));}for(let y=0;y<n;y++)for(let x=0;x<n;x++){add(x+n*y);add(x+n*(y+n*(n-1)));}const neighbors=(i:number)=>{const x=i%n,y=Math.floor(i/n)%n,z=Math.floor(i/n/n);return[x?i-1:-1,x+1<n?i+1:-1,y?i-n:-1,y+1<n?i+n:-1,z?i-n*n:-1,z+1<n?i+n*n:-1];};while(head<tail)for(const j of neighbors(queue[head++]))if(j>=0)add(j);
 head=0;tail=0;for(let i=0;i<cells.length;i++)if(cells[i])queue[tail++]=i;while(head<tail){const i=queue[head++];for(const j of neighbors(i))if(j>=0&&!outside[j]&&!cells[j]){cells[j]=cells[i];queue[tail++]=j;}}
 }progress(1);return {version:1,resolution:n,cells,palette:palette(),provenance:`Local triangle/voxel intersection from GLB, ${fill?'enclosed interiors filled':'surface shell only'}; normalized uniformly, colors sampled from source materials.`};
}
