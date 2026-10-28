import type {PreparedView,ViewInput} from './types.js';
const linear=Array.from({length:256},(_,i)=>{const s=i/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;});
function lab(r:number,g:number,b:number){const R=linear[r],G=linear[g],B=linear[b],f=(x:number)=>x>.008856?Math.cbrt(x):7.787*x+16/116;const x=f((R*.4124564+G*.3575761+B*.1804375)/.95047),y=f(R*.2126729+G*.7151522+B*.072175),z=f((R*.0193339+G*.119192+B*.9503041)/1.08883);return [116*y-16,500*(x-y),200*(y-z)];}
export function prepareView(input:ViewInput):PreparedView{
 const {width:w,height:h,pixels}=input.image,total=w*h,settings=input.maskSettings;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<2||h<2||w>1024||h>1024||pixels.length!==total*4)throw Error('Images must be 2–1024 pixels per side after local resizing.');
 if(!Number.isFinite(settings.tolerance)||settings.tolerance<0||settings.tolerance>100||!Number.isInteger(settings.despeckle)||settings.despeckle<0||settings.despeckle>500||!['auto','alpha','color','none'].includes(settings.mode)||!settings.color.every(x=>Number.isInteger(x)&&x>=0&&x<=255))throw Error('Invalid background settings.');
 if(input.overrides&&(input.overrides.length!==total||input.overrides.some(x=>x>2)))throw Error('Invalid mask corrections.');
 const bins=new Map<number,{count:number;sum:number[]}>(),border:number[]=[],strip=Math.max(1,Math.floor(Math.min(w,h)*.02));let transparentBorder=0,borderTotal=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=x+w*y;if(x>=strip&&x<w-strip&&y>=strip&&y<h-strip)continue;borderTotal++;if(pixels[i*4+3]<128){transparentBorder++;continue;}border.push(i);const r=pixels[i*4],g=pixels[i*4+1],b=pixels[i*4+2],key=(r>>4)+16*(g>>4)+256*(b>>4);let bin=bins.get(key);if(!bin){bin={count:0,sum:[0,0,0]};bins.set(key,bin);}bin.count++;bin.sum[0]+=r;bin.sum[1]+=g;bin.sum[2]+=b;}
 let winner={count:0,sum:[255,255,255]};for(const bin of bins.values())if(bin.count>winner.count)winner=bin;
 const detected=winner.count?winner.sum.map(x=>Math.round(x/winner.count)):[255,255,255],background=(settings.mode==='color'?settings.color:detected) as [number,number,number];
 const alpha=settings.mode==='alpha'||settings.mode==='auto'&&transparentBorder>borderTotal*.02,warnings:string[]=[],candidate=new Uint8Array(total),removed=new Uint8Array(total),target=lab(...background),tolerance2=settings.tolerance**2;
 if(settings.mode==='auto'&&!alpha&&winner.count/Math.max(1,border.length)<.35)warnings.push('Border colors are mixed. Pick a background color or correct the mask.');
 for(let i=0;i<total;i++){if(pixels[i*4+3]<128){candidate[i]=1;continue;}if(settings.mode==='none'||alpha)continue;const q=lab(pixels[i*4],pixels[i*4+1],pixels[i*4+2]);if((q[0]-target[0])**2+(q[1]-target[1])**2+(q[2]-target[2])**2<=tolerance2)candidate[i]=1;}
 if(alpha||settings.enclosed||settings.mode==='none'){removed.set(candidate);}else{
 const queue=new Uint32Array(total);let head=0,tail=0;const add=(i:number)=>{if(candidate[i]&&!removed[i]){removed[i]=1;queue[tail++]=i;}};
 for(let x=0;x<w;x++){add(x);add(x+w*(h-1));}for(let y=0;y<h;y++){add(w*y);add(w-1+w*y);}while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);if(x)add(i-1);if(x+1<w)add(i+1);if(y)add(i-w);if(y+1<h)add(i+w);}
 }
 const mask=removed.map((x,i)=>pixels[i*4+3]<128?0:1-x);
 if(settings.despeckle){const seen=new Uint8Array(total),queue=new Uint32Array(total);for(let start=0;start<total;start++){if(!mask[start]||seen[start])continue;let head=0,tail=1;queue[0]=start;seen[start]=1;while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);for(const j of [x?i-1:-1,x+1<w?i+1:-1,y?i-w:-1,y+1<h?i+w:-1])if(j>=0&&mask[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}}if(tail<settings.despeckle)for(let k=0;k<tail;k++)mask[queue[k]]=0;}}
 if(input.overrides)for(let i=0;i<total;i++){if(input.overrides[i]===1)mask[i]=1;if(input.overrides[i]===2)mask[i]=0;}
 let loX=w,loY=h,hiX=-1,hiY=-1,count=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[x+w*y]){count++;loX=Math.min(loX,x);hiX=Math.max(hiX,x);loY=Math.min(loY,y);hiY=Math.max(hiY,y);}
 if(!count)throw Error(`${input.direction}: background removal left no foreground. Reduce tolerance, use alpha only, or paint a foreground area.`);
 if(loX===0||loY===0||hiX===w-1||hiY===h-1)warnings.push('Foreground touches an image edge; a cropped object or remaining background can distort the result.');
 if(count/total>.95)warnings.push('Almost the entire image is foreground. Check the background mask.');
 return {...input,mask,bounds:{x:loX,y:loY,width:hiX-loX+1,height:hiY-loY+1},background,removed:1-count/total,warnings};
}
