import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);const {generateImage}=require('../desktop/image-service.cjs');let request;
const result=await generateImage('A layered shale rock',{apiKey:'test-key',model:'gpt-image-2',fetchImpl:async(url,options)=>{request={url,body:JSON.parse(options.body),authorization:options.headers.Authorization};return {ok:true,json:async()=>({data:[{b64_json:'fixture-image'}]})};}});
assert.equal(request.url,'https://api.openai.com/v1/images/generations');assert.equal(request.authorization,'Bearer test-key');assert.equal(request.body.n,1);assert(request.body.prompt.includes('A layered shale rock'));assert.equal(result.image,'data:image/png;base64,fixture-image');assert(!JSON.stringify(result).includes('test-key'));
await assert.rejects(()=>generateImage('A grey rock',{apiKey:''}),/OPENAI_API_KEY/);await assert.rejects(()=>generateImage('short',{apiKey:'test-key'}),/8-1600/);await assert.rejects(()=>generateImage('A dark basalt rock',{apiKey:'test-key',fetchImpl:async()=>({ok:false,status:429})}),/HTTP 429/);
writeFileSync('reports/desktop-v4/image-adapter.json',JSON.stringify({mockedRequest:true,missingKeyError:true,inputValidation:true,providerError:true,secretNotReturned:true,livePaidRequestExecuted:false},null,2));console.log('PASS: image API adapter contract, failures and secret isolation using a mocked provider; no paid API requests.');
