import {type Family, type Voxels} from './runtime/index.js';
export const referenceDataset = 'geology-study-v2';
export const referenceBoard = '/art/rock-reference-board-v2.png';
export const referenceNames: Record<Family,string[]> = {
 boulder:['Split granite','Weathered crown','Joined outcrop','Low granite','Fractured shoulder'],
 layered:['Undercut shale','Tilted bedding','Broken shelves','Offset strata','Eroded ledges'],
 shard:['Basalt fin','Split blade','Stepped spire','Sloping buttress','Fracture ridge']
};
// Authored voxel interpretations of AI-generated 2D artwork. No generated 3D mesh is claimed.
function block(x:number,y:number,z:number,cx:number,cy:number,cz:number,sx:number,sy:number,sz:number,angle:number,bevel=.16){
 const dx=x-cx,dz=z-cz,a=Math.abs((dx*Math.cos(angle)-dz*Math.sin(angle))/sx),b=Math.abs((y-cy)/sy),c=Math.abs((dx*Math.sin(angle)+dz*Math.cos(angle))/sz);
 return Math.max(a,b,c,(a+b+c)/(3-bevel*3),(a+b)/(2-bevel),(a+c)/(2-bevel),(b+c)/(2-bevel))-1;
}
const cache=new Map<string,Voxels[]>();
export function references(family:Family,n=20):Voxels[]{
 if(!Number.isInteger(n)||n<12||n>48)throw Error('Reference resolution must be 12-48');
 const key=`${family}:${n}`,existing=cache.get(key);if(existing)return existing;
 const result=Array.from({length:5},(_,k)=>{
 const cells=new Uint8Array(n**3),phase=k*.73;
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
 const widths=[1,.92,1.04,1.1,.94],heights=family==='boulder'?[1,.87,1.06,.77,.96]:family==='layered'?[1,.9,1.08,.83,1.04]:[1,.9,1.08,.88,1.03];
 const a=((x+.5)/n*2-1)/widths[k],b=((y+.5)/n*2-1)/heights[k],c=((z+.5)/n*2-1)/[1,1.06,.91,1.04,.96][k];let d=10;
 if(family==='boulder'){
 d=block(a,b,c,-.08,-.05,.02,.55,.54,.49,.18+phase*.07,.22);
 d=Math.min(d,block(a,b,c,.36,-.19,.1,.35,.32,.4,-.18,.2));
 d=Math.min(d,block(a,b,c,-.39,-.24,-.16,.32,.29,.38,.28,.24));
 d=Math.min(d,block(a,b,c,-.13,.35,-.09,.34,.22,.33,-.13+phase*.08,.27));
 d=Math.max(d,a*.5+b*.8+c*.22-(.56+k*.012));
 if(b>.06&&Math.abs(a-.09-b*.16)<.026&&c>.03)d=.05;
 if(a<-.18&&b>.1&&c>.31+Math.sin(b*9+phase)*.025)d=.05;
 }else if(family==='layered'){
 const tilt=(k-2)*.035;
 for(let j=0;j<5;j++){const shift=Math.sin(j*2.4+phase)*.11,level=-.36+j*.145,width=.73-j*.046+Math.cos(j+phase)*.035;
 d=Math.min(d,block(a,b-a*tilt,c,shift,level,Math.cos(j*1.8+phase)*.06,width,.092,.52-j*.025,.08+Math.sin(j+phase)*.045,.14));}
 if(a>.29&&c>.07&&b>-.2&&b<-.075)d=.05;
 if(a<-.36&&c<-.15&&b>.14)d=.05;
 }else{
 for(let j=0;j<4;j++){const cx=-.34+j*.2,top=.64-j*.24+Math.sin(phase+j)*.06;
 const q=block(a,b,c,cx,(top-.65)/2,.02+j*.025,.2,(top+.65)/2,.31-j*.025,-.15,.1);
 d=Math.min(d,Math.max(q,(a-cx)*.85+b-top+.06));}
 d=Math.min(d,block(a,b,c,.12,-.53,-.01,.54,.13,.42,-.12,.23));
 d=Math.max(d,c*.65+a*.18-b*.08-.33);
 if(b>-.18&&Math.abs(a+.06-b*.1)<.023&&c>.05)d=.05;
 }
 if(d>=0)continue;
 const vein=Math.sin(a*11+b*6+c*4+phase)+.24*Math.sin(c*21-b*7),mottle=Math.sin(a*9+c*7)*Math.cos(b*8-a*3);
 const band=family==='layered'?Math.sin((b-a*(k-2)*.035)*43):mottle;
 cells[x+n*(y+n*z)]=Math.abs(vein)<.12?4:band>.45?2:band<-.4?3:1;
 }
 const palette=family==='shard'?[[0,0,0],[80,88,99],[92,101,113],[70,77,88],[116,139,153]]:family==='layered'?[[0,0,0],[119,114,104],[133,127,115],[105,102,96],[156,119,76]]:[[0,0,0],[133,130,119],[145,141,130],[118,117,109],[170,128,73]];
 return {version:1 as const,resolution:n,cells,palette,material:{family,seed:k},provenance:`${referenceDataset}: ${referenceNames[family][k]}. Authored voxel interpretation of AI-generated 2D concept board rock-reference-board-v2.png; not AI-generated 3D. ${k===4?'Held-out reference.':'Training reference.'}`};
 });cache.set(key,result);return result;
}
