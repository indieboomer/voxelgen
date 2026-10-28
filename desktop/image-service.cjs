function capabilities(){return {aiImage:!!process.env.OPENAI_API_KEY,model:process.env.OPENAI_IMAGE_MODEL||'gpt-image-2'};}
async function generateImage(prompt,options={}){
 if(typeof prompt!=='string'||prompt.trim().length<8||prompt.length>1600)throw Error('Prompt must contain 8-1600 characters.');
 const key=options.apiKey??process.env.OPENAI_API_KEY;if(!key)throw Error('Set OPENAI_API_KEY before starting the app, or choose Offline concept.');
 const model=options.model??process.env.OPENAI_IMAGE_MODEL??'gpt-image-2';
 const response=await (options.fetchImpl??fetch)('https://api.openai.com/v1/images/generations',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,prompt:`Create one isolated voxel game rock reference object: ${prompt.trim()}. Orthographic three-quarter view, neutral studio lighting, plain charcoal background, entire object visible, detailed geometric fractures and mineral surface texture. No text, no labels, no scenery, no detached debris.`,size:'1024x1024',quality:'medium',output_format:'png',n:1}),signal:AbortSignal.timeout(180000)});
 if(!response.ok)throw Error(`Image generation failed (HTTP ${response.status}). Check API access and try again.`);
 const data=await response.json(),image=data.data?.[0]?.b64_json;if(typeof image!=='string'||image.length>30_000_000)throw Error('Image service returned no valid image.');
 return {image:`data:image/png;base64,${image}`,provenance:{kind:'AI-generated 2D image',model,prompt:prompt.trim(),createdAt:new Date().toISOString()}};
}
module.exports={capabilities,generateImage};
