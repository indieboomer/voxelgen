import type {PreparedView} from './types.js';
type Point=[number,number];
export type Segment={a:Point;b:Point;normal:Point;startNormal:Point;endNormal:Point};
const distance2=(p:Point,a:Point,b:Point)=>{const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0;return (p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;};
function simplify(points:Point[],tolerance:number):Point[]{
 if(points.length<3)return points;const keep=new Uint8Array(points.length);keep[0]=keep[points.length-1]=1;const stack=[[0,points.length-1]];
 while(stack.length){const[a,b]=stack.pop()!;let best=tolerance*tolerance,index=-1;for(let i=a+1;i<b;i++){const d=distance2(points[i],points[a],points[b]);if(d>best){best=d;index=i;}}if(index>=0){keep[index]=1;stack.push([a,index],[index,b]);}}
 return points.filter((_,i)=>keep[i]);
}
export function contourSegments(view:PreparedView,angle:number,tolerance=.6):Segment[]{
 const w=view.image.width,h=view.image.height,stride=w+1,edges:{a:number;b:number;direction:number}[]=[],outgoing=new Map<number,number[]>();
 const add=(x:number,y:number,u:number,v:number,direction:number)=>{const a=x+stride*y,b=u+stride*v,id=edges.length;edges.push({a,b,direction});let list=outgoing.get(a);if(!list){list=[];outgoing.set(a,list);}list.push(id);};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=x+w*y;if(!view.mask[i])continue;if(!y||!view.mask[i-w])add(x,y,x+1,y,0);if(x===w-1||!view.mask[i+1])add(x+1,y,x+1,y+1,1);if(y===h-1||!view.mask[i+w])add(x+1,y+1,x,y+1,2);if(!x||!view.mask[i-1])add(x,y+1,x,y,3);}
 if(edges.length>200000)throw Error('Mask contours are too complex for feature fitting. Remove mask specks or use a smaller image.');
 const visited=new Uint8Array(edges.length),loops:Point[][]=[];
 for(let start=0;start<edges.length;start++){if(visited[start])continue;const loop:Point[]=[];let current=start;for(let guard=0;guard<=edges.length;guard++){if(visited[current])break;const edge=edges[current];visited[current]=1;loop.push([edge.a%stride,Math.floor(edge.a/stride)]);if(edge.b===edges[start].a)break;const candidates=(outgoing.get(edge.b)??[]).filter(i=>!visited[i]);if(!candidates.length)break;const priority=(i:number)=>{const turn=(edges[i].direction-edge.direction+4)%4;return turn===1?0:turn===0?1:turn===3?2:3;};candidates.sort((a,b)=>priority(a)-priority(b)||a-b);current=candidates[0];}
  if(loop.length>=4){let split=1,best=0;for(let i=1;i<loop.length;i++){const d=(loop[i][0]-loop[0][0])**2+(loop[i][1]-loop[0][1])**2;if(d>best){best=d;split=i;}}const first=simplify(loop.slice(0,split+1),tolerance),second=simplify([...loop.slice(split),loop[0]],tolerance),poly=[...first.slice(0,-1),...second.slice(0,-1)];if(poly.length>=3)loops.push(poly);}
 }
 const segments:Segment[]=[];const cosine=Math.cos(angle*Math.PI/180),unit=(p:Point):Point=>{const l=Math.hypot(...p)||1;return[p[0]/l,p[1]/l];};
 for(const loop of loops){const normals=loop.map((a,i)=>{const b=loop[(i+1)%loop.length];return unit([b[1]-a[1],a[0]-b[0]]);});for(let i=0;i<loop.length;i++){const normal=normals[i],prev=normals[(i+loop.length-1)%loop.length],next=normals[(i+1)%loop.length],blend=(other:Point)=>normal[0]*other[0]+normal[1]*other[1]>=cosine?unit([normal[0]+other[0],normal[1]+other[1]]):normal;segments.push({a:loop[i],b:loop[(i+1)%loop.length],normal,startNormal:blend(prev),endNormal:blend(next)});}}
 return segments;
}
export function signedContourDistance(point:Point,segments:Segment[]){let inside=false,best=Infinity;for(const s of segments){const{a,b}=s;if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;best=Math.min(best,distance2(point,a,b));}return Math.sqrt(best)*(inside?-1:1);}
