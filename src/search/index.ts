import {sampleVoxels,rng,baseRecipe,validate,type Recipe,type Family,type Voxels,type Op} from '../runtime/index.js';
import {references} from '../references.js';
export function describe(v:Voxels){const n=v.resolution,lo=[n,n,n],hi=[0,0,0],sum=[0,0,0],profile=Array(5).fill(0);let count=0,faces=0,asym=0;const seen=new Uint8Array(v.cells.length);let largest=0,components=0;
 for(let i=0;i<v.cells.length;i++){if(!v.cells[i])continue;count++;const x=i%n,y=Math.floor(i/n)%n,z=Math.floor(i/n/n),q=[x,y,z];q.forEach((a,k)=>{lo[k]=Math.min(lo[k],a);hi[k]=Math.max(hi[k],a);sum[k]+=a;});profile[Math.min(4,Math.floor(y/n*5))]++;if(!v.cells[(n-1-x)+n*(y+n*z)])asym++;for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const a=x+dx,b=y+dy,c=z+dz;if(a<0||b<0||c<0||a>=n||b>=n||c>=n||!v.cells[a+n*(b+n*c)])faces++;}
 if(!seen[i]){components++;const queue=[i];seen[i]=1;for(let j=0;j<queue.length;j++){const t=queue[j],a=t%n,b=Math.floor(t/n)%n,c=Math.floor(t/n/n);for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const xx=a+dx,yy=b+dy,zz=c+dz,u=xx+n*(yy+n*zz);if(xx>=0&&yy>=0&&zz>=0&&xx<n&&yy<n&&zz<n&&v.cells[u]&&!seen[u]){seen[u]=1;queue.push(u);}}}largest=Math.max(largest,queue.length);}}
 const silhouettes=[new Array(64).fill(0),new Array(64).fill(0),new Array(64).fill(0)],occupancy=new Array(125).fill(0),bins=new Array(125).fill(0);
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
 const bucket=Math.min(4,Math.floor(x/n*5))+5*(Math.min(4,Math.floor(y/n*5))+5*Math.min(4,Math.floor(z/n*5)));bins[bucket]++;
 if(!v.cells[x+n*(y+n*z)])continue;occupancy[bucket]++;
 const a=Math.min(7,Math.floor(x/n*8)),b=Math.min(7,Math.floor(y/n*8)),c=Math.min(7,Math.floor(z/n*8));silhouettes[0][a+b*8]=1;silhouettes[1][c+b*8]=1;silhouettes[2][a+c*8]=1;
 }
 for(let i=0;i<125;i++)occupancy[i]/=bins[i]||1;
 const size=hi.map((a,k)=>(a-lo[k]+1)/n);return {silhouettes,occupancy,features:[...size,count/n**3,...sum.map(a=>count?a/count/n:.5),count?Math.min(1,faces/(6*Math.pow(count,2/3))/3):1,count?asym/count:1,...profile.map(a=>a/Math.max(1,count))],count,components,fragment:count?1-largest/count:1};}
