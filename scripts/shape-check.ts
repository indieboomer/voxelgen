import {baseRecipe,sampleVoxels} from '../src/runtime/index.js';
import {sampleVoxels as legacySample} from '../reports/geometry-v3/runtime-v1-baseline.js';
import {evaluate,validationSeeds,describe,shapeDistance} from '../src/search/index.js';
import {references} from '../src/references.js';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const records=[];
for(const family of ['boulder','layered','shard'] as const){
 const oldRecipe=JSON.parse(readFileSync(`public/recipes/${family}-C-123.json`,'utf8')),newRecipe=baseRecipe(family);
 for(const seed of validationSeeds){assert.deepEqual(sampleVoxels(oldRecipe,seed).cells,legacySample(oldRecipe,seed).cells);}
 const oldScore=evaluate(oldRecipe,validationSeeds,true),newScore=evaluate(newRecipe,validationSeeds,true);
 records.push({family,oldScore,newScore,improvementPercent:(1-newScore.score/oldScore.score)*100});
 console.log(family,oldScore.score.toFixed(5),'->',newScore.score.toFixed(5));
}
// An equal-volume smooth sphere must not match a detailed object merely through proportions.
const v=references('layered')[0],copy={...v,cells:v.cells.slice()};assert.equal(shapeDistance(describe(v),describe(copy)),0);
writeFileSync('reports/geometry-v3/baseline-comparison.json',JSON.stringify({conditions:'Same v2 shape descriptors, v2 references and independent validation seeds for both runtimes; old saved C-123 recipes versus new authored family starters, not an evolutionary advantage claim.',records},null,2));
