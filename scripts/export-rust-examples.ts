import {readFileSync,writeFileSync} from 'node:fs';
import {rustModule} from '../src/export/rust.js';
const source=readFileSync('src/export/rock_runtime.rs','utf8');
for(const family of ['boulder','layered','shard']){const recipe=JSON.parse(readFileSync(`public/recipes-v3/${family}-C-123.json`,'utf8'));writeFileSync(`public/rust/${family}-selected.rs`,rustModule(recipe,source));writeFileSync(`public/rust/${family}-lowpoly.rs`,rustModule(recipe,source,{seed:42,resolution:28,scale:1,meshMode:'lowpoly'}));}
