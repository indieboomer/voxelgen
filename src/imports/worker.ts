import {voxelizeSoup} from './reference.js';
self.onmessage=e=>{try{const result=voxelizeSoup(e.data.soup,e.data.resolution,e.data.fill,p=>self.postMessage({progress:p}));self.postMessage({result});}catch(error){self.postMessage({error:String(error)});}};
