export type TextureStyle='natural'|'minecraft'|'valheim'|'tiny'|'flat';
export type DetailTexture={width:number;height:number;pixels:Uint8Array};
export const textureStyles:TextureStyle[]=['natural','minecraft','valheim','tiny','flat'];
function hash(x:number,y:number,seed:number){let h=Math.imul(x+seed,374761393)^Math.imul(y,668265263);h=Math.imul(h^(h>>>13),1274126177);return (h^(h>>>16))>>>0;}
/** Original procedural palettes/patterns, inspired by broad visual styles; no game assets. */
export function styleTexture(base:DetailTexture,style:TextureStyle,seed:number):DetailTexture{
 if(!textureStyles.includes(style))throw Error('Invalid texture style');if(style==='natural')return base;
 const size=style==='tiny'?8:style==='valheim'?64:16,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let v=255;if(style==='minecraft')v=144+(hash(x,y,seed)%5)*20+(hash(x>>2,y>>2,seed)%3)*8;
  if(style==='tiny')v=160+(hash(x,y,seed)%5)*20;
  if(style==='valheim')v=170+hash(x>>3,y>>3,seed)%41+hash(x>>1,y>>2,seed)%21+hash(x,y,seed)%13;
  const i=(x+size*y)*4;pixels[i]=pixels[i+1]=pixels[i+2]=Math.min(255,v);pixels[i+3]=255;
 }return {width:size,height:size,pixels};
}
export function flatBakedColors(geometry:{colors:Float32Array;uvs:Float32Array;indices:Uint32Array},texture:DetailTexture){
 const colors=geometry.colors.slice();for(let i=0;i<geometry.indices.length;i+=3){let u=0,v=0;for(let j=0;j<3;j++){const id=geometry.indices[i+j];u+=geometry.uvs[id*2]/3;v+=geometry.uvs[id*2+1]/3;}const offset=(Math.min(texture.width-1,Math.max(0,Math.floor(u*texture.width)))+texture.width*Math.min(texture.height-1,Math.max(0,Math.floor(v*texture.height))))*4;for(let j=0;j<3;j++)for(let d=0;d<3;d++)colors[geometry.indices[i+j]*3+d]=texture.pixels[offset+d]/255;}return colors;
}
