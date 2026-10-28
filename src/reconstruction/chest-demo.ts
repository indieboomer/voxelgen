import {directions,defaultMask,defaultAlignment,type ViewInput} from './types.js';
/** Authored arched-lid chest, orthographic unlit source views; no AI assets. */
export function chestViews(size=192):ViewInput[]{
 return directions.map(direction=>{const pixels=new Uint8ClampedArray(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=((x+.5)/size-.5)*1.6,v=(.5-(y+.5)/size)*1.6;let p:number[]|undefined;
  if(direction==='front'||direction==='back'){const a=direction==='front'?u:-u;if(Math.abs(a)<=.6&&v>=-.6&&v<=.42*Math.sqrt(Math.max(0,1-(a/.6)**2)))p=[a,v,direction==='front'?.35:-.35];}
  else if(direction==='left'||direction==='right'){const z=direction==='left'?u:-u;if(Math.abs(z)<=.35&&v>=-.6&&v<=.42)p=[(direction==='left'?-1:1)*(v<=0?.6:.6*Math.sqrt(Math.max(0,1-(v/.42)**2))),v,z];}
  else{const z=direction==='top'?-v:v;if(Math.abs(u)<=.6&&Math.abs(z)<=.35)p=[u,direction==='top'?.42*Math.sqrt(Math.max(0,1-(u/.6)**2)):-.6,z];}
  let rgb=[238,240,235];if(p){rgb=p[1]>0?[160,100,48]:[126,76,34];if(Math.abs(p[0]-.4)<.032||Math.abs(p[0]+.4)<.032)rgb=[73,78,83];if(Math.abs(p[1])<.015)rgb=[66,42,24];if(direction==='front'&&Math.abs(p[0])<.075&&p[1]>-.13&&p[1]<.05)rgb=[185,149,66];}pixels.set([...rgb,255],(x+size*y)*4);
 }return {direction,name:`Local chest study / ${direction}`,image:{width:size,height:size,pixels},maskSettings:defaultMask(),alignment:defaultAlignment()};});
}
