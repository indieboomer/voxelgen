let localKey='',localModel='';
function capabilities(){return {aiImage:!!(localKey||process.env.OPENAI_API_KEY),model:localModel||process.env.OPENAI_IMAGE_MODEL||'gpt-image-2',keySource:localKey?'app settings':process.env.OPENAI_API_KEY?'environment':'missing'};}
function configure(settings){
 if(!settings||typeof settings!=='object')throw Error('Invalid connection settings');
 if(settings.apiKey){if(typeof settings.apiKey!=='string'||settings.apiKey.trim().length<8||settings.apiKey.length>512||/[\r\n]/.test(settings.apiKey))throw Error('Enter a valid API key.');localKey=settings.apiKey.trim();}
 if(settings.model){if(typeof settings.model!=='string'||!/^[-a-zA-Z0-9._]{1,80}$/.test(settings.model))throw Error('Invalid model name');localModel=settings.model;}
 return capabilities();
}
async function generateImage(prompt,options={}){
 if(typeof prompt!=='string'||prompt.trim().length<8||prompt.length>1600)throw Error('Prompt must contain 8-1600 characters.');
 const key=options.apiKey??(localKey||process.env.OPENAI_API_KEY);if(!key)throw Error('No image API key. Open AI connection settings and enter your key.');
 const model=options.model??capabilities().model;
 let response;try{response=await (options.fetchImpl??fetch)('https://api.openai.com/v1/images/generations',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,prompt:`Create one isolated stylized game nature asset reference object (a rock, tree or bush as requested): ${prompt.trim()}. Orthographic three-quarter view, neutral studio lighting, plain charcoal background, entire object visible, detailed material texture appropriate to the object: bark, branches and layered green foliage for plants; geometric fractures and mineral surfaces for rocks. No text, no labels, no scenery, no detached debris.`,size:'1024x1024',quality:'medium',output_format:'png',n:1}),signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(180000)]):AbortSignal.timeout(180000)});}catch(error){if(options.signal?.aborted)throw Error('Image generation cancelled.');if(error?.name==='TimeoutError')throw Error('Image generation timed out after 180 seconds. Retry or change the model in AI connection settings.');throw Error('Cannot reach the image service. Check network access and retry.');}
 if(!response.ok){
  if(response.status===401)throw Error('Image generation failed (HTTP 401): the API key was rejected. Open AI connection settings and replace it with a valid key.');
  const body=await response.json().catch(()=>({}));const reason=String(body.error?.message||'Check API access and account limits.').replaceAll(key,'[redacted]').replace(/sk-[A-Za-z0-9_*.-]+/g,'[redacted]').slice(0,500);throw Error(`Image generation failed (HTTP ${response.status}): ${reason}`);
 }
 const data=await response.json(),image=data.data?.[0]?.b64_json;if(typeof image!=='string'||image.length>30_000_000)throw Error('Image service returned no valid image.');
 return {image:`data:image/png;base64,${image}`,provenance:{kind:'AI-generated 2D image',model,prompt:prompt.trim(),createdAt:new Date().toISOString()}};
}
module.exports={capabilities,configure,generateImage};
