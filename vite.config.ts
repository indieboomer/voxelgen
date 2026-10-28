import {defineConfig} from 'vite';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
delete require.cache[require.resolve('./desktop/image-service.cjs')];
const {capabilities,configure,generateImage}=require('./desktop/image-service.cjs');
let imageController:AbortController|undefined;
export default defineConfig({plugins:[{name:'local-reference-api',configureServer(server){server.middlewares.use('/api/',async(req,res)=>{res.setHeader('Content-Type','application/json');try{
 if(req.method==='GET'&&req.url==='/capabilities'){res.end(JSON.stringify(capabilities()));return;}
 if(req.method==='POST'&&['/image','/settings','/cancel-image'].includes(req.url||'')){
 const origin=req.headers.origin;if(origin&&origin!==`http://${req.headers.host}`){res.statusCode=403;res.end('{}');return;}
 let text='';for await(const chunk of req){text+=chunk;if(text.length>4096)throw Error('Request too large');}
 if(req.url==='/settings'){res.end(JSON.stringify({...configure(JSON.parse(text)),storage:'server session'}));return;}if(req.url==='/cancel-image'){imageController?.abort();res.end('{}');return;}if(imageController)throw Error('An image request is already running.');imageController=new AbortController();try{res.end(JSON.stringify(await generateImage(JSON.parse(text).prompt,{signal:imageController.signal})));}finally{imageController=undefined;}return;
 }res.statusCode=404;res.end('{}');
 }catch(error){res.statusCode=400;res.end(JSON.stringify({error:error instanceof Error?error.message:'Generation failed'}));}});}}]});
