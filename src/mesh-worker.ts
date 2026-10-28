import {generateRock,meshVoxels} from './runtime/index.js';
self.onmessage=e=>{const {id,options,voxels,mode,textureStyle}=e.data;try{const result=options?generateRock(options):meshVoxels(voxels,1,mode,textureStyle);self.postMessage({id,result});}catch(error){self.postMessage({id,error:String(error)});}};
