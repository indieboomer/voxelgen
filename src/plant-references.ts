import type {Family,Voxels} from './runtime/index.js';
const segment=(a:number,b:number,c:number,p:number[],q:number[],radius:number)=>{const d=q.map((x,i)=>x-p[i]),v=[a-p[0],b-p[1],c-p[2]],t=Math.max(0,Math.min(1,v.reduce((s,x,i)=>s+x*d[i],0)/d.reduce((s,x)=>s+x*x,0)));return Math.hypot(...v.map((x,i)=>x-t*d[i]))<radius;};
export function plantReferences(family:Family,n:number):Voxels[]{return Array.from({length:5},(_,k)=>{const cells=new Uint8Array(n**3),phase=k*.57;
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
 const a=(x+.5)/n*2-1,b=(y+.5)/n*2-1,c=(z+.5)/n*2-1;let wood=false,leaf=false;
 if(family==='tree'){
 wood=b>-.85&&b<.3&&Math.hypot(a+.025*Math.sin(b*3+phase),c)<.15*(1-.2*(b+.2));
 wood||=segment(a,b,c,[0,-.15,0],[-.38,.38,.05],.13)||segment(a,b,c,[0,0,0],[.35,.43,-.05],.13);
 for(const [cx,cy,cz,r] of [[-.3,.36,.05,.4],[.3,.4,.03,.41],[.01,.6,-.14,.38]]){const dx=(a-cx-Math.sin(phase)*.035)/(1+k*.025),dy=(b-cy)/(.9+k*.02),dz=c-cz;leaf||=dx*dx+dy*dy+dz*dz<r*r*(1+.08*Math.sin(a*15+b*11+c*7+phase));}
 }else{
 wood=segment(a,b,c,[0,-.82,0],[-.35,-.22,.04],.125)||segment(a,b,c,[0,-.82,0],[.35,-.2,.06],.125)||segment(a,b,c,[0,-.82,0],[0,-.04,-.2],.13);
 for(const [cx,cy,cz,r] of [[0,-.18,0,.44],[-.36,-.3,.1,.35],[.36,-.26,.03,.34],[.02,-.28,-.32,.34]]){const dx=(a-cx)/(1+k*.02),dy=(b-cy)/(.85+k*.03),dz=c-cz;leaf||=dx*dx+dy*dy+dz*dz<r*r*(1+.1*Math.sin(a*13+b*9-c*11+phase));}
 }
 if(leaf){const m=Math.sin(a*13+c*11+phase)*Math.cos(b*17-a*7);cells[x+n*(y+n*z)]=m<-.3?2:m>.45?4:3;}else if(wood)cells[x+n*(y+n*z)]=1;
 }
 const palette=family==='tree'?[[0,0,0],[112,73,40],[38,76,32],[63,112,41],[99,142,54]]:[[0,0,0],[105,70,38],[37,77,37],[63,116,50],[110,148,66]];
 return {version:1,resolution:n,cells,palette,material:{family,seed:k},provenance:`Authored ${family} study ${k+1}, independent botanical primitive construction informed by AI 2D vegetation-reference-board-v7.png. Not an AI-generated mesh. ${k===4?'Held-out variation.':'Training variation.'}`};
 });}
