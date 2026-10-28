import type {Voxels} from './index.js';

/** Face culling -> deterministic material-aware greedy rectangles -> two triangles per quad. */
export function meshGreedy(v:Voxels,scale:number) {
  const n=v.resolution,positions:number[]=[],normals:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[];
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  const mask=new Uint8Array(n*n);
  let visibleFaces=0;
  for(let face=0;face<6;face++) {
    const axis=face>>1,u=(axis+1)%3,w=(axis+2)%3,sign=face%2===0?1:-1;
    for(let slice=0;slice<n;slice++) {
      mask.fill(0);
      for(let j=0;j<n;j++)for(let i=0;i<n;i++) {
        const q=[0,0,0];q[axis]=slice;q[u]=i;q[w]=j;
        const material=v.cells[q[0]+n*(q[1]+n*q[2])];if(!material)continue;
        q[axis]+=sign;
        if(q[axis]>=0&&q[axis]<n&&v.cells[q[0]+n*(q[1]+n*q[2])])continue;
        mask[i+n*j]=material;visibleFaces++;
      }
      for(let j=0;j<n;j++)for(let i=0;i<n;) {
        const material=mask[i+n*j];if(!material){i++;continue;}
        let width=1,height=1;
        while(i+width<n&&mask[i+width+n*j]===material)width++;
        outer:while(j+height<n){for(let k=0;k<width;k++)if(mask[i+k+n*(j+height)]!==material)break outer;height++;}
        const origin=[0,0,0];origin[axis]=slice+(sign===1?1:0);origin[u]=i;origin[w]=j;
        const corners=[origin.slice(),origin.slice(),origin.slice(),origin.slice()];
        corners[1][u]+=width;corners[2][u]+=width;corners[2][w]+=height;corners[3][w]+=height;
        const order=sign===1?[0,1,2,3]:[0,3,2,1],start=positions.length/3;
        for(const k of order) {
          const q=corners[k];
          for(let d=0;d<3;d++){const p=(q[d]/n-.5)*scale;positions.push(p);min[d]=Math.min(min[d],p);max[d]=Math.max(max[d],p);normals.push(d===axis?sign:0);colors.push(v.palette[material][d]/255);}
          // The same global planar UVs as voxel mode; a merged quad does not stretch/repeat a voxel tile.
          uvs.push(q[face<2?2:0]/n,q[face<2?1:face<4?2:1]/n);
        }
        indices.push(start,start+1,start+2,start,start+2,start+3);
        for(let y=0;y<height;y++)mask.fill(0,i+n*(j+y),i+width+n*(j+y));
        i+=width;
      }
    }
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),colors:new Float32Array(colors),uvs:new Float32Array(uvs),indices:new Uint32Array(indices),boundingBox:{min,max},meshMode:'lowpoly' as const,stats:{visibleFaces,quads:indices.length/6,triangles:indices.length/3}};
}
