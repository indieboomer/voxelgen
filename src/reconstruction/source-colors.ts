import type {PreparedView} from './types.js';
export type SourceColorGrid={width:number;height:number;step:number;originX:number;originY:number;pixels:Uint8Array};
/** Average only foreground pixel centers inside a projected footprint. */
export function averageForeground(view:PreparedView,x0:number,y0:number,x1:number,y1:number):number[]|undefined{
 const {width,height,pixels}=view.image;let count=0,r=0,g=0,b=0;
 const loX=Math.max(0,Math.ceil(x0-.5)),loY=Math.max(0,Math.ceil(y0-.5)),hiX=Math.min(width-1,Math.ceil(x1-.5)-1),hiY=Math.min(height-1,Math.ceil(y1-.5)-1);
 for(let y=loY;y<=hiY;y++)for(let x=loX;x<=hiX;x++){const i=x+width*y;if(!view.mask[i])continue;const weight=pixels[i*4+3]/255;if(!weight)continue;count+=weight;r+=pixels[i*4]*weight;g+=pixels[i*4+1]*weight;b+=pixels[i*4+2]*weight;}
 return count?[r/count,g/count,b/count].map(x=>Math.floor(x+.5)):undefined;
}
/** Source-image color patches, anchored once to the entire foreground bounds. */
export function sourceColorGrid(view:PreparedView,resolution:number):SourceColorGrid{
 if(!Number.isInteger(resolution)||resolution<4||resolution>128)throw Error('Color resolution must be 4-128 pixels across a source view.');
 const bounds=view.bounds,step=Math.max(bounds.width,bounds.height)/resolution,width=Math.max(1,Math.ceil(bounds.width/step)),height=Math.max(1,Math.ceil(bounds.height/step)),sums=new Float64Array(width*height*4),pixels=new Uint8Array(width*height*4),known=new Uint8Array(width*height);
 for(let y=bounds.y;y<bounds.y+bounds.height;y++)for(let x=bounds.x;x<bounds.x+bounds.width;x++){
  const i=x+view.image.width*y;if(!view.mask[i])continue;const weight=view.image.pixels[i*4+3]/255;if(!weight)continue;
  const gx=Math.min(width-1,Math.floor((x+.5-bounds.x)/step)),gy=Math.min(height-1,Math.floor((y+.5-bounds.y)/step)),offset=(gx+width*gy)*4;
  for(let d=0;d<3;d++)sums[offset+d]+=view.image.pixels[i*4+d]*weight;sums[offset+3]+=weight;
 }
 // Extend nearest foreground colors into empty blocks. The removed backdrop is
 // never averaged in, including silhouette edges and holes in the source mask.
 const queue=new Uint32Array(width*height);let head=0,tail=0;
 for(let i=0;i<known.length;i++){pixels[i*4+3]=255;if(!sums[i*4+3])continue;known[i]=1;queue[tail++]=i;for(let d=0;d<3;d++)pixels[i*4+d]=Math.floor(sums[i*4+d]/sums[i*4+3]+.5);}
 if(!tail)throw Error(`${view.direction}: no foreground colors are available.`);
 while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);for(const j of[x?i-1:-1,x+1<width?i+1:-1,y?i-width:-1,y+1<height?i+width:-1])if(j>=0&&!known[j]){known[j]=1;pixels.set(pixels.subarray(i*4,i*4+4),j*4);queue[tail++]=j;}}
 return {width,height,step,originX:bounds.x,originY:bounds.y,pixels};
}
