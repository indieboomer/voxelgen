import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {generateRock,stoneTexture} from '../src/runtime/index.js';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const hash=(bytes:Uint8Array)=>{let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return h>>>0;};
await page.goto('http://127.0.0.1:5173');await page.waitForSelector('#reference-viewer canvas');
assert(await page.evaluate(()=>{const art=document.querySelector('.art-study')!,ref=document.querySelector('#reference-study')!,output=document.querySelector('#viewer')!;return !!(art.compareDocumentPosition(ref)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(ref.compareDocumentPosition(output)&Node.DOCUMENT_POSITION_FOLLOWING);}));
const glbs=[];
async function download(button:string,path:string){const [d]=await Promise.all([page.waitForEvent('download'),page.click(button)]);await d.saveAs(path);}
async function checkGlb(path:string){const bytes=Array.from(readFileSync(path));return page.evaluate(async(bytes)=>{
 const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');const gltf=await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer,'');let meshes=0,uvs=0,textures=0,roughnessMaps=0,width=0;gltf.scene.traverse((o:any)=>{if(o.isMesh){meshes++;uvs+=o.geometry.attributes.uv?.count??0;if(o.material.map){textures++;width=o.material.map.image.width;}if(o.material.roughnessMap)roughnessMaps++;}});return {meshes,uvs,textures,roughnessMaps,width};
},bytes);}
for(const family of ['boulder','layered','shard']){
 await page.selectOption('#family',family);await page.locator('[data-concept="1"]').click();await page.click('#focus-ref');await page.screenshot({path:`.test-artifacts/v3-${family}.png`,fullPage:true});
 const refPath=`.test-artifacts/v3-ref-${family}.glb`;await download('#export-ref-glb',refPath);const ref=await checkGlb(refPath);assert(ref.textures===1&&ref.uvs>0&&ref.width===128);
 const modelPath=`.test-artifacts/v3-${family}.glb`;await download('#glb',modelPath);const model=await checkGlb(modelPath);assert(model.textures===1&&model.roughnessMaps===1&&model.uvs>0&&model.width===128);glbs.push({family,ref,model});await page.click('#focus-ref');
}
await download('#texture','.test-artifacts/stone-texture.png');const png=readFileSync('.test-artifacts/stone-texture.png');assert.equal(png.readUInt32BE(16),128);assert.equal(png.readUInt32BE(20),128);
const decoded=await page.evaluate(async url=>{const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);return Array.from(ctx.getImageData(0,0,c.width,c.height).data);},'data:image/png;base64,'+png.toString('base64'));assert.equal(hash(new Uint8Array(decoded)),hash(stoneTexture('shard',42).pixels));
await page.selectOption('#material','solid');await download('#glb','.test-artifacts/v3-solid.glb');const solid=await checkGlb('.test-artifacts/v3-solid.glb');assert.equal(solid.textures,0);await page.selectOption('#material','textured');
await page.selectOption('#family','boulder');await page.click('#start');await page.waitForFunction(()=>document.querySelector('#status')!.textContent!.includes('candidates'));await page.click('#stop');await page.waitForFunction(()=>document.querySelector('#status')!.textContent==='Search stopped');
await page.click('#start');await page.waitForFunction(()=>document.querySelector('#status')!.textContent!.includes('Search complete'),undefined,{timeout:120000});
await download('#recipe','.test-artifacts/selected-v3.json');await download('#rust','.test-artifacts/selected-v3.rs');
const build=spawnSync('rustc',['--edition=2021','-O','--crate-name','selected_v3','.test-artifacts/selected-v3.rs','-o','.test-artifacts/selected-v3.exe'],{encoding:'utf8'});assert.equal(build.status,0,build.stderr);
const recipe=JSON.parse(readFileSync('.test-artifacts/selected-v3.json','utf8'));assert.equal(recipe.version,2);const expected=generateRock({recipe,seed:2027,resolution:32});const run=spawnSync('.test-artifacts/selected-v3.exe',['2027','32'],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);const actual=JSON.parse(run.stdout);assert.equal(actual.cellsHash,hash(expected.voxels.cells));assert.equal(actual.textureHash,hash(expected.texture.pixels));
await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.test-artifacts/v3-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
writeFileSync('reports/geometry-v3/browser.json',JSON.stringify({orderedViews:true,glbs,texturePngMatchesRuntime:true,solidMode:true,downloadedRustCompiledAndMatched:true,searchStopAndCompletion:true,mobileNoOverflow:true,errors},null,2));await browser.close();console.log('PASS: ordered 2D/3D-reference/generated views; six textured GLB round trips; texture PNG; solid toggle; browser-exported Rust compilation/parity; search controls; mobile.');
