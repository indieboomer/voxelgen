import {_electron as electron,expect} from '@playwright/test';
import {resolve} from 'node:path';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const exe=resolve('release/Voxel Generator Workshop-win32-x64/VoxelGeneratorWorkshop.exe');
const app=await electron.launch({executablePath:exe,args:['--qa']});
try{
 const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.waitForSelector('#variant-selector button');
 assert.equal(await page.evaluate(()=>window.workshop.desktop),true);assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
 await page.locator('[data-model="2"]').click();await expect(page.locator('#selected-summary')).toContainText('model 3 / seed 44');
 await page.selectOption('#resolution','32');
 const rust=resolve('.test-artifacts/native-selected.rs');await app.evaluate(({dialog},path)=>{dialog.showSaveDialog=async()=>({filePath:path,canceled:false});},rust);await page.click('#rust');await expect.poll(()=>existsSync(rust)).toBe(true);const source=readFileSync(rust,'utf8');assert(source.includes('SELECTED_SEED: u32 = 44'));assert(source.includes('SELECTED_RESOLUTION: usize = 32'));
 const build=spawnSync('rustc',['--edition=2021','-O','--crate-name','native_selected',rust,'-o','.test-artifacts/native-selected.exe'],{encoding:'utf8'});assert.equal(build.status,0,build.stderr);const run=spawnSync('.test-artifacts/native-selected.exe',[],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert(JSON.parse(run.stdout).vertices>0);
 await page.fill('#prompt','A broad flat layered shale rock with rusty mineral seams');await page.click('#generate-concept');await expect(page.locator('#build-reference')).toBeEnabled();await expect(page.locator('#prompt-image')).toBeVisible();await page.click('#build-reference');await expect(page.locator('#family')).toHaveValue('layered');await expect(page.locator('#refs')).toContainText('Prompt study 1');
 await page.click('#optimize-prompt');await expect(page.locator('#status')).toContainText('Search complete',{timeout:120000});
 const reference=resolve('.test-artifacts/native-prompt-reference.json');await app.evaluate(({dialog},path)=>{dialog.showSaveDialog=async()=>({filePath:path,canceled:false});},reference);await page.click('#export-ref');await expect.poll(()=>existsSync(reference)).toBe(true);assert(JSON.parse(readFileSync(reference,'utf8')).provenance.includes('Prompt: A broad flat'));
 await page.locator('.art-heading a').click();await expect(page.locator('dialog')).toBeVisible();await page.locator('dialog button').click();
 await page.screenshot({path:'.test-artifacts/desktop-v4.png',fullPage:true});assert.deepEqual(errors,[]);
 writeFileSync('reports/desktop-v4/desktop-check.json',JSON.stringify({packagedExecutable:exe,selectedModel:3,selectedSeed:44,selectedResolution:32,rustDefaultCompiled:true,offlinePromptPipeline:true,promptTargetsExported:true,workerSearchCompleted:true,isolatedRenderer:true,errors},null,2));console.log('PASS: packaged Windows app, native save dialog bridge, selected Rust defaults, offline prompt -> 2D -> 3D proxy -> worker optimization, artwork dialog.');
}finally{await app.close();}
