import {references} from '../src/references.js';
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('public/references-v2',{recursive:true});
for(const family of ['boulder','layered','shard'] as const)references(family,28).forEach((v,i)=>writeFileSync(`public/references-v2/${family}-${i+1}.json`,JSON.stringify({...v,cells:Array.from(v.cells)})));