const distance=(a:number[],b:number[])=>a.reduce((s,x,i)=>s+(x-b[i])**2,0)/a.length;
const customDescriptions=new WeakMap<Voxels[],ReturnType<typeof describe>[]>();
const referenceDescriptions=new Map<string,ReturnType<typeof describe>[]>();
export function shapeDistance(a:ReturnType<typeof describe>,b:ReturnType<typeof describe>){
 let silhouette=0;
 for(let axis=0;axis<3;axis++){let intersection=0,union=0;for(let i=0;i<64;i++){intersection+=a.silhouettes[axis][i]&&b.silhouettes[axis][i]?1:0;union+=a.silhouettes[axis][i]||b.silhouettes[axis][i]?1:0;}silhouette+=1-intersection/Math.max(1,union);}
 return silhouette/3*.55+distance(a.occupancy,b.occupancy)*.3+distance(a.features,b.features)*.15;
}
export function evaluate(recipe:Recipe,seeds:number[],heldOut=false,targets?:Voxels[]){
 const key=recipe.family+heldOut;let refs=referenceDescriptions.get(key);
 if(!refs){refs=references(recipe.family).slice(heldOut?4:0,heldOut?5:4).map(describe);referenceDescriptions.set(key,refs);}
 if(targets){let all=customDescriptions.get(targets);if(!all){all=targets.map(describe);customDescriptions.set(targets,all);}refs=all.length>=5?all.slice(heldOut?4:0,heldOut?5:4):all;if(!refs.length)throw Error('At least one reference is required');}
 const voxels=seeds.map(s=>sampleVoxels(recipe,s,20)),samples=voxels.map(describe);
 const similarity=samples.reduce((s,a)=>s+Math.min(...refs!.map(b=>shapeDistance(a,b))),0)/seeds.length;
 const coverage=refs.reduce((s,a)=>s+Math.min(...samples.map(b=>shapeDistance(a,b))),0)/refs.length;
 let diversity=0;for(let i=1;i<samples.length;i++)diversity+=distance(samples[0].occupancy,samples[i].occupancy);diversity/=Math.max(1,samples.length-1);
 const invalid=samples.reduce((s,a,i)=>s+(a.count===0?1:0)+a.fragment*3+(voxels[i].discardedFraction??0)*.2,0)/seeds.length;
 return {score:similarity+coverage*.5+invalid+Math.max(0,.00015-diversity)*10+recipe.operations.length*.00004,similarity,coverage,diversity,invalid,cost:recipe.operations.reduce((n,o)=>n+(o.kind==='strata'?5:1),0)*20**3};
}
export type Mode='A'|'B'|'C';export const searchSeeds=[11,29,47],validationSeeds=[1009,2027,4093,8191];
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
export function mutate(input:Recipe,random:()=>number,structural:boolean):Recipe{
 const r=structuredClone(input);r.elongation=clamp(r.elongation+(random()-.5)*.12,.6,1.5);r.erosion=clamp(r.erosion+(random()-.5)*.15,0,1);
 const o=r.operations[Math.floor(random()*r.operations.length)],key=(['x','y','z','size'] as const)[Math.floor(random()*4)];o[key]=clamp(o[key]+(random()-.5)*.12,key==='size'?.05:-1,1);
 if(o.stretch&&random()<.4){const axis=Math.floor(random()*3);o.stretch[axis]=clamp(o.stretch[axis]+(random()-.5)*.18,.08,2);}
 if(o.angle!==undefined&&random()<.3)o.angle=clamp(o.angle+(random()-.5)*.12,-Math.PI,Math.PI);
 if(structural&&random()<.6){
 const i=Math.floor(random()*r.operations.length),choice=random();
 const kinds=r.family==='tree'||r.family==='bush'?['trunk','branch','foliage','chip'] as const:r.version===1?['mass','cut','chip','layer','noise'] as const:['block','strata','wedge','cut','chip','fracture','noise'] as const;
 const kind=kinds[Math.floor(random()*kinds.length)];const op:Op={kind,x:(random()-.5)*.8,y:(random()-.5)*.7,z:(random()-.5)*.6,size:.12+random()*.35};
 if(kind==='branch')op.end=[(random()-.5)*.9,random()*.6-.1,(random()-.5)*.7];
 if(['trunk','foliage','block','strata','wedge'].includes(kind)){op.stretch=[.5+random()*.8,.4+random()*.8,.5+random()*.6];op.angle=(random()-.5)*.5;}
 if(choice<.34&&r.operations.length<12)r.operations.push(op);else if(choice<.67&&r.operations.length>1)r.operations.splice(i,1);else r.operations[i]=op;
 }
 if(!r.operations.some(o=>['mass','block','strata','wedge','trunk','branch','foliage'].includes(o.kind)))r.operations[0]=r.version===1?{kind:'mass',x:0,y:0,z:0,size:.6}:{...baseRecipe(r.family).operations[0]};
 return validate(r);
}
export function randomRecipe(f:Family,rand:()=>number){let r=baseRecipe(f);for(let i=0;i<5;i++)r=mutate(r,rand,true);return r;}
export function* search(family:Family,mode:Mode,budget=96,seed=123,targets?:Voxels[],starter:Recipe=baseRecipe(family)){const rand=rng(seed);let population:{recipe:Recipe;score:number}[]=[],history:number[]=[],distribution:number[]=[],best:Recipe=starter,bestScore=Infinity;for(let i=0;i<budget;i++){const recipe=mode==='A'?randomRecipe(family,rand):i===0?starter:i<12?(mode==='B'?mutate(starter,rand,false):targets?mutate(starter,rand,true):randomRecipe(family,rand)):mutate(population[Math.floor(rand()*Math.min(4,population.length))].recipe,rand,mode==='C');const score=evaluate(recipe,searchSeeds,false,targets).score;distribution.push(score);population.push({recipe,score});population.sort((a,b)=>a.score-b.score);population=population.slice(0,12);if(score<bestScore){bestScore=score;best=recipe;}history.push(bestScore);yield {evaluations:i+1,budget,best:structuredClone(best),score:bestScore,history:[...history],distribution:[...distribution],elites:structuredClone(population.slice(0,6))};}}
