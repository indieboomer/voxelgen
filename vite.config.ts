import {defineConfig} from 'vite';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {capabilities,generateImage}=require('./desktop/image-service.cjs');
export default defineConfig({plugins:[{name:'local-reference-api',configureServer(server){server.middlewares.use('/api/',async(req,res)=>{res.setHeader('Content-Type','application/json');try{
 if(req.method==='GET'&&req.url==='/capabilities'){res.end(JSON.stringify(capabilities()));return;}
 if(req.method==='POST'&&req.url==='/image'){
 const origin=req.headers.origin;if(origin&&origin!==`http://${req.headers.host}`){res.statusCode=403;res.end('{}');return;}
 let text='';for await(const chunk of req){text+=chunk;if(text.length>4096)throw Error('Request too large');}
 res.end(JSON.stringify(await generateImage(JSON.parse(text).prompt)));return;
 }res.statusCode=404;res.end('{}');
 }catch(error){res.statusCode=400;res.end(JSON.stringify({error:error instanceof Error?error.message:'Generation failed'}));}});}}]});
