import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:5173');
await page.waitForFunction(()=>document.querySelectorAll('#refs img').length===5);await page.click('#focus-ref');
const exports=[];
for(const family of ['boulder','layered','shard']){
 await page.selectOption('#family',family);await page.locator('[data-concept="1"]').click();assert(await page.locator('[data-ref="1"]').evaluate(e=>e.classList.contains('active')));
 assert.equal(await page.locator('#refs img').evaluateAll(imgs=>imgs.filter(i=>i.complete&&i.naturalWidth>0).length),5);
 await page.waitForFunction(()=>document.querySelector('#concepts span').style.backgroundImage.includes('rock-reference-board-v2'));
 const [download]=await Promise.all([page.waitForEvent('download'),page.click('#export-ref-glb')]);const path=`.test-artifacts/reference-${family}.glb`;await download.saveAs(path);
 const imported=await page.evaluate(async bytes=>{const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');const gltf=await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer,'');let vertices=0;gltf.scene.traverse(o=>{if(o.isMesh)vertices+=o.geometry.attributes.position.count;});return vertices;},Array.from(readFileSync(path)));assert(imported>0);exports.push({family,vertices:imported});
 await page.screenshot({path:`.test-artifacts/reference-${family}.png`,fullPage:true});
}
await page.click('#focus-ref');await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.test-artifacts/reference-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
writeFileSync('reports/reference-v2/browser.json',JSON.stringify({errors,conceptSelection:true,referenceFocus:true,thumbnailCount:15,referenceGlbImports:exports,mobileOverflow:false},null,2));await browser.close();console.log('PASS: concept selection, focus view, 15 thumbnails, three reference GLB imports, mobile layout.');
