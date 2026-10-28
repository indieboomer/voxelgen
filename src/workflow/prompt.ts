import {type Family,type Voxels,baseRecipe,validate} from '../runtime/index.js';
import {references} from '../references.js';
export type PromptSpec={prompt:string;id:string;family:Family;width:number;height:number;depth:number;rust:boolean;dark:boolean};
export function parsePrompt(prompt:string):PromptSpec {
 const text=prompt.trim();if(text.length<8||text.length>1600)throw Error('Describe a rock using 8-1600 characters.');
 const p=text.toLowerCase();let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);
 const family:Family=/layer|shale|slate|sediment|shelf|shelves|flat/.test(p)?'layered':/shard|basalt|spire|blade|tall|fin\b/.test(p)?'shard':'boulder';
 return {prompt:text,id:`prompt-${(h>>>0).toString(16)}`,family,width:/broad|wide|flat/.test(p)?1.12:/narrow|thin/.test(p)?.84:1,height:/tall|tower|spire/.test(p)?1.12:/low|flat/.test(p)?.8:1,depth:/thin|slender/.test(p)?.8:1,rust:/rust|ochre|warm|iron/.test(p),dark:/dark|black|basalt/.test(p)};
}
export function promptReferences(spec:PromptSpec,n=20):Voxels[]{
 const source=references(spec.family,48);
 return source.map((v,k)=>{const cells=new Uint8Array(n**3);
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
 const sx=Math.floor((((x+.5)/n-.5)/spec.width+.5)*48),sy=Math.floor((((y+.5)/n-.5)/spec.height+.5)*48),sz=Math.floor((((z+.5)/n-.5)/spec.depth+.5)*48);
 if(sx>=0&&sy>=0&&sz>=0&&sx<48&&sy<48&&sz<48)cells[x+n*(y+n*z)]=v.cells[sx+48*(sy+48*sz)];
 }
 const palette=v.palette.map((c,i)=>c.map((a,j)=>Math.max(0,Math.min(255,a*(spec.dark?.85:1)+(spec.rust&&i===4?(j===0?12:j===2?-8:0):0)))));
 return {version:1,resolution:n,cells,palette,material:{family:spec.family,seed:k},provenance:`${spec.id}. Prompt: ${spec.prompt}. Procedural 3D interpretation of prompt intent, not an AI mesh or reconstructed hidden surfaces. ${k===4?'Held-out variation.':'Training variation.'}`};
 });
}
export function promptStarter(spec:PromptSpec){const r=baseRecipe(spec.family);r.elongation=Math.max(.6,Math.min(1.5,spec.width));for(const o of r.operations){o.y*=spec.height;o.z*=spec.depth;if(o.stretch){o.stretch[1]=Math.max(.08,Math.min(2,o.stretch[1]*spec.height));o.stretch[2]=Math.max(.08,Math.min(2,o.stretch[2]*spec.depth));}}return validate(r);}
