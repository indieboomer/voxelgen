import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {parsePrompt,promptReferences,promptStarter} from '../src/workflow/prompt.js';
import {describe,evaluate,search} from '../src/search/index.js';
let count=0;for(const prompt of ['A broad flat layered shale rock with rusty mineral seams','A tall narrow dark basalt shard','A wide weathered granite boulder']){const spec=parsePrompt(prompt);for(const n of [12,20,28,48])for(const v of promptReferences(spec,n)){assert(describe(v).count>0);assert.equal(describe(v).components,1);count++;}}
const spec=parsePrompt('A broad flat layered shale rock with rusty seams'),targets=promptReferences(spec,20),starter=promptStarter(spec),standard=evaluate(starter,[11,29,47]).score,custom=evaluate(starter,[11,29,47],false,targets).score;assert.notEqual(standard,custom);const first=search(spec.family,'C',1,123,targets,starter).next().value;assert.equal(first!.score,custom);assert.deepEqual(parsePrompt(spec.prompt),spec);assert.throws(()=>parsePrompt('tiny'));
writeFileSync('reports/desktop-v4/prompt-targets.json',JSON.stringify({connectedModels:count,deterministicParsing:true,customScore:custom,standardScore:standard,workerSearchScoreMatchesCustom:true},null,2));console.log(`PASS: ${count} connected prompt targets, deterministic parser, custom references drive optimization.`);
